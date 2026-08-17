"use strict";

const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");

global.GestaoTutoresCore = require("../shared/core.js");
global.GestaoTutoresDefaults = require("../shared/defaults.js");
global.GestaoTutoresAdapters = require("../adapters/registry.js");
global.GestaoTutoresMoodleBase = require("../adapters/moodle-base.js");
require("../adapters/moodle-goias.js");
const Roles = require("../domain/roles.js");

const studentRows = Array.from({ length: 600 }, (_, index) => {
  const id = index + 1000;
  return `<tr><td><a href="https://ead.fieg.com.br/user/view.php?id=${id}&course=999">Aluno ${index + 1}</a></td><td>aluno${index + 1}@instituicao.test</td><td>Estudante</td></tr>`;
}).join("");

const html = `<!doctype html><html><body><table id="participants" class="generaltable"><thead><tr><th>Nome</th><th>E-mail</th><th>Papéis</th></tr></thead><tbody><tr><td><a href="https://ead.fieg.com.br/user/view.php?id=10&course=999">Tutor Escala</a></td><td>tutor@instituicao.test</td><td>Tutor Online</td></tr>${studentRows}</tbody></table></body></html>`;
const doc = new JSDOM(html, { url: "https://ead.fieg.com.br/user/index.php?id=999" }).window.document;
const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");

const started = performance.now();
const extracted = adapter.extractParticipants(doc, {
  courseId: "999",
  origin: "https://ead.fieg.com.br",
  host: "ead.fieg.com.br"
});
const classified = Roles.classifyRows(extracted, global.GestaoTutoresDefaults.SETTINGS);
const elapsed = performance.now() - started;

assert.equal(extracted.rows.length, 601);
assert.equal(classified.tutors.length, 1);
assert.equal(classified.studentIds.length, 600);
assert.equal(classified.studentIds[0].startsWith("ead.fieg.com.br:"), true);
assert.ok(elapsed < 2000, `parser de 601 participantes levou ${elapsed.toFixed(1)} ms`);
console.log(`scale-parser.test.js: OK (${elapsed.toFixed(1)} ms)`);
