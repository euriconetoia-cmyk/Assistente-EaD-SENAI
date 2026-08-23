'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = vm.createContext({ Blob });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'shared-validation.js'), 'utf8'), context);
const S = context.MAT_SHARED;

test('parser preserva delimitadores e quebras entre aspas', () => {
  const rows = S.parseDelimitedText('nome;feedback\nAna;"Linha 1; ainda\nLinha 2"');
  assert.equal(rows.length, 2);
  assert.equal(rows[1][1], 'Linha 1; ainda\nLinha 2');
});

test('notas negativas e não numéricas são bloqueadas', () => {
  assert.equal(S.parseGrade('-1').valid, false);
  assert.equal(S.parseGrade('abc').valid, false);
  assert.equal(S.parseGrade('7,5').number, 7.5);
});

test('duplicidade por atividade e estudante gera bloqueio', () => {
  const result = S.parseBatchCsv('cmid;nome;nota\n10;Ana;8\n10;Ana;9');
  assert.equal(result.records.length, 1);
  assert.match(result.errors[0], /duplicado/);
});

test('atividade só é associada automaticamente por CMID ou nome exato', () => {
  const assignments = [{ cmid: 10, name: 'Situação de Aprendizagem 1' }];
  assert.equal(S.matchActivity({ atividadeId: '10' }, assignments).status, 'exact');
  assert.equal(S.matchActivity({ atividade: 'Situação de Aprendizagem 1' }, assignments).status, 'exact');
  const approximate = S.matchActivity({ atividade: 'Situação Aprendizagem' }, assignments);
  assert.notEqual(approximate.status, 'exact');
  assert.equal(approximate.assignment, null);
});

test('exportação neutraliza fórmulas de planilha', () => {
  for (const value of ['=1+1', '+cmd', '-2+3', '@SUM(A1)']) assert.ok(S.neutralizeSpreadsheetFormula(value).startsWith("'"));
  assert.equal(S.neutralizeSpreadsheetFormula('Texto'), 'Texto');
});

test('participante sem envio não é contado como correção pendente', () => {
  assert.equal(S.isPendingSubmission({ status: '', fileCount: 0, hasGrade: false, hasFeedback: false }), false);
  assert.equal(S.isPendingSubmission({ status: 'Nenhum envio', fileCount: 0 }), false);
  assert.equal(S.isPendingSubmission({ status: 'Enviado para avaliação', fileCount: 0 }), true);
  assert.equal(S.isPendingSubmission({ status: '', fileCount: 1 }), true);
  assert.equal(S.isPendingSubmission({ status: 'Avaliado', fileCount: 1 }), false);
});

test('CSV individual pode ser validado sem coluna de atividade quando o contexto será confirmado', () => {
  assert.throws(() => S.parseBatchCsv('nome;nota;feedback\nAna;8;Bom trabalho'), /cmid ou atividade/);
  const parsed = S.parseBatchCsv('nome;nota;feedback\nAna;8;Bom trabalho', { allowMissingActivity: true });
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].nome, 'Ana');
  assert.equal(parsed.records[0].atividadeId, '');
});

test('atividade pode ser identificada com segurança pelo nome completo ou CMID do arquivo', () => {
  const assignments = [
    { cmid: 101, name: 'Envio Atividade Raciocínio Lógico' },
    { cmid: 102, name: 'Redação Empresarial' }
  ];
  assert.equal(S.matchActivityFromFileName('101_correcao.csv', assignments).assignment.cmid, 101);
  assert.equal(S.matchActivityFromFileName('resultado_Envio Atividade Raciocínio Lógico_sem_nota.csv', assignments).assignment.cmid, 101);
  assert.equal(S.matchActivityFromFileName('raciocinio_logico.csv', assignments).status, 'unmatched');
});

test('conferência considera equivalentes notas e feedbacks normalizados pelo Moodle', () => {
  assert.equal(S.gradesEquivalent('50', '50,00000'), true);
  const result = S.compareSavedFields(
    { expectedGrade: '8,5', expectedFeedback: 'Bom trabalho\nContinue assim.' },
    { hasGradeField: true, actualGrade: '8.50000', hasFeedbackField: true, actualFeedback: 'Bom  trabalho\r\nContinue assim.' }
  );
  assert.equal(result.status, 'confirmed');
  assert.equal(result.grade.status, 'confirmed');
  assert.equal(result.feedback.status, 'confirmed');
});

test('conferência distingue divergência de campo não verificável', () => {
  const divergent = S.compareSavedFields(
    { expectedGrade: '10', expectedFeedback: 'Texto esperado' },
    { hasGradeField: true, actualGrade: '9', hasFeedbackField: true, actualFeedback: 'Outro texto' }
  );
  assert.equal(divergent.status, 'divergent');
  const unavailable = S.compareSavedFields(
    { expectedGrade: '10', expectedFeedback: null },
    { hasGradeField: false, actualGrade: '', hasFeedbackField: false, actualFeedback: '' }
  );
  assert.equal(unavailable.status, 'not_verifiable');
});
