'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const response = (body = '<main>ok</main>', url = 'https://ead.senai.br/course/view.php?id=7') => ({
  ok: true,
  status: 200,
  url,
  text: async () => body,
});

function loadBroker(fetch, now = () => Date.now()) {
  class BrokerDate extends Date {
    static now() { return now(); }
  }
  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortController,
    performance,
    setTimeout,
    clearTimeout,
    Date: BrokerDate,
    DOMParser: class { parseFromString(html) { return { html }; } },
    fetch,
  });
  vm.runInContext(read('content/namespace.js'), context);
  vm.runInContext(read('content/request-broker.js'), context);
  return context.MAT.requestBroker;
}

test('deduplica URLs equivalentes ao ordenar os parâmetros da chave canônica', async () => {
  let calls = 0;
  const broker = loadBroker(async (url) => {
    calls += 1;
    return response('<main>curso</main>', url);
  });

  const [first, second] = await Promise.all([
    broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=7&page=2', ttlMs: 1_000 }),
    broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?page=2&id=7', ttlMs: 1_000 }),
  ]);

  assert.equal(calls, 1);
  assert.equal(first.document.html, '<main>curso</main>');
  assert.equal(second.document.html, '<main>curso</main>');
  assert.deepEqual(new Set([first.source, second.source]), new Set(['network', 'shared']));
});

test('reutiliza cache antes do TTL e busca novamente quando está expirado', async () => {
  let calls = 0;
  let now = 1_000;
  const broker = loadBroker(async (url) => response(`<main>${++calls}</main>`, url), () => now);
  const request = { url: 'https://ead.senai.br/course/view.php?id=8', ttlMs: 10_000 };

  const first = await broker.fetchDocument(request);
  const cached = await broker.fetchDocument(request);
  now += 10_001;
  const expired = await broker.fetchDocument(request);

  assert.equal(calls, 2);
  assert.equal(first.source, 'network');
  assert.equal(cached.source, 'cache');
  assert.equal(expired.source, 'network');
});

test('limita leituras de rede a duas e atende prioridade interativa antes da fila de background', async () => {
  const started = [];
  const releases = [];
  const broker = loadBroker((url) => new Promise((resolve) => {
    started.push(url);
    releases.push(() => resolve(response('<main>ok</main>', url)));
  }));

  const one = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=1', ttlMs: 0, priority: 'normal' });
  const two = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=2', ttlMs: 0, priority: 'normal' });
  const background = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=3', ttlMs: 0, priority: 'background' });
  const interactive = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=4', ttlMs: 0, priority: 'interactive' });

  assert.deepEqual(started, [
    'https://ead.senai.br/course/view.php?id=1',
    'https://ead.senai.br/course/view.php?id=2',
  ]);
  releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started[2], 'https://ead.senai.br/course/view.php?id=4');
  releases.shift()();
  releases.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  releases.shift()();
  await Promise.all([one, two, background, interactive]);
  assert.equal(broker.getMetrics().maxConcurrent, 2);
});

test('cancela somente itens ainda enfileirados no escopo solicitado', async () => {
  const releases = [];
  const broker = loadBroker((url) => new Promise((resolve) => {
    releases.push(() => resolve(response('<main>ok</main>', url)));
  }));
  const runningOne = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=11', ttlMs: 0, scopeId: 'uc:11' });
  const runningTwo = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=12', ttlMs: 0, scopeId: 'uc:12' });
  const queued = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=13', ttlMs: 0, scopeId: 'uc:13' });

  assert.equal(broker.cancelScope('uc:13'), 1);
  await assert.rejects(queued, /cancelada/i);
  releases.forEach((release) => release());
  await Promise.all([runningOne, runningTwo]);
  assert.equal(broker.getStatus('uc:13').cancelled, 1);
});

test('não armazena falhas ou timeouts no cache', async () => {
  let calls = 0;
  const broker = loadBroker((url) => {
    calls += 1;
    if (calls === 1) return Promise.reject(new Error('falha de rede'));
    if (calls === 2) return new Promise(() => {});
    return Promise.resolve(response('<main>recuperado</main>', url));
  });
  const url = 'https://ead.senai.br/course/view.php?id=14';

  await assert.rejects(broker.fetchDocument({ url, ttlMs: 10_000 }), /falha de rede/);
  await assert.rejects(broker.fetchDocument({ url, ttlMs: 10_000, timeoutMs: 10 }), /tempo limite/i);
  const recovered = await broker.fetchDocument({ url, ttlMs: 10_000 });

  assert.equal(calls, 3);
  assert.equal(recovered.source, 'network');
});

test('notifica assinantes quando o estado de um escopo muda', async () => {
  const releases = [];
  const broker = loadBroker((url) => new Promise((resolve) => releases.push(() => resolve(response('<main>ok</main>', url)))));
  const states = [];
  const unsubscribe = broker.subscribe('uc:20', (status) => states.push(status));
  const request = broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=20', scopeId: 'uc:20' });
  releases[0]();
  await request;
  unsubscribe();

  assert.deepEqual(states.map((status) => [status.queued, status.running, status.completed]), [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]);
});

test('rejeita redirecionamento para login antes de disponibilizar o documento', async () => {
  const broker = loadBroker(async () => response('<form><input name="username"><input name="password"></form>', 'https://ead.senai.br/login/index.php'));
  await assert.rejects(
    broker.fetchDocument({ url: 'https://ead.senai.br/course/view.php?id=21' }),
    /sessão expirada/i
  );
});
