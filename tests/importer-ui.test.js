'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'importer', 'contextual-importer.js'), 'utf8');
const batchSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'batch-grading.js'), 'utf8');
const adaptersSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'adapters.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'ui.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'main.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'content', 'importer', 'contextual-importer.css'), 'utf8');
const appStyles = fs.readFileSync(path.join(__dirname, '..', 'content', 'styles.css'), 'utf8');

test('resumo do curso mantém indicadores e importação, sem download duplicado', () => {
  const importer = source.indexOf('mqi-course-pending-summary__import');
  const refresh = source.indexOf('mqi-course-pending-summary__refresh');
  assert.ok(importer >= 0 && refresh > importer);
  assert.doesNotMatch(source, /mqi-course-pending-summary__download|downloadCoursePendingFiles|atividades_pendentes_curso_/);
  assert.match(batchSource, /downloadAllForCorrection/);
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
  assert.match(batchSource, /<th>Nota<\/th>/);
  assert.match(batchSource, /<th>Feedback<\/th>/);
  assert.match(batchSource, /buildPreviewSignature/);
  assert.match(batchSource, /invalidateChangePreview/);
  assert.match(batchSource, /Confira novamente as notas e os feedbacks antes de salvar/);
});

test('etapas do lote distinguem arquivos, associação, conferência, salvamento e verificação', () => {
  const start = batchSource.indexOf('  function updateBatchSteps()');
  const end = batchSource.indexOf('  function confirmedRecordMaxGrade(', start);
  assert.ok(start >= 0 && end > start);
  const steps = Array.from({ length: 5 }, (_, index) => ({ dataset: { step: String(index + 1) }, setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; } }));
  const state = { files: [], running: false, results: [], previewAccepted: false };
  const context = vm.createContext({ STATE: state, $id: () => ({ querySelectorAll: () => steps }), isBatchBlocked: () => state.blocked });
  vm.runInContext(`${batchSource.slice(start, end)}\nglobalThis.step = updateBatchSteps;`, context);
  const current = () => steps.findIndex((item) => item['aria-current'] === 'step') + 1;
  context.step(); assert.equal(current(), 1);
  state.files = [{}]; state.blocked = true; context.step(); assert.equal(current(), 2);
  state.blocked = false; context.step(); assert.equal(current(), 3);
  state.previewAccepted = true; context.step(); assert.equal(current(), 4);
  state.running = true; state.results = [{}]; context.step(); assert.equal(current(), 5);
  assert.match(batchSource, /data-batch-focus="mat-batch-file-map-/);
  assert.match(appStyles, /\.mat-change-preview-table td::before/);
});

test('conferência permite editar nota e feedback antes do salvamento', () => {
  assert.match(batchSource, /data-edit-record/);
  assert.match(batchSource, /data-save-record/);
  assert.match(batchSource, /Editar nota e feedback/);
  assert.match(batchSource, /S\.parseGrade\(grade\)/);
  assert.match(batchSource, /record\.nota = parsedGrade\.number === 0 \? '' : S\.formatGradePtBr\(parsedGrade\.number\)/);
  assert.match(batchSource, /record\.feedback = feedback/);
  assert.match(batchSource, /Edição salva\. Clique em Conferir alterações/);
  assert.match(batchSource, /invalidateChangePreview\(\)/);
});

test('nota pode ser editada diretamente na tabela de conferência', () => {
  assert.match(batchSource, /data-inline-grade=/);
  assert.match(batchSource, /data-save-grade=/);
  assert.match(batchSource, /function confirmedRecordMaxGrade/);
  assert.match(batchSource, /A nota não pode ultrapassar/);
  assert.match(batchSource, /Revise o valor e confirme novamente antes do envio/);
  assert.match(appStyles, /\.mat-inline-grade-editor/);
  assert.match(appStyles, /\.mat-inline-grade-error/);
});

test('conferência mostra nota máxima, origem e estado de confirmação', () => {
  assert.match(batchSource, /<th>Nota máxima<\/th>/);
  assert.match(batchSource, /record\.notaMaxima/);
  assert.match(batchSource, /group\.assignment\.maxGrade/);
  assert.match(batchSource, /Fonte:/);
  assert.match(batchSource, /Não confirmada/);
  assert.match(batchSource, /Requer conferência/);
});

