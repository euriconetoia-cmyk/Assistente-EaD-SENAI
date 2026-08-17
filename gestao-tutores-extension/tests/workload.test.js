"use strict";

const assert = require("node:assert/strict");
global.GestaoTutoresCore = require("../shared/core.js");
const Workload = require("../metrics/workload.js");

function course(id, students, extras = {}) {
  return {
    id,
    collectionState: "completo",
    excluded: false,
    enrollmentCount: students.length,
    studentIds: students,
    modality: "Técnico",
    ...extras
  };
}

const tutors = [
  {
    id: "t1",
    courses: [
      course("c1", ["a", "b", "c"], { cursoInstitucional: "Curso A", turma: "T1", unidadeCurricular: "UC1" }),
      course("c2", ["a", "b", "d", "e"], { cursoInstitucional: "Curso A", turma: "T1", unidadeCurricular: "UC2" }),
      course("c3", ["x", "y"], { excluded: true }),
      course("c4", ["z"], { collectionState: "parcial" })
    ]
  },
  {
    id: "t2",
    courses: [
      course("c5", ["f"], { modalidade: "Qualificação" })
    ]
  }
];

{
  const raw = Workload.rawMetrics(tutors[0]);
  assert.equal(raw.uniqueStudents, 5, "alunos devem ser deduplicados entre cursos completos elegíveis");
  assert.equal(raw.enrollments, 7);
  assert.equal(raw.moodleCourses, 2);
  assert.equal(raw.excludedCourses, 1);
  assert.equal(raw.partialCourses, 1);
  assert.equal(raw.curriculumUnits, 2);
}

{
  const profiles = Workload.buildProfiles(tutors);
  assert.equal(profiles.length, 2);
  assert.ok(profiles[0].ict > profiles[1].ict, "tutor com maior carga e complexidade deve obter ICT maior no mesmo recorte");
  assert.ok(profiles[0].quantitative.score >= profiles[1].quantitative.score);
  assert.equal(typeof profiles[0].quantitative.components.uniqueStudents.weight, "number");
}

{
  const custom = Workload.buildProfiles(tutors, { quantitative: 100, complexity: 0 });
  assert.equal(custom[0].ict, custom[0].quantitative.score);
}

{
  assert.equal(Workload.classifyIct(85), "Muito alta");
  assert.equal(Workload.classifyIct(65), "Alta");
  assert.equal(Workload.classifyIct(45), "Moderada");
}

console.log("workload.test.js: OK");
