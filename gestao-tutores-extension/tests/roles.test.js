"use strict";

const assert = require("node:assert/strict");
global.GestaoTutoresCore = require("../shared/core.js");
const Defaults = require("../shared/defaults.js");
const Roles = require("../domain/roles.js");

const settings = Defaults.SETTINGS;

{
  const result = Roles.classifyParticipant({ roleText: "Tutor, Coordenação" }, true, settings);
  assert.equal(result.isTutor, true);
  assert.equal(result.isManagement, true);
  assert.equal(result.isStudent, false);
}

{
  const result = Roles.classifyParticipant({ roleText: "Professor Presencial" }, true, settings);
  assert.equal(result.isTutor, false);
  assert.equal(result.isStudent, false);
  assert.equal(result.isStaff, true);
}

{
  const result = Roles.classifyParticipant({ roleText: "Papel Institucional Desconhecido" }, true, settings);
  assert.equal(result.isStudent, false, "papel desconhecido não pode virar estudante quando há coluna explícita");
  assert.equal(result.isUnclassified, true);
}

{
  const result = Roles.classifyParticipant({ roleText: "Participante" }, false, settings);
  assert.equal(result.isStudent, true, "sem coluna explícita a heurística conservadora pode classificar participante não staff");
}

{
  const extracted = {
    hasExplicitRoles: true,
    confidence: "alta",
    warnings: [],
    rows: [
      { id: "h:1", moodleUserId: "1", name: "Tutor", email: "", roleText: "Tutor Online" },
      { id: "h:2", moodleUserId: "2", name: "Aluno", email: "", roleText: "Estudante" },
      { id: "h:3", moodleUserId: "3", name: "Outro", email: "", roleText: "Papel Desconhecido" }
    ]
  };
  const classified = Roles.classifyRows(extracted, settings);
  assert.equal(classified.tutors.length, 1);
  assert.deepEqual(classified.studentIds, ["h:2"]);
  assert.equal(classified.unclassifiedCount, 1);
  assert.equal(classified.confidence, "média");
}

console.log("roles.test.js: OK");
