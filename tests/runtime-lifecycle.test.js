'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'main.js'), 'utf8');

test('contexto não usa polling fixo para reinicializar ou atualizar a análise', () => {
  assert.doesNotMatch(source, /setInterval\(reinitializeIfContextChanged, 1800\)/);
  assert.doesNotMatch(source, /setInterval\(\(\) => refreshIfStale/);
  assert.match(source, /addEventListener\('popstate', reinitializeIfContextChanged\)/);
  assert.match(source, /document\.hidden\) return/);
});
