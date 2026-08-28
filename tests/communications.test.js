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

test('envio pelo Moodle preserva a mensagem editada pelo tutor', async () => {
  const savedDrafts = [];
  const actions = [];
  MAT.state = { course: { id: 18, name: 'Curso' }, snapshot: { students: [{ key: 'ana', id: 42, name: 'Ana Souza' }] } };
  MAT.storage = { saveMoodleMessageDraft: async (draft) => savedDrafts.push(draft), addAction: async (action) => actions.push(action), loadActions: async () => actions };
  context.location = { hostname: 'ead.fieg.com.br', origin: 'https://ead.fieg.com.br' };
  const opened = [];
  await MAT.communications.openMoodleMessageForStudent('ana', { message: 'Texto ajustado pelo tutor.\nSegunda linha.', openUrl: (url) => opened.push(url) });
  assert.equal(savedDrafts[0].message, 'Texto ajustado pelo tutor.\nSegunda linha.');
  assert.equal(actions[0].note, 'Texto ajustado pelo tutor.\nSegunda linha.');
  assert.equal(opened[0], 'https://ead.fieg.com.br/message/index.php?id=42');
});
