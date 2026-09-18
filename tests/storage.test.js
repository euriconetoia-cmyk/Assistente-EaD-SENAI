'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const values = {};
const local = {
  get(keys, callback) {
    if (keys === null) return callback({ ...values });
    const list = Array.isArray(keys) ? keys : [keys];
    callback(Object.fromEntries(list.filter((key) => key in values).map((key) => [key, values[key]])));
  },
  set(items, callback) { Object.assign(values, items); callback(); },
  remove(keys, callback) { (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]); callback(); },
  getBytesInUse(_keys, callback) { callback(JSON.stringify(values).length); }
};
const MAT = { state: { course: { id: 7 }, settings: null } };
const context = vm.createContext({ MAT, chrome: { storage: { local }, runtime: { lastError: null } }, location: { hostname: 'ead.senai.br' } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'storage.js'), 'utf8'), context);

test('configurações inseguras são normalizadas para limites conservadores', () => {
  const settings = MAT.storage.normalizeSettings({ maxAssignments: 9999, retentionDays: 1, theme: 'desconhecido' });
  assert.equal(settings.maxAssignments, 200);
  assert.equal(settings.retentionDays, 7);
  assert.equal(settings.theme, 'system');
  assert.equal(settings.showFloatingButton, true);
  assert.equal(settings.autoOpenPanel, false);
  assert.equal(settings.enableAutomaticCourseScan, true);
  assert.equal(settings.enableAutomaticCategoryScan, true);
  assert.equal(settings.storeMessageContent, true);
  assert.equal(settings.forcePortuguese, true);
});

test('preferências já salvas prevalecem sobre os novos padrões', async () => {
  const previous = await MAT.storage.saveSettings({
    enableAutomaticCourseScan: false,
    enableAutomaticCategoryScan: false,
    storeMessageContent: false,
    forcePortuguese: false,
  });
  assert.equal(previous.enableAutomaticCourseScan, false);
  assert.equal(previous.enableAutomaticCategoryScan, false);
  assert.equal(previous.storeMessageContent, false);
  assert.equal(previous.forcePortuguese, false);
  const recovered = await MAT.storage.loadSettings();
  assert.equal(recovered.enableAutomaticCourseScan, false);
  assert.equal(recovered.storeMessageContent, false);
});

test('snapshot não duplica o livro de notas no armazenamento', async () => {
  await MAT.storage.saveSnapshot({ course: { id: 7 }, gradebook: { students: [1] }, meta: { collectedAt: new Date().toISOString() } }, 7);
  const snapshot = Object.values(values).find((value) => value?.course?.id === 7);
  assert.ok(snapshot);
  assert.equal('gradebook' in snapshot, false);
});

test('texto de comunicação é armazenado localmente no novo padrão', async () => {
  MAT.state.settings = MAT.storage.normalizeSettings({});
  await MAT.storage.addAction({ type: 'comunicacao', note: 'Mensagem preparada para envio' }, 701);
  const actions = await MAT.storage.loadActions(701);
  assert.equal(actions[0].note, 'Mensagem preparada para envio');
});

test('texto de comunicação não é persistido quando o usuário desativa a opção', async () => {
  MAT.state.settings = MAT.storage.normalizeSettings({ storeMessageContent: false });
  await MAT.storage.addAction({ type: 'comunicacao', note: 'Dado pessoal sensível' }, 7);
  const actions = await MAT.storage.loadActions(7);
  assert.equal(actions.at(-1).note, 'Mensagem preparada. Conteúdo não armazenado.');
});

test('rascunho do Moodle pode ser recuperado mesmo quando a rota usa id de conversa', async () => {
  const saved = await MAT.storage.saveMoodleMessageDraft({
    host: 'ead.senai.br',
    studentId: 42,
    studentName: 'Ana Souza',
    message: 'Mensagem automática'
  }, 7);
  MAT.state.course = null;
  const recovered = await MAT.storage.loadMoodleMessageDraft(null);
  assert.equal(recovered.message, 'Mensagem automática');
  assert.equal(recovered.studentId, 42);
  await MAT.storage.clearMoodleMessageDraft(saved);
  assert.equal(await MAT.storage.loadMoodleMessageDraft(null), null);
  MAT.state.course = { id: 7 };
});
