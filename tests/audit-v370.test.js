'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('menu lateral compacto possui expansão, estado ativo e créditos', () => {
  const html = read('dashboard/index.html');
  const css = read('dashboard/dashboard.css');
  const js = read('dashboard/dashboard.js');
  assert.match(html, /data-nav="compact"/);
  assert.match(html, /id="nav-toggle"/);
  assert.match(html, /By Eurico Cirilo/);
  assert.match(html, /aria-current="page"/);
  assert.match(css, /data-nav="expanded"/);
  assert.match(css, /data-tooltip/);
  assert.match(js, /mat_dashboard_nav_v1/);
});

test('Auditoria Local oferece filtros, pasta e fallback em ZIP', () => {
  const html = read('dashboard/index.html');
  const js = read('dashboard/dashboard.js');
  assert.match(html, /directory-access\.js/);
  assert.match(html, /audit-export\.js/);
  assert.match(js, /Auditoria Local/);
  for (const id of ['audit-period', 'audit-result', 'audit-type', 'audit-search']) assert.match(js, new RegExp(id));
  assert.match(js, /choose-directory/);
  assert.match(js, /download-zip/);
  assert.match(js, /include-academic-data/);
});

test('referência da pasta usa IndexedDB e permissão explícita de leitura e escrita', () => {
  const source = read('dashboard/directory-access.js');
  assert.match(source, /showDirectoryPicker/);
  assert.match(source, /queryPermission/);
  assert.match(source, /requestPermission/);
  assert.match(source, /mode: 'readwrite'/);
  assert.match(source, /indexedDB/);
  assert.doesNotMatch(source, /chrome\.downloads/);
});

test('nomes de pastas são neutralizados antes da gravação', () => {
  const context = vm.createContext({ globalThis: null, window: {}, indexedDB: {}, console });
  context.globalThis = context;
  context.window = context;
  vm.runInContext(read('dashboard/directory-access.js'), context);
  assert.equal(context.MAT_DIRECTORY.safeName('../../Curso Técnico: 01'), 'Curso_Tecnico_01');
  assert.equal(context.MAT_DIRECTORY.safeName(''), 'evidencias');
});

test('pacote da Auditoria Local inclui manifesto e hashes SHA-256', async () => {
  const context = vm.createContext({ globalThis: null, crypto: webcrypto, Blob, TextEncoder, URL, document: {}, setTimeout, console });
  context.globalThis = context;
  vm.runInContext(read('dashboard/audit-export.js'), context);
  const result = await context.MAT_AUDIT_EXPORT.buildFiles({ events: [{ eventId: 'a1', eventType: 'analysis.completed', createdAt: '2026-08-30T12:00:00.000Z', result: 'success', counts: { courses: 2 }, message: 'Concluída' }], payload: { courses: [] }, filters: {}, includeAcademic: false });
  const names = Array.from(result.files, (file) => file.name);
  assert.deepEqual(names, ['LEIA-ME.txt', 'relatorio_evidencias.html', 'historico_acoes.csv', 'auditoria_completa.json', 'manifesto_arquivos.json', 'CHECKSUMS.sha256']);
  const checksums = await result.files.at(-1).blob.text();
  assert.match(checksums, /^[a-f0-9]{64}  LEIA-ME\.txt/m);
  assert.match(checksums, /manifesto_arquivos\.json/);
});

test('histórico padrão minimiza dados individuais e limita retenção', () => {
  const storage = read('content/storage.js');
  assert.match(storage, /mat_audit_log_v1/);
  assert.match(storage, /slice\(0, 2000\)/);
  assert.match(storage, /eventType/);
  assert.match(storage, /courseName/);
  const auditBlock = storage.slice(storage.indexOf('const addAuditEvent'), storage.indexOf('const addAction'));
  assert.doesNotMatch(auditBlock, /studentName|feedback|gradeTotal/);
});

test('tema unificado cobre dashboard, painel e importador', () => {
  assert.match(read('dashboard/dashboard.css'), /--accent:#0f9fb5/);
  assert.match(read('dashboard/dashboard.css'), /data-theme="dark"/);
  assert.match(read('content/styles.css'), /--mat-accent: #0f9fb5/);
  assert.match(read('content/importer/contextual-importer.css'), /Sistema visual unificado da versão 3\.7\.0/);
  assert.match(read('content/importer/contextual-importer.css'), /prefers-color-scheme: dark/);
});

test('paleta principal atende contraste AA para texto normal', () => {
  const luminance = (hex) => {
    const values = hex.match(/\w\w/g).map((part) => parseInt(part, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  const contrast = (foreground, background) => {
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };
  for (const pair of [['162238', 'ffffff'], ['5b6880', 'ffffff'], ['0b5cad', 'ffffff'], ['edf5fc', '121e2c'], ['a9b8c9', '121e2c'], ['47a8ec', '121e2c'], ['067647', 'e9f8f0'], ['a15c00', 'fff6e5'], ['b42318', 'fff0ef']]) {
    assert.ok(contrast(...pair) >= 4.5, `${pair[0]} sobre ${pair[1]} deve atender AA`);
  }
});
