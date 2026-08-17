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

async function main() {
  {
    const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");
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
    const doc = fixture("participants-no-tutor.html", "https://ead.fieg.com.br/user/index.php?id=700");
    const extracted = adapter.extractParticipants(doc, {
      courseId: "700",
      origin: "https://ead.fieg.com.br",
      host: "ead.fieg.com.br"
    });
    const classified = Roles.classifyRows(extracted, global.GestaoTutoresDefaults.SETTINGS);
    assert.equal(classified.tutors.length, 0);
    assert.equal(classified.studentIds.length, 2);
    assert.equal(classified.warnings.some((warning) => warning.includes("Nenhum tutor")), true);
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

  {
    const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");
    const currentDocument = fixture("goias-discovery-index.html", "https://ead.fieg.com.br/course/index.php");
    const docs = new Map([
      ["https://ead.fieg.com.br/my/", fixture("goias-discovery-index.html", "https://ead.fieg.com.br/my/")],
      ["https://ead.fieg.com.br/course/index.php", fixture("goias-discovery-index.html", "https://ead.fieg.com.br/course/index.php")],
      ["https://ead.fieg.com.br/course/index.php?categoryid=200", fixture("goias-discovery-category.html", "https://ead.fieg.com.br/course/index.php?categoryid=200")],
      ["https://ead.fieg.com.br/course/index.php?categoryid=201", fixture("goias-discovery-subcategory.html", "https://ead.fieg.com.br/course/index.php?categoryid=201")]
    ]);
    const discovery = await adapter.discoverCourses({
      currentDocument,
      currentUrl: "https://ead.fieg.com.br/course/index.php",
      origin: "https://ead.fieg.com.br",
      settings: { maxCategoryPages: 20 },
      fetchDocument: async (url) => {
        if (!docs.has(url)) throw new Error(`fixture ausente: ${url}`);
        return docs.get(url);
      }
    });
    assert.deepEqual(discovery.courses.map((course) => course.id).sort(), ["100", "101", "102"]);
    assert.equal(discovery.categoryPagesRead, 2);
    assert.equal(discovery.categoryTraversalTruncated, false);
  }

  {
    const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");
    const currentDocument = fixture("goias-discovery-index.html", "https://ead.fieg.com.br/course/index.php");
    const categoryDoc = fixture("goias-discovery-category.html", "https://ead.fieg.com.br/course/index.php?categoryid=200");
    const discovery = await adapter.discoverCourses({
      currentDocument,
      currentUrl: "https://ead.fieg.com.br/course/index.php",
      origin: "https://ead.fieg.com.br",
      settings: { maxCategoryPages: 1 },
      fetchDocument: async (url) => {
        if (url.includes("categoryid=200")) return categoryDoc;
        return currentDocument;
      }
    });
    assert.equal(discovery.categoryTraversalTruncated, true, "limite de categorias deve sinalizar descoberta parcial");
  }

  {
    const adapter = global.GestaoTutoresAdapters.forHost("ead.fieg.com.br");
    const emptyDoc = new JSDOM("<!doctype html><html><body><div>sem tabela</div></body></html>", { url: "https://ead.fieg.com.br/user/index.php?id=999" }).window.document;
    const extracted = adapter.extractParticipants(emptyDoc, {
      courseId: "999",
      origin: "https://ead.fieg.com.br",
      host: "ead.fieg.com.br"
    });
    assert.equal(extracted.confidence, "baixa");
    assert.equal(extracted.rows.length, 0);
    assert.equal(extracted.warnings.some((warning) => warning.includes("Tabela de participantes")), true);
  }

  assert.deepEqual(global.GestaoTutoresAdapters.list().sort(), ["ead.fieg.com.br", "ead.senai.br"].sort());
  console.log("adapters.test.js: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