test('quando a escala não é identificada o tutor pode informar a nota máxima manualmente', () => {
  assert.match(batchSource, /Informar nota máxima manualmente/);
  assert.match(batchSource, /data-apply-manual-max-grade/);
  assert.match(batchSource, /function applyManualMaximum/);
  assert.match(batchSource, /informada manualmente pelo tutor/);
  assert.match(batchSource, /confirmada_manual/);
  assert.match(batchSource, /handleBatchPreviewKeydown/);
  assert.match(appStyles, /\.mat-manual-max-grade/);
  assert.match(appStyles, /\.mat-manual-max-grade__control/);
});

test('lote confirma automaticamente a nota máxima no Moodle antes de converter desempenho', () => {
  assert.match(batchSource, /async function resolveAssignmentMaximum/);
  assert.match(batchSource, /async function ensureMaximumsForFiles/);
  assert.match(batchSource, /buildAssignmentViewUrl\(assignment\)/);
  assert.match(batchSource, /buildAssignmentGradingUrl\(assignment\)/);
  assert.match(batchSource, /Promise\.allSettled/);
  assert.match(batchSource, /await ensureMaximumsForFiles\(assignments\)/);
  assert.match(batchSource, /Confirmando a nota máxima de/);
  assert.match(batchSource, /Nota máxima: <strong>/);
  assert.match(batchSource, /aria-busy/);
});

test('resumo da atividade preserva nota máxima e origem quando o Moodle já expõe a escala', () => {
  assert.match(adaptersSource, /input\[max\], input\[aria-valuemax\], \[data-maxgrade\]/);
  assert.match(adaptersSource, /summaryMaxGradeText/);
  assert.match(adaptersSource, /maxGradeSource/);
  assert.match(adaptersSource, /campo de nota do Moodle/);
  assert.match(adaptersSource, /resumo da atividade/);
});

