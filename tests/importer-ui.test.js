'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'importer', 'contextual-importer.js'), 'utf8');
const batchSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'batch-grading.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'content', 'importer', 'contextual-importer.css'), 'utf8');

test('resumo do curso mantém Importar notas ao lado de Baixar atividades', () => {
  const download = source.indexOf('mqi-course-pending-summary__download');
  const importer = source.indexOf('mqi-course-pending-summary__import');
  const refresh = source.indexOf('mqi-course-pending-summary__refresh');
  assert.ok(download >= 0 && importer > download && refresh > importer);
  assert.match(source, /MAT\.batchGrading\.openModal\(\)/);
});

test('importador em lote aceita vários CSVs e solicita associação quando necessário', () => {
  assert.match(batchSource, /id="mat-batch-file"[^>]+multiple/);
  assert.match(batchSource, /handleBatchFiles/);
  assert.match(batchSource, /data-batch-file-index/);
  assert.match(batchSource, /matchActivityFromFileName/);
});

test('importador exige conferência de notas e feedbacks antes de salvar', () => {
  assert.match(batchSource, /id="mat-batch-review-changes"/);
  assert.match(batchSource, /Alterações antes de salvar/);
  assert.match(batchSource, /Nota do CSV/);
  assert.match(batchSource, /Feedback do CSV/);
  assert.match(batchSource, /buildPreviewSignature/);
  assert.match(batchSource, /invalidateChangePreview/);
  assert.match(batchSource, /Confira novamente as notas e os feedbacks antes de salvar/);
});

test('categoria mostra quantidades em todas as UCs sem limites silenciosos', () => {
  assert.doesNotMatch(source, /return \[\.\.\.found\.values\(\)\]\.slice\(0, 8\)/);
  assert.doesNotMatch(source, /return \[\.\.\.found\.values\(\)\]\.slice\(0, 20\)/);
  assert.match(source, /badge\.textContent = '0 pendências'/);
  assert.match(source, /\? 'pendência' : 'pendências'/);
  assert.match(styles, /\.mqi-category-course-has-pending\.dashboard-card/);
  assert.match(styles, /border-color: #dc3545 !important/);
});

test('atualização de pendências ignora cache antigo e consulta todas as atividades', () => {
  assert.match(source, /fetchPendingEvaluationCount\(assignment, \{ force = false \} = \{\}\)/);
  assert.match(source, /const cached = force \? null : readCourseBadgeCache/);
  assert.match(source, /fetchPendingEvaluationCount\(assignment, \{ force \}\)/);
  assert.match(source, /runWithConcurrency\(toFetch, 2/);
  assert.doesNotMatch(source, /runWithConcurrency\(toFetch\.slice\(0, 30\)/);
});

test('categoria identifica UC atual e sobreposições pelo período informado', () => {
  assert.match(source, /per\[ií\]odo/);
  assert.match(source, /function classifyCourseVigency/);
  assert.match(source, /course\.vigency = 'current'/);
  assert.match(source, /Vigente em sobreposição/);
  assert.match(source, /<strong>UC atual:<\/strong>/);
  assert.match(styles, /mqi-category-vigency-badge--current/);
});

test('importação usa todos os alunos e relê notas em campos alternativos', () => {
  assert.match(source, /select\.quickgrade/);
  assert.match(source, /function readGradeFieldValue/);
  assert.match(source, /selectedOptions/);
  assert.match(source, /actualGrade: readGradeFieldValue/);
});

test('página inicial monta inventário e relatório geral das turmas', () => {
  assert.match(source, /function isMyCoursesPage/);
  assert.match(source, /function buildMyCoursesInventory/);
  assert.match(source, /runWithConcurrency\(MY_COURSES_STATE\.courses, 2/);
  assert.match(source, /Visão geral das turmas/);
  assert.match(source, /Gerar relatório geral CSV/);
  assert.match(source, /relatorio_geral_turmas_/);
  assert.match(source, /neutralizeSpreadsheetFormula/);
  assert.match(source, /perpage', '96'/);
  assert.match(source, /function readMyCoursesPagination/);
  assert.match(source, /for \(let page = 0; page < maxPages; page \+= 1\)/);
  assert.match(source, /if \(!pagination\.hasNext \|\| inventory\.size === previousSize\) break/);
  assert.doesNotMatch(source, /perpage', '1000'/);
  assert.match(styles, /\.mqi-my-courses-dashboard/);
});

test('página inicial oferece calendário e dashboard executivo separado', () => {
  assert.match(source, /Mostrar calendário/);
  assert.match(source, /function renderFutureCoursesCalendar/);
  assert.match(source, /function extractCourseAcademicMetrics/);
  assert.match(source, /completionPercentage/);
  assert.match(source, /studentCount/);
  assert.match(source, /classAverage/);
  assert.match(source, /dashboard\/index\.html/);
});

test('salvamento em lote reconhece o rodapé fixo do Moodle 5 e possui fallback pelo formulário', () => {
  assert.match(source, /\[data-region="quick-grading-save"\]/);
  assert.match(source, /input\[name="action"\]\[value="quickgrade"\]/);
  assert.match(source, /form\.requestSubmit/);
  assert.match(source, /method: 'quickgrade-form'/);
  const handler = source.slice(source.indexOf('async function handleBatchTick'));
  assert.ok(handler.indexOf("transactionState === 'enviado'") < handler.indexOf("if (!readiness.isGradingAction)"));
  assert.match(handler, /status: 'redirecting'/);
});

test('resultado do lote diferencia falhas de um processamento integralmente concluído', () => {
  assert.match(batchSource, /Revisar falhas/);
  assert.match(batchSource, /Lote concluído com falhas/);
  assert.match(batchSource, /Conferência de notas e correções/);
  assert.match(batchSource, /Mostrar somente divergências/);
  assert.match(batchSource, /Baixar conferência/);
  assert.match(batchSource, /Atualizar painel do curso/);
  assert.match(batchSource, /dataset\.action === 'review-results'/);
  assert.match(batchSource, /type: 'conferencia_lote'/);
});
