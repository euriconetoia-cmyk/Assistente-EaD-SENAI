"use strict";

const assert = require("node:assert/strict");
const Core = require("../shared/core.js");
const Defaults = require("../shared/defaults.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("normaliza acentos, caixa e espaços", () => {
  assert.equal(Core.normalizeText("  Coordenação   Pedagógica  "), "coordenacao pedagogica");
});

test("separa papéis compostos", () => {
  assert.deepEqual(Core.splitRoleLabels("Tutor, Coordenação Pedagógica\nMonitor"), ["Tutor", "Coordenação Pedagógica", "Monitor"]);
});

test("reconhece tutor online a partir do padrão tutor", () => {
  assert.equal(Core.roleMatches(["Tutor Online"], ["tutor"]), true);
});

test("identifica modalidade pelo shortname ou categoria", () => {
  const course = { name: "Introdução à Logística", shortname: "QUA.154.001", categoryPath: ["Qualificação Profissional"] };
  assert.equal(Core.inferModality(course, Defaults.MODALITY_RULES), "Qualificação");
});

test("mantém modalidade desconhecida sem inventar classificação", () => {
  const course = { name: "Introdução à Logística", shortname: "", categoryPath: ["Cursos 2026"] };
  assert.equal(Core.inferModality(course, Defaults.MODALITY_RULES), "Não identificada");
});

test("calcula mediana sem ser dominada por um extremo", () => {
  const stats = Core.distributionStats([1896, 225, 20, 20, 17, 9]);
  assert.equal(stats.median, 20);
  assert.ok(stats.average > 300);
});

test("classifica outlier extremo como carga crítica", () => {
  const stats = Core.distributionStats([1896, 225, 20, 20, 17, 9]);
  assert.equal(Core.classifyLoad(1896, stats), "Crítica");
});

test("protege CSV contra fórmulas", () => {
  assert.equal(Core.csvEscape("=HIPERLINK(\"x\")"), "'=HIPERLINK(\"x\")");
  assert.equal(Core.csvEscape("texto;com;ponto"), '"texto;com;ponto"');
});

console.log("Todos os testes do núcleo foram concluídos.");
