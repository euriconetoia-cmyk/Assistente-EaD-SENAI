'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const batchSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'batch-grading.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'ui.js'), 'utf8');

test('lote para IA inclui contexto verificável de cada atividade', () => {
  assert.match(uiSource, /Baixar pacote para correção com IA/);
  assert.match(batchSource, /enunciado_da_atividade\.txt/);
  assert.match(batchSource, /criterios_de_avaliacao\.txt/);
  assert.match(batchSource, /dados_da_atividade\.txt/);
  assert.match(batchSource, /envios_dos_alunos\.zip/);
  assert.match(batchSource, /manifesto_atividades\.csv/);
  assert.match(batchSource, /Nota máxima não localizada/);
  assert.match(batchSource, /não invente essa informação/i);
});

test('gerador compartilhado produz ZIP local com nomes UTF-8', async () => {
  const MAT = {};
  const context = vm.createContext({ MAT, Blob, TextEncoder, URL, location: new URL('https://ead.senai.br/course/view.php?id=1'), setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'utils.js'), 'utf8'), context);
  const blob = MAT.utils.makeZipBlob([{ name: 'atividade/enunciado_da_atividade.txt', content: 'Avalie a solução apresentada.' }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.ok(new TextDecoder().decode(bytes).includes('enunciado_da_atividade.txt'));
});
