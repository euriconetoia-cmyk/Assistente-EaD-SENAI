'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
