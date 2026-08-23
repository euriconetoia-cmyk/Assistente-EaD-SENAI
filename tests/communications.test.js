'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const MAT = {
  state: {},
  utils: { cleanText: (value) => String(value || '').replace(/\s+/g, ' ').trim() }
};
const context = vm.createContext({ MAT, globalThis: null });
context.globalThis = context;
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'communications.js'), 'utf8'), context);

test('mensagem automática cita aluno, UC e nomes das atividades pendentes', () => {
  const message = MAT.communications.buildStudentPendingMessage({
    name: 'Ana Souza',
    missingAssignments: 2,
    lastAccessDays: 2,
    gradeTotal: 72,
    assignments: [
      { name: 'Atividade 1', missing: true },
      { name: 'Atividade 2', missing: true }
    ]
  }, {
    course: { name: 'Curso Técnico' },
    settings: { activeUcName: 'UC Lógica', noAccessAttentionDays: 7, minimumGrade: 60 }
  });
  assert.match(message, /Olá, Ana/);
  assert.match(message, /Curso Técnico/);
  assert.match(message, /UC Lógica/);
  assert.match(message, /Atividade 1, Atividade 2/);
  assert.match(message, /situação/);
});

test('mensagem usa a contagem quando os nomes das atividades não estão disponíveis', () => {
  const message = MAT.communications.buildStudentPendingMessage({
    name: 'Bruno', missingAssignments: 3, assignments: [], gradeTotal: null, lastAccessDays: null
  }, { course: { name: 'Curso' }, settings: {} });
  assert.match(message, /3 atividades ainda estão sem entrega/);
});
