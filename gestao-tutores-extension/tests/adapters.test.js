"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

global.GestaoTutoresCore = require("../shared/core.js");
global.GestaoTutoresDefaults = require("../shared/defaults.js");
global.GestaoTutoresAdapters = require("../adapters/registry.js");
global.GestaoTutoresMoodleBase = require("../adapters/moodle-base.js");
require("../adapters/moodle-goias.js");
require("../adapters/moodle-ctm.js");
const Roles = require("../domain/roles.js");

function fixture(name, url) {
  const html = fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
  return new JSDOM(html, { url }).window.document;
}

{
  const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");
  global.location = { host: "ead.fieg.com.br" };
  const doc = fixture("goias-participants-papeis.html", "https://ead.fieg.com.br/user/index.php?id=900");
  const extracted = adapter.extractParticipants(doc, {
    courseId: "900",
    origin: "https://ead.fieg.com.br",
    host: "ead.fieg.com.br"
  });
  assert.equal(extracted.hasExplicitRoles, true);
  assert.equal(extracted.rows.length, 5);
  assert.equal(adapter.getMaxParticipantPageIndex(doc, "https://ead.fieg.com.br/user/index.php?id=900"), 1);

  const classified = Roles.classifyRows(extracted, global.GestaoTutoresDefaults.SETTINGS);
  assert.equal(classified.tutors.length, 2);
  assert.equal(classified.studentIds.length, 2);
  assert.equal(classified.tutors.some((tutor) => tutor.mixedManagement), true);
  assert.equal(classified.studentIds.includes("ead.fieg.com.br:301"), false, "professor presencial não pode ser contado como aluno");
}

{
  const adapter = global.GestaoTutoresAdapters.forHost("ead.senai.br");
  global.location = { host: "ead.senai.br" };
  const doc = fixture("ctm-participants-roles.html", "https://ead.senai.br/user/index.php?id=800");
  const extracted = adapter.extractParticipants(doc, {
    courseId: "800",
    origin: "https://ead.senai.br",
    host: "ead.senai.br"
  });
  assert.equal(extracted.hasExplicitRoles, true);
  const classified = Roles.classifyRows(extracted, global.GestaoTutoresDefaults.SETTINGS);
  assert.equal(classified.tutors.length, 1);
  assert.equal(classified.studentIds.length, 2);
  assert.equal(classified.studentIds.includes("ead.senai.br:601"), false, "manager não pode ser contado como aluno");
}

{
  const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");
  const doc = fixture("goias-course.html", "https://ead.fieg.com.br/course/view.php?id=900");
  const metadata = adapter.extractCourseMetadata(doc, { id: "900", discoveredName: "Introdução à Logística" }, "https://ead.fieg.com.br");
  assert.equal(metadata.name, "Introdução à Logística");
  assert.equal(metadata.shortname, "LOG.2026.001-UC01");
  assert.equal(metadata.categoryId, "121");
  assert.equal(global.GestaoTutoresCore.inferModality(metadata, global.GestaoTutoresDefaults.MODALITY_RULES), "Técnico");
}

{
  const adapter = global.GestaoTutoresAdapters.forHost("ead.senai.br");
  const doc = fixture("ctm-course.html", "https://ead.senai.br/course/view.php?id=800");
  const metadata = adapter.extractCourseMetadata(doc, { id: "800", discoveredName: "Inteligência Artificial para Gestores" }, "https://ead.senai.br");
  assert.equal(metadata.shortname, "MBA.IA.2026");
  assert.equal(metadata.categoryId, "300");
  assert.equal(global.GestaoTutoresCore.inferModality(metadata, global.GestaoTutoresDefaults.MODALITY_RULES), "Pós-graduação");
}

assert.deepEqual(global.GestaoTutoresAdapters.list().sort(), ["ead.fieg.com.br", "ead.senai.br"].sort());
console.log("adapters.test.js: OK");
