'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('pacote de evidências inclui histórico, relatório e auditoria sem HTML inseguro', () => {
  let downloaded = null;
  const MAT = { VERSION: '3.6.6', state: { settings: { retentionDays: 90 } }, utils: { normalizeText: (value) => String(value || '').toLowerCase(), formatDate: (value) => String(value || ''), makeZipBlob: (entries) => entries, downloadBlob: (blob, filename, type) => { downloaded = { entries: blob, filename, type }; } } };
  const context = vm.createContext({ MAT, MAT_SHARED: { neutralizeSpreadsheetFormula: (value) => String(value ?? '') }, globalThis: null, location: { hostname: 'ead.fieg.com.br' } });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'exporters.js'), 'utf8'), context);
  const result = MAT.exporters.exportEvidencePackage({ snapshot: { course: { id: 18, name: 'Curso Técnico', activeUcName: 'UC Atual' } }, actions: [{ id: 'a1', createdAt: '2026-08-27T10:00:00.000Z', title: '<script>alert(1)</script>', note: 'Contato realizado' }], checklist: { report: true } });
  assert.equal(result.recordCount, 1);
  assert.deepEqual(Array.from(downloaded.entries, (entry) => entry.name), ['LEIA-ME.txt', 'relatorio_evidencias.html', 'historico_acoes.csv', 'auditoria_completa.json']);
  const html = downloaded.entries.find((entry) => entry.name === 'relatorio_evidencias.html').content;
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
