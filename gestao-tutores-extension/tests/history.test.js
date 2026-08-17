"use strict";

const assert = require("node:assert/strict");
global.GestaoTutoresCore = require("../shared/core.js");
global.GestaoTutoresWorkload = require("../metrics/workload.js");
const History = require("../storage/history.js");

const snapshot = {
  host: "ead.fieg.com.br",
  environment: "Moodle Goiás",
  collectedAt: "2026-08-17T10:00:00.000Z",
  schemaVersion: 4,
  rulesetVersion: 5,
  rulesRevision: "r1",
  adapterId: "moodle-goias-v1",
  quality: { reliability: 100 },
  courses: [
    {
      id: "c1", collectionState: "completo", excluded: false, studentIds: ["a", "b"], enrollmentCount: 2,
      cursoInstitucional: "Curso A", turma: "T1", unidadeCurricular: "UC1", modality: "Técnico",
      tutors: [{ id: "t1", name: "Tutor Um", roles: ["Tutor"] }]
    },
    {
      id: "c2", collectionState: "completo", excluded: false, studentIds: ["b", "c"], enrollmentCount: 2,
      cursoInstitucional: "Curso A", turma: "T1", unidadeCurricular: "UC2", modality: "Técnico",
      tutors: [{ id: "t1", name: "Tutor Um", roles: ["Tutor"] }]
    },
    {
      id: "c3", collectionState: "parcial", excluded: false, studentIds: ["x"], enrollmentCount: 1,
      tutors: [{ id: "t1", name: "Tutor Um", roles: ["Tutor"] }]
    },
    {
      id: "c4", collectionState: "completo", excluded: true, studentIds: ["y"], enrollmentCount: 1,
      tutors: [{ id: "t2", name: "Tutor Dois", roles: ["Tutor"] }]
    }
  ]
};

{
  const entry = History.buildHistoryEntry(snapshot);
  assert.equal(entry.global.tutors, 1);
  assert.equal(entry.global.eligibleCourses, 2);
  assert.equal(entry.global.uniqueStudents, 3);
  assert.equal(entry.global.enrollments, 4);
  assert.equal(entry.tutors[0].uniqueStudents, 3);
  assert.equal(entry.tutors[0].curriculumUnits, 2);
  assert.equal(entry.tutors.some((tutor) => tutor.id === "t2"), false, "curso excluído não deve entrar no histórico de carga");
  assert.equal(typeof entry.tutors[0].ict, "number");
  assert.equal(typeof entry.tutors[0].quantitativeScore, "number");
}

{
  const now = new Date("2026-08-17T12:00:00.000Z").getTime();
  const history = [
    { id: "old", collectedAt: "2026-01-01T00:00:00.000Z" },
    { id: "new", collectedAt: "2026-08-16T00:00:00.000Z" }
  ];
  const pruned = History.pruneHistory(history, 30, now);
  assert.deepEqual(pruned.map((item) => item.id), ["new"]);
}

{
  const updated = History.upsertHistory([{ id: "x", collectedAt: "2026-08-16T00:00:00.000Z", value: 1 }], { id: "x", collectedAt: "2026-08-16T00:00:00.000Z", value: 2 });
  assert.equal(updated.length, 1);
  assert.equal(updated[0].value, 2);
}

console.log("history.test.js: OK");
