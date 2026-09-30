'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'collectors.js'), 'utf8');
const importerSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'importer', 'contextual-importer.js'), 'utf8');

test('leituras remotas dos coletores passam pelo broker global', () => {
  assert.match(source, /MAT\.requestBroker\.fetchDocument/);
  assert.match(importerSource, /globalThis\.MAT\?\.requestBroker\?\.fetchDocument/);
});

test('coleta declara escopo explícito e usa a UC ativa como padrão', () => {
  assert.match(source, /scope = 'active-uc'/);
  assert.match(source, /const shouldCollectParticipants = scope === 'students' \|\| scope === 'course'/);
  assert.match(source, /const shouldCollectGrades = scope === 'grades' \|\| scope === 'course'/);
  assert.match(source, /const shouldCollectGrading = scope === 'course' \|\| scope === 'single-activity'/);
  assert.match(source, /scope === 'single-activity' && activityCmid/);
});
