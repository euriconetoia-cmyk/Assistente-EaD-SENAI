'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let runtimeMessageListener;
const sessionValues = {};
const notifications = [];
const transactionStates = [];
const removedTabs = [];
const updatedTabs = [];
const verifiedResult = {
  status: 'verified',
  verification: {
    summary: { total: 1, confirmed: 1, divergent: 0, notFound: 0, notVerifiable: 0 },
    items: [{ nome: 'Ana', status: 'confirmed' }],
  },
};
const defaultBatchTickResponder = (message) => {
  if (message.transactionState === 'enviado') return { status: 'saved', outcome: 'success', message: 'Salvo com confirmação.' };
  if (message.transactionState === 'verificar') return verifiedResult;
  return { status: 'submitting', report: { applied: ['Ana'], verificationPlan: [{ nome: 'Ana', expectedGrade: '8' }] } };
};
let batchTickResponder = defaultBatchTickResponder;
const event = (capture) => ({ addListener(listener) { if (capture) capture(listener); }, removeListener() {} });
const chrome = {
  runtime: { id: 'extension-test-id', onInstalled: event(), onMessage: event((listener) => { runtimeMessageListener = listener; }) },
  action: { onClicked: event(), setBadgeBackgroundColor() {} },
  alarms: { onAlarm: event(), create: async () => {}, clear: async () => {} },
  tabs: {
    onUpdated: event(), onRemoved: event(),
    get: async (tabId) => ({ id: tabId, status: 'complete' }),
    create: async () => ({ id: 2, status: 'complete' }),
    update: async (tabId, changes) => {
      updatedTabs.push({ tabId, ...changes });
      return { id: tabId, status: 'complete', url: changes.url };
    },
    remove: async (tabId) => { removedTabs.push(tabId); },
    sendMessage: async (tabId, message) => {
      if (tabId === 1) { notifications.push(message); return {}; }
      if (message.type === 'MAT_IMPORTER_READY') return { ready: true };
      if (message.type === 'MAT_BATCH_TICK') {
        transactionStates.push(message.transactionState);
        return batchTickResponder(message);
      }
      return {};
    }
  },
  storage: { session: {
    get: async (key) => key ? { [key]: sessionValues[key] } : { ...sessionValues },
    set: async (items) => { Object.assign(sessionValues, items); },
    remove: async (key) => { delete sessionValues[key]; }
  } }
};
const fastSetTimeout = (callback) => setTimeout(callback, 0);
const context = vm.createContext({ chrome, URL, setTimeout: fastSetTimeout, clearTimeout, console, __MAT_TEST__: true });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'background', 'service-worker.js'), 'utf8'), context);
const SW = context.__MAT_SW_TEST__;

test('automação aceita somente HTTPS e hosts Moodle autorizados', () => {
  assert.throws(() => SW.validateAutomationUrl('http://ead.senai.br/mod/assign/view.php?id=1'), /não autorizado/);
  assert.throws(() => SW.validateAutomationUrl('https://example.com/mod/assign/view.php?id=1'), /não autorizado/);
  assert.throws(() => SW.validateAutomationUrl('https://ead.senai.br/user/profile.php?id=1'), /somente páginas/);
});

test('URL de avaliação é normalizada com parâmetros seguros', () => {
  const url = new URL(SW.buildAutomationUrl('https://ead.fieg.com.br/mod/assign/view.php?id=12', 12));
  assert.equal(url.searchParams.get('id'), '12');
  assert.equal(url.searchParams.get('action'), 'grading');
  assert.equal(url.searchParams.get('quickgrading'), '1');
  assert.equal(url.searchParams.get('status'), 'all');
  assert.equal(url.searchParams.get('page'), '0');
  assert.equal(url.searchParams.get('perpage'), '500');
  const verificationUrl = new URL(SW.buildVerificationUrl(url.href, 12));
  assert.equal(verificationUrl.searchParams.get('status'), 'all');
  assert.equal(verificationUrl.searchParams.get('page'), '0');
  assert.equal(verificationUrl.searchParams.get('perpage'), '500');
});

test('lote inválido ou excessivo é recusado antes de abrir abas', () => {
  assert.throws(() => SW.validateJobs([]), /não contém/);
  const jobs = Array.from({ length: 31 }, (_, index) => ({ cmid: index + 1, activityName: `A${index}`, gradingUrl: 'https://ead.senai.br/mod/assign/view.php?id=1', records: [{}] }));
  assert.throws(() => SW.validateJobs(jobs), /excede/);
  const invalidGrade = [{ cmid: 1, activityName: 'A', gradingUrl: 'https://ead.senai.br/mod/assign/view.php?id=1', records: [{ nome: 'Ana', nota: '-1' }] }];
  assert.throws(() => SW.validateJobs(invalidGrade), /nota inválida/);
  const duplicate = [{ cmid: 1, activityName: 'A', gradingUrl: 'https://ead.senai.br/mod/assign/view.php?id=1', records: [{ nome: 'Ana', nota: '7' }, { nome: 'Ana', nota: '8' }] }];
  assert.throws(() => SW.validateJobs(duplicate), /duplicado/);
});

