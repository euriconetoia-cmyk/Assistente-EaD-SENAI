'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const context = vm.createContext({ globalThis: null, MAT: {} });
context.globalThis = context;
vm.runInContext(read('content/journey.js'), context);
const queue = context.MAT.journey.buildQueue;
const snapshot = (tasks = []) => ({
  meta: { collectedAt: '2026-09-16T12:00:00Z' },
  activityPanorama: { assignments: [{ cmid: 25, name: 'SAP 01', url: 'https://ead.senai.br/mod/assign/view.php?id=25', daysUntilDue: 1, metrics: { pendingKnown: true, pending: 1 } }] },
  tasks
});

test('conferência pós-lote pendente precede fechamento e correções', () => {
  const tasks = [
    { id: 'grading_25', type: 'correcao', priority: 'imediato', title: 'Corrigir SAP 01', assignmentId: 25 },
    { id: 'closing_uc', type: 'fechamento', priority: 'imediato', title: 'Fechar UC' },
    { id: 'student_1', type: 'aluno', priority: 'imediato', title: 'Acompanhar aluno', studentKey: 'id:1' }
  ];
  const actions = [{ id: 'verification_1', type: 'conferencia_atividade', assignmentId: '25', activityName: 'SAP 01', outcome: 'nao_verificado', createdAt: '2026-09-16T13:00:00Z' }];
  assert.deepEqual(Array.from(queue(snapshot(tasks), actions), (item) => item.type), ['conferencia_lote', 'fechamento', 'correcao', 'aluno']);
  assert.match(queue(snapshot(tasks), actions)[0].description, /não confirmado/i);
});

test('nova conferência positiva substitui pendência anterior da mesma atividade', () => {
  const actions = [
    { id: 'old', type: 'conferencia_atividade', assignmentId: '25', outcome: 'divergente', createdAt: '2026-09-16T13:00:00Z' },
    { id: 'new', type: 'conferencia_atividade', assignmentId: '25', outcome: 'sucesso', createdAt: '2026-09-16T14:00:00Z' }
  ];
  assert.equal(queue(snapshot(), actions).length, 0);
  actions[1].outcome = 'nao_verificado';
  assert.equal(queue(snapshot(), actions).length, 1);
  actions[1].status = 'conferida_manualmente';
  assert.equal(queue(snapshot(), actions).length, 0);
});

test('sem retrato não cria tarefas; prazo ausente não vence prazo confirmado', () => {
  assert.equal(queue(null, []).length, 0);
  const tasks = [
    { id: 'grading_30', type: 'correcao', priority: 'alto', title: 'Outra atividade', assignmentId: 30 },
    { id: 'grading_25', type: 'correcao', priority: 'alto', title: 'SAP 01', assignmentId: 25 }
  ];
  assert.deepEqual(Array.from(queue(snapshot(tasks), []), (item) => item.id), ['grading_25', 'grading_30']);
});

test('fechamento sem pendência confirmada não passa à frente de correção', () => {
  const clean = snapshot([
    { id: 'closing_uc', type: 'fechamento', priority: 'imediato', title: 'Fechar UC' },
    { id: 'grading_25', type: 'correcao', priority: 'alto', title: 'Corrigir SAP', assignmentId: 25 }
  ]);
  clean.activityPanorama.assignments[0].metrics.pending = 0;
  assert.deepEqual(Array.from(queue(clean), (item) => item.type), ['correcao', 'fechamento']);
  assert.equal(queue(clean)[1].priority, 'regular');
});

test('jornada usa as entradas atuais e não altera a rotina de envio', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const script = manifest.content_scripts[0].js;
  assert.ok(script.indexOf('content/rules.js') < script.indexOf('content/journey.js'));
  assert.ok(script.indexOf('content/journey.js') < script.indexOf('content/ui.js'));
  const ui = read('content/ui.js');
  assert.match(ui, /Minha jornada/);
  assert.match(ui, /data-action="journey-open-task"/);
  assert.match(ui, /conferência manual da nota e do feedback declarada pelo tutor/i);
  assert.match(read('content/batch-grading.js'), /type: 'conferencia_atividade'/);
});
