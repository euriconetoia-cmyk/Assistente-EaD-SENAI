'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

test('manifesto usa metadados e permissões mínimas da versão 3.6.3', () => {
  assert.equal(manifest.version, '3.6.3');
  assert.equal(manifest.name, 'Assistente EaD SENAI');
  assert.deepEqual(manifest.permissions.sort(), ['alarms', 'storage']);
  assert.ok(!manifest.permissions.includes('tabs'));
});

test('dashboard executivo usa arquivos locais e mantém a CSP', () => {
  const resources = manifest.web_accessible_resources.flatMap(entry => entry.resources || []);
  assert.ok(resources.includes('dashboard/index.html'));
  assert.ok(resources.includes('dashboard/dashboard.css'));
  assert.ok(resources.includes('dashboard/dashboard.js'));
  assert.doesNotMatch(read('dashboard/index.html'), /<script(?![^>]+src=)/);
  assert.match(read('dashboard/dashboard.js'), /window\.print\(\)/);
  assert.match(read('dashboard/dashboard.js'), /dashboard_turmas_/);
  assert.match(read('dashboard/dashboard.js'), /value !== null && value !== undefined/);
});

test('página inicial recebe a visão geral de cursos sem ampliar permissões', () => {
  const importerEntry = manifest.content_scripts.find(entry => (entry.js || []).includes('content/importer/contextual-importer.js'));
  assert.ok(importerEntry.matches.includes('https://ead.senai.br/my/*'));
  assert.ok(importerEntry.matches.includes('https://ead.fieg.com.br/my/*'));
  assert.deepEqual(manifest.permissions.sort(), ['alarms', 'storage']);
});

test('interface isolada e acessível contém cinco abas primárias', () => {
  const ui = read('content/ui.js');
  assert.equal((ui.match(/class="mat-tab(?: mat-active)?"/g) || []).length, 5);
  assert.match(ui, /mat-more/);
  assert.match(ui, /aria-live/);
  assert.doesNotMatch(ui, /Somente leitura/);
  assert.match(read('content/namespace.js'), /attachShadow/);
});

test('operações perigosas têm padrões conservadores', () => {
  const batch = read('content/batch-grading.js');
  const importer = read('content/importer/contextual-importer.js');
  assert.doesNotMatch(batch, /<input id="mat-batch-overwrite-grade"[^>]+checked/);
  assert.doesNotMatch(importer, /<input id="mqi-overwrite-grade"[^>]+checked/);
  assert.doesNotMatch(importer, /window\.confirm/);
  assert.doesNotMatch(importer, /document\.body\.dataset/);
});

test('todos os manipuladores de mensagens validam a identidade interna', () => {
  for (const file of ['background/service-worker.js', 'content/main.js', 'content/batch-grading.js', 'content/importer/contextual-importer.js']) {
    const source = read(file);
    assert.match(source, /onMessage\.addListener/);
    assert.match(source, /sender\?\.id !== chrome\.runtime\.id/);
  }
});