test('fluxo transacional persiste fase, confirma salvamento e fecha a aba', async () => {
  const message = {
    type: 'MAT_BATCH_LAUNCH_START', batchId: 'batch_test',
    jobs: [{ cmid: 12, activityName: 'Atividade 12', gradingUrl: 'https://ead.senai.br/mod/assign/view.php?id=12', records: [{ nome: 'Ana', nota: '8', feedback: 'Bom trabalho' }] }],
    options: {}
  };
  const accepted = await new Promise((resolve) => runtimeMessageListener(message, { id: chrome.runtime.id, tab: { id: 1 } }, resolve));
  assert.equal(accepted.accepted, true);
  const deadline = Date.now() + 1000;
  while (!notifications.some((item) => item.type === 'MAT_BATCH_DONE') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const done = notifications.find((item) => item.type === 'MAT_BATCH_DONE');
  assert.ok(done);
  assert.equal(done.results[0].outcome, 'sucesso');
  assert.deepEqual(transactionStates, ['preparar', 'enviado', 'verificar']);
  assert.deepEqual(removedTabs, [2]);
  assert.equal(sessionValues.mat_active_batch_v3, undefined);
});

test('fluxo restaura action=grading quando o Moodle remove a ação da URL', async () => {
  let ticks = 0;
  batchTickResponder = (message) => {
    ticks += 1;
    if (ticks === 1) return { status: 'redirecting' };
    return defaultBatchTickResponder(message);
  };
  const message = {
    type: 'MAT_BATCH_LAUNCH_START', batchId: 'batch_redirect',
    jobs: [{ cmid: 15, activityName: 'Atividade 15', gradingUrl: 'https://ead.fieg.com.br/mod/assign/view.php?id=15', records: [{ nome: 'Bia', nota: '9' }] }],
    options: {}
  };
  const accepted = await new Promise((resolve) => runtimeMessageListener(message, { id: chrome.runtime.id, tab: { id: 1 } }, resolve));
  assert.equal(accepted.accepted, true);
  const deadline = Date.now() + 1000;
  while (!notifications.some((item) => item.type === 'MAT_BATCH_DONE' && item.batchId === 'batch_redirect') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const done = notifications.find((item) => item.type === 'MAT_BATCH_DONE' && item.batchId === 'batch_redirect');
  assert.ok(done);
  assert.equal(done.results[0].outcome, 'sucesso');
  assert.match(updatedTabs.at(-1).url, /action=grading/);
  batchTickResponder = defaultBatchTickResponder;
});

test('fluxo preserva a confirmação do salvamento e sinaliza divergências da releitura', async () => {
  batchTickResponder = (message) => {
    if (message.transactionState === 'enviado') return { status: 'saved', message: 'Salvo.' };
    if (message.transactionState === 'verificar') {
      return {
        status: 'verified',
        verification: {
          summary: { total: 1, confirmed: 0, divergent: 1, notFound: 0, notVerifiable: 0 },
          items: [{ nome: 'Caio', status: 'divergent', grade: { expected: '8', actual: '7', status: 'divergent' } }],
        },
      };
    }
    return { status: 'submitting', report: { verificationPlan: [{ nome: 'Caio', expectedGrade: '8' }] } };
  };
  const message = {
    type: 'MAT_BATCH_LAUNCH_START', batchId: 'batch_divergent',
    jobs: [{ cmid: 18, activityName: 'Atividade 18', gradingUrl: 'https://ead.senai.br/mod/assign/view.php?id=18', records: [{ nome: 'Caio', nota: '8' }] }],
    options: {}
  };
  const accepted = await new Promise((resolve) => runtimeMessageListener(message, { id: chrome.runtime.id, tab: { id: 1 } }, resolve));
  assert.equal(accepted.accepted, true);
  const deadline = Date.now() + 1000;
  while (!notifications.some((item) => item.type === 'MAT_BATCH_DONE' && item.batchId === 'batch_divergent') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const done = notifications.find((item) => item.type === 'MAT_BATCH_DONE' && item.batchId === 'batch_divergent');
  assert.equal(done.results[0].outcome, 'divergente');
  assert.equal(done.results[0].verification.summary.divergent, 1);
  batchTickResponder = defaultBatchTickResponder;
});

test('mensagens sem a identidade da extensão são ignoradas pelo service worker', () => {
  const result = runtimeMessageListener({ type: 'MAT_BATCH_CANCEL', batchId: 'qualquer' }, { id: 'origem-externa' }, () => {});
  assert.equal(result, undefined);
});
