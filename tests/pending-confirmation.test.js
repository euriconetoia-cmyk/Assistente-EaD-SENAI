'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'importer', 'contextual-importer.js'), 'utf8');
const start = source.indexOf('  async function confirmNoPendingInGradingPages(');
const end = source.indexOf('  async function fetchPendingEvaluationCount(', start);
assert.ok(start >= 0 && end > start);
const sharedContext = vm.createContext({ Blob });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'shared-validation.js'), 'utf8'), sharedContext);

function makeVerifier(pages) {
  const context = vm.createContext({
    URL,
    window: { location: { href: 'https://ead.senai.br/course/view.php?id=11225' } },
    S: sharedContext.MAT_SHARED,
    fetchHtmlDocument: async (url) => ({ doc: pages[Number(new URL(url).searchParams.get('page'))] || { rows: [], lastPage: 0 } }),
    getMoodleRows: (doc) => doc.rows,
    paginationPages: (doc) => doc.lastPage,
  });
  return vm.runInContext(`${source.slice(start, end)}\nconfirmNoPendingInGradingPages`, context);
}

const assignment = { name: 'Envio da SAP 01', link: { href: 'https://ead.senai.br/mod/assign/view.php?id=335663' } };
const student = (id, status, grade = '', submitted = true) => ({
  userId: String(id), normalizedName: `aluno ${id}`, hasSubmission: submitted,
  statusCell: { textContent: status }, gradeInput: { value: grade }, feedbackTextarea: { value: '' },
});

test('zero confirmado recebe check somente após ler todas as páginas de alunos', async () => {
  const verify = makeVerifier([
    { rows: [student(1, 'Avaliado', '45')], lastPage: 1 },
    { rows: [student(2, 'Nenhum envio', '', false)], lastPage: 1 },
  ]);
  assert.equal(await verify(assignment), true);
});

test('entrega sem correção, tabela ausente e paginação incompleta mantêm aviso', async () => {
  assert.equal(await makeVerifier([{ rows: [student(1, 'Enviado para avaliação')], lastPage: 0 }])(assignment), false);
  assert.equal(await makeVerifier([{ rows: [], lastPage: 0 }])(assignment), false);
  assert.equal(await makeVerifier([{ rows: [student(1, 'Avaliado', '45')], lastPage: 2 }])(assignment, 1), false);
  assert.equal(await makeVerifier([
    { rows: [student(1, 'Avaliado', '45')], lastPage: 1 },
    { rows: [student(1, 'Avaliado', '45')], lastPage: 1 },
  ])(assignment), false);
});
