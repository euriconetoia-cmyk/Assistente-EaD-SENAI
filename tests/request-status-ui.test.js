'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'content', 'ui.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'main.js'), 'utf8');
const collectorsSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'collectors.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'content', 'styles.css'), 'utf8');

test('faixa de atualização informa escopo e disponibiliza cancelamento apenas em fila', () => {
  assert.match(source, /function renderRequestStatus/);
  assert.match(source, /mat-request-status/);
  assert.match(source, /MAT\.requestBroker\.cancelScope/);
  assert.match(source, /status\.queued > 0/);
  assert.match(mainSource, /requestScopeId = `course:\$\{collectedCourse\.id\}`/);
  assert.match(mainSource, /renderRequestStatus\?\.\(requestScopeId, 'curso atual'\)/);
  assert.match(collectorsSource, /scopeId: MAT\.state\.requestScopeId \|\| 'default'/);
  assert.match(styles, /\.mat-request-status/);
  assert.match(styles, /\.mat-request-status-cancel/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});
