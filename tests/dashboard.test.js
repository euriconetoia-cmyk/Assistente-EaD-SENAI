'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', 'dashboard');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'dashboard.css'), 'utf8');

test('Central de Gestão oferece as dez áreas planejadas', () => {
  for (const view of ['overview','courses','risk','performance','tutors','calendar','queue','environments','history','reports']) {
    assert.match(html, new RegExp(`data-view="${view}"`));
  }
  assert.match(html, /Central de Gestão Moodle/);
});

test('filtros globais e relatórios atuam sobre o conjunto visível', () => {
  for (const id of ['filter-environment','filter-vigency','filter-status','filter-search']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(js, /function applyFilters/);
  assert.match(js, /dashboard_turmas_/);
  assert.match(js, /calendario_futuras_turmas\.csv/);
  assert.match(js, /fila_de_trabalho\.csv/);
  assert.match(js, /window\.print\(\)/);
  assert.match(js, /central_gestao_moodle\.json/);
});

test('dashboard diferencia ausência de fonte de valores iguais a zero', () => {
  assert.match(js, /Não coletad[oa]/);
  assert.match(js, /Proteção de dados por padrão/);
  assert.match(js, /não persiste nomes de estudantes/i);
  assert.doesNotMatch(js, /Alunos nominais',0/);
});

test('histórico é limitado e tema escuro é acessível', () => {
  assert.match(js, /slice\(0,24\)/);
  assert.match(js, /mat_executive_dashboard_history_v1/);
  assert.match(css, /data-theme="dark"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Ir para o conteúdo/);
});

test('indicadores parciais mantêm pendências como mínimo e links limitados aos Moodles autorizados', () => {
  const source = js.slice(0, js.lastIndexOf('initialize().catch'));
  const context = vm.createContext({ URL });
  vm.runInContext(`${source}\nglobalThis.review = { state, overview, courseTable, allowedMoodleUrl, calendar, queue, localDataStatus };`, context);
  const { state, overview, courseTable, allowedMoodleUrl, calendar, queue, localDataStatus } = context.review;
  const course = { groupName: 'Turma 1', name: 'UC', courseId: 10, environment: 'ead.senai.br', url: 'javascript:alert(1)', totalPending: 0, unverified: 2, vigency: 'future', startsAt: '2026-10-01T00:00:00Z' };
  state.payload = { inventoryPartial: true };
  state.filtered = [course];
  assert.match(overview(), /Pendências confirmadas/);
  assert.match(overview(), /≥0/);
  assert.doesNotMatch(courseTable(), /href="javascript:/);
  assert.equal(allowedMoodleUrl('https://evil.example/my/'), null);
  assert.equal(allowedMoodleUrl('https://ead.senai.br/course/view.php?id=10'), 'https://ead.senai.br/course/view.php?id=10');
  assert.doesNotMatch(calendar(), /href="javascript:/);
  state.filtered = [{ ...course, totalPending: null, unverified: 0 }];
  assert.match(queue(), /Não coletada/);
  const now = Date.parse('2026-09-18T12:00:00Z');
  assert.match(localDataStatus({ generatedAt: null }, now), /sem coleta/);
  assert.match(localDataStatus({ generatedAt: '2026-09-16T00:00:00Z', inventoryPartial: false }, now), /atualizar leitura/);
  assert.match(localDataStatus({ generatedAt: '2026-09-18T10:00:00Z', inventoryPartial: true }, now), /leitura parcial/);
});

test('a Central anuncia somente o resumo dos filtros e preserva o menu com rótulos', () => {
  assert.match(html, /id="filter-summary"[^>]+aria-live="polite"/);
  assert.doesNotMatch(html, /id="view-root"[^>]+aria-live/);
  assert.match(html, /data-nav="expanded"/);
  assert.match(html, /Abrir Moodle para atualizar/);
  assert.doesNotMatch(html, /Moodle conectado/);
  assert.match(js, /querySelector\('#view-root \.view-head h2'\)\?\.focus/);
});