test('lançamento bloqueia somente divergência confirmada entre a nota máxima do CSV e do Moodle', () => {
  assert.match(source, /A nota máxima do CSV/);
  assert.match(source, /difere da atividade no Moodle/);
  assert.doesNotMatch(source, /report\.blocking\.push\('O CSV contém notas, mas não informa uma nota máxima válida/);
  assert.match(source, /A nota máxima não foi informada no CSV nem reconhecida na página/);
  assert.match(source, /report\.warnings\.push\(`A nota máxima do CSV está marcada como/);
});

test('nota máxima aceita formatos reais do Moodle e CSV legado quando a página confirma a escala', () => {
  assert.match(source, /data-maxgrade/);
  assert.match(source, /aria-valuemax/);
  assert.match(source, /O CSV não informa a nota máxima; foi utilizada a escala/);
  assert.match(source, /!declaredMaxGrades\.length && maxGrade === null/);
});

test('categoria mostra quantidades em todas as UCs sem limites silenciosos', () => {
  assert.doesNotMatch(source, /return \[\.\.\.found\.values\(\)\]\.slice\(0, 8\)/);
  assert.doesNotMatch(source, /return \[\.\.\.found\.values\(\)\]\.slice\(0, 20\)/);
  assert.match(source, /badge\.textContent = '✓ 0 pendências'/);
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

test('conferência usa a ficha individual quando a tabela rápida não reaparece', () => {
  assert.match(source, /function individualGraderUrl/);
  assert.match(source, /function verifyOnIndividualGrader/);
  assert.match(source, /action', 'grader'/);
  assert.match(source, /userid', String\(studentId\)/);
  assert.match(source, /assignfeedbackcomments_editor\[text\]/);
  assert.match(source, /verificationSource: 'individual_grader'/);
  assert.match(source, /input\[name="grade"\]:not\(\[type="hidden"\]\)/);
  assert.match(source, /!field\.disabled && String\(field\.name/);
  assert.match(source, /await buildBatchVerification\(verificationPlan/);
});

test('lote descobre alunos em todas as páginas antes de preencher notas', () => {
  assert.match(source, /function discoverBatchRecords/);
  assert.match(source, /function fetchBatchDiscoveryPage/);
  assert.match(source, /function paginationPages/);
  assert.match(source, /transactionState === 'descobrir'/);
  assert.match(source, /status: 'discovered'/);
  assert.match(source, /filter', '-1'/);
  assert.match(batchSource, /Localizando alunos em todas as páginas/);
  assert.match(batchSource, /paginas_consultadas/);
  assert.match(source, /profileLink\?\.closest\('td, \.cell'\)/);
  assert.match(source, /url\.searchParams\.get\('userid'\)/);
});

test('página inicial monta inventário e relatório geral das turmas', () => {
  assert.match(source, /function isMyCoursesPage/);
  assert.match(source, /function buildMyCoursesInventory/);
  assert.match(source, /runWithConcurrency\(MY_COURSES_STATE\.courses, 2/);
  assert.match(source, /Visão geral das turmas/);
  assert.match(source, /id="mqi-my-courses-export"[^>]*>Exportar CSV/);
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

test('nota usa convenção decimal pt-BR quando a página ainda não possui valor de amostra', () => {
  assert.match(source, /document\.documentElement\?\.lang/);
  assert.match(source, /\^pt\(\?:-\|\$\)/);
  assert.match(source, /return ','/);
});

test('envio valida se cada nota está realmente no formulário submetido', () => {
  assert.match(source, /function validateGradeSubmissionPayload/);
  assert.match(source, /new FormData\(form\)/);
  assert.match(source, /field\.disabled/);
  assert.match(source, /form\.contains\(field\)/);
  assert.match(source, /payload\.get\(field\.name\)/);
  assert.match(source, /S\.gradesEquivalent\(expected\.expectedGrade, submittedValue\)/);
  assert.match(source, /Envio bloqueado antes do Moodle/);
});

test('conferência distingue feedback salvo de nota não lançada', () => {
  assert.match(source, /O feedback foi gravado, mas a nota não foi lançada com o valor autorizado/);
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


test('menu lateral usa ícone hamburger e identificação compacta do curso', () => {
  assert.match(uiSource, /menu: '<svg[^']+<path d="M4 7h16"\/><path d="M4 12h16"\/><path d="M4 17h16"\/>/);
  assert.match(uiSource, /id="mat-nav-toggle"[\s\S]{0,300}navIcon\('menu'\)/);
  assert.match(uiSource, /class="mat-course-status" id="mat-last-update"/);
  assert.match(uiSource, /id="mat-header-context"|class="mat-header-context"/);
  assert.match(appStyles, /\.mat-course-name[^}]+white-space: nowrap/);
});

test('curso é atualizado automaticamente ao ficar obsoleto e após alterações', () => {
  assert.match(mainSource, /COURSE_CACHE_MAX_AGE_MS = 15 \* 60 \* 1000/);
  assert.match(mainSource, /AUTO_REFRESH_CHECK_MS = 60 \* 1000/);
  assert.match(mainSource, /const refreshIfStale = async/);
  assert.match(mainSource, /setInterval\(\(\) => refreshIfStale/);
  assert.match(mainSource, /visibilitychange/);
  assert.match(uiSource, /refreshAfterChange\?\.\('alteração da UC'\)/);
  assert.match(batchSource, /refreshAfterChange\?\.\('salvamento das correções'\)/);
});


test('pacote de correção inclui somente alunos pendentes e exclui avaliados', () => {
  assert.match(batchSource, /const pendingRowsForAssignment =/);
  assert.match(batchSource, /row\.requiresGrading \|\| \(row\.submitted && !row\.graded\)/);
  assert.match(batchSource, /envios_pendentes\/manifesto_pendencias\.csv/);
  assert.match(batchSource, /Alunos já avaliados não são incluídos/);
  assert.match(batchSource, /collectPendingSubmissionEntries\(assignment, gradingDoc\)/);
  assert.doesNotMatch(batchSource, /fetchMoodleResource\(buildDownloadAllUrl\(assignment\)[\s\S]{0,180}true\)/);
});

test('pacote pendente bloqueia fallback inseguro quando a análise não identifica os alunos', () => {
  assert.match(batchSource, /não foi possível identificar individualmente quais alunos precisam de correção nem na análise salva nem na tela de avaliação consultada agora/);
  assert.match(batchSource, /extractAssignmentGradingRows\(gradingDoc, assignment\)/);
  assert.match(batchSource, /perpage', '500'/);
  assert.match(batchSource, /AVISO_PENDENCIAS_SEM_ARQUIVO\.txt/);
  assert.match(batchSource, /AVISO_ARQUIVOS_NAO_BAIXADOS\.txt/);
});


test('pacote consulta o Moodle com filtro oficial de requer correção', () => {
  assert.match(batchSource, /url\.searchParams\.set\('status', 'requiregrading'\)/);
  assert.match(batchSource, /url\.searchParams\.set\('perpage', '500'\)/);
  assert.doesNotMatch(batchSource, /url\.searchParams\.set\('status', 'all'\)/);
});
