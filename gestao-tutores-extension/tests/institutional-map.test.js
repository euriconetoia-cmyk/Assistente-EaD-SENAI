"use strict";

const assert = require("node:assert/strict");
global.GestaoTutoresCore = require("../shared/core.js");
const Institutional = require("../domain/institutional-map.js");

const course = {
  name: "Introdução à Logística",
  shortname: "LOG.2026.001-UC01",
  categoryId: "121",
  categoryPath: ["Cursos 2026", "Técnico", "Técnico em Logística"]
};

{
  const result = Institutional.normalizeCourse(course, []);
  assert.equal(result.cursoInstitucional, null);
  assert.equal(result.turma, null);
  assert.equal(result.unidadeCurricular, null);
  assert.equal(result.tipoEntidade, "moodle_course");
  assert.equal(result.institutionalConfidence, "não_confirmada");
}

{
  const rules = [
    { target: "cursoInstitucional", source: "categoryPath", type: "contains", pattern: "Técnico em Logística", value: "Técnico em Logística" },
    { target: "turma", source: "shortname", type: "regex", pattern: "^LOG\\.(\\d{4}\\.\\d{3})-", value: "$1" },
    { target: "unidadeCurricular", source: "name", type: "contains", pattern: "Introdução à Logística", value: "Introdução à Logística" },
    { target: "tipoEntidade", source: "shortname", type: "regex", pattern: "-UC\\d+$", value: "unidade_curricular" }
  ];
  const result = Institutional.normalizeCourse(course, rules);
  assert.equal(result.cursoInstitucional, "Técnico em Logística");
  assert.equal(result.turma, "2026.001");
  assert.equal(result.unidadeCurricular, "Introdução à Logística");
  assert.equal(result.tipoEntidade, "unidade_curricular");
  assert.equal(result.institutionalConfidence, "alta");
  assert.equal(result.institutionalEvidence.length, 4);
}

{
  const result = Institutional.normalizeCourse(course, [
    { target: "turma", source: "shortname", type: "regex", pattern: "[", value: "$1" }
  ]);
  assert.equal(result.turma, null, "regex inválida deve falhar de forma conservadora");
}

{
  assert.equal(Institutional.exclusionReason(course, ["ambiente de teste", "LOG.2026"]), "LOG.2026");
  assert.equal(Institutional.exclusionReason(course, ["template" ]), "");
}

console.log("institutional-map.test.js: OK");
