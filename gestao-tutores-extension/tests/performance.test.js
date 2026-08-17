"use strict";

const assert = require("node:assert/strict");
global.GestaoTutoresCore = require("../shared/core.js");
const Workload = require("../metrics/workload.js");

const tutors = Array.from({ length: 50 }, (_, tutorIndex) => ({
  id: `t${tutorIndex}`,
  courses: Array.from({ length: 10 }, (_, courseIndex) => {
    const base = tutorIndex * 100 + courseIndex * 5;
    const studentIds = Array.from({ length: 40 }, (_, studentIndex) => `a${base + studentIndex}`);
    return {
      id: `c${tutorIndex}-${courseIndex}`,
      collectionState: "completo",
      excluded: false,
      studentIds,
      enrollmentCount: studentIds.length,
      cursoInstitucional: `Curso ${tutorIndex % 8}`,
      turma: `T${tutorIndex}-${courseIndex % 3}`,
      unidadeCurricular: `UC${courseIndex}`,
      modality: courseIndex % 2 ? "Técnico" : "Qualificação"
    };
  })
}));

const started = performance.now();
const profiles = Workload.buildProfiles(tutors);
const elapsed = performance.now() - started;

assert.equal(profiles.length, 50);
assert.equal(tutors.reduce((sum, tutor) => sum + tutor.courses.length, 0), 500);
assert.ok(profiles.every((profile) => Number.isFinite(profile.ict)));
assert.ok(elapsed < 1000, `motor gerencial para 500 cursos levou ${elapsed.toFixed(1)} ms`);
console.log(`performance.test.js: OK (${elapsed.toFixed(1)} ms para 500 cursos)`);
