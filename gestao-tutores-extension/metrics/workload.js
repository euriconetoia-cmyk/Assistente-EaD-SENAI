(function (root, factory) {
  const api = factory(root?.GestaoTutoresCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresWorkload = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  if (!Core) throw new Error("GestaoTutoresCore é obrigatório para métricas de carga.");

  const DEFAULT_WEIGHTS = Object.freeze({
    quantitative: 70,
    complexity: 30,
    quantitativeComponents: {
      uniqueStudents: 50,
      enrollments: 20,
      moodleCourses: 30
    },
    complexityComponents: {
      institutionalCourses: 20,
      classes: 25,
      curriculumUnits: 35,
      modalities: 20
    }
  });

  function eligibleCourses(tutor) {
    return (tutor?.courses || []).filter((course) => !course.excluded && course.collectionState === "completo");
  }

  function rawMetrics(tutor) {
    const courses = eligibleCourses(tutor);
    const allNonExcluded = (tutor?.courses || []).filter((course) => !course.excluded);
    const studentIds = new Set();
    let enrollments = 0;
    courses.forEach((course) => {
      (course.studentIds || []).forEach((id) => studentIds.add(id));
      enrollments += Number(course.enrollmentCount ?? (course.studentIds || []).length);
    });

    return {
      uniqueStudents: studentIds.size,
      enrollments,
      moodleCourses: courses.length,
      institutionalCourses: Core.unique(courses.map((course) => course.cursoInstitucional).filter(Boolean)).length,
      classes: Core.unique(courses.map((course) => course.turma).filter(Boolean)).length,
      curriculumUnits: Core.unique(courses.map((course) => course.unidadeCurricular).filter(Boolean)).length,
      modalities: Core.unique(courses.map((course) => course.modality).filter((value) => value && value !== "Não identificada")).length,
      excludedCourses: (tutor?.courses || []).filter((course) => course.excluded).length,
      partialCourses: allNonExcluded.filter((course) => course.collectionState === "parcial").length,
      errorCourses: allNonExcluded.filter((course) => course.collectionState === "erro").length
    };
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function referenceValue(values) {
    const clean = values.map(Number).filter(Number.isFinite).filter((value) => value >= 0).sort((a, b) => a - b);
    if (!clean.length) return 0;
    return Math.max(percentile(clean, 0.95), 1);
  }

  function normalize(value, reference) {
    if (!reference) return 0;
    return Math.max(0, Math.min(100, (Number(value || 0) / reference) * 100));
  }

  function weightedScore(components, weights, references) {
    const entries = Object.keys(weights || {}).filter((key) => Number(weights[key]) > 0 && Number(references[key]) > 0);
    const totalWeight = entries.reduce((sum, key) => sum + Number(weights[key]), 0);
    if (!totalWeight) return { score: 0, components: {} };
    const detail = {};
    let total = 0;
    entries.forEach((key) => {
      const normalized = normalize(components[key], references[key]);
      const weight = Number(weights[key]);
      detail[key] = {
        raw: Number(components[key] || 0),
        reference: Number(references[key] || 0),
        normalized: Math.round(normalized * 10) / 10,
        weight
      };
      total += normalized * weight;
    });
    return { score: Math.round((total / totalWeight) * 10) / 10, components: detail };
  }

  function buildReferences(rawList) {
    const keys = ["uniqueStudents", "enrollments", "moodleCourses", "institutionalCourses", "classes", "curriculumUnits", "modalities"];
    return Object.fromEntries(keys.map((key) => [key, referenceValue(rawList.map((item) => item[key]))]));
  }

  function mergeWeights(input) {
    return {
      quantitative: Number(input?.quantitative ?? DEFAULT_WEIGHTS.quantitative),
      complexity: Number(input?.complexity ?? DEFAULT_WEIGHTS.complexity),
      quantitativeComponents: { ...DEFAULT_WEIGHTS.quantitativeComponents, ...(input?.quantitativeComponents || {}) },
      complexityComponents: { ...DEFAULT_WEIGHTS.complexityComponents, ...(input?.complexityComponents || {}) }
    };
  }

  function buildProfiles(tutors, inputWeights) {
    const weights = mergeWeights(inputWeights);
    const rawList = (tutors || []).map((tutor) => ({ tutor, raw: rawMetrics(tutor) }));
    const references = buildReferences(rawList.map((item) => item.raw));

    return rawList.map(({ tutor, raw }) => {
      const quantitative = weightedScore(raw, weights.quantitativeComponents, references);
      const complexity = weightedScore(raw, weights.complexityComponents, references);
      const outerWeight = Math.max(0, weights.quantitative) + Math.max(0, weights.complexity) || 1;
      const ict = Math.round(((quantitative.score * Math.max(0, weights.quantitative) + complexity.score * Math.max(0, weights.complexity)) / outerWeight) * 10) / 10;
      return {
        tutorId: tutor.id,
        raw,
        quantitative,
        complexity,
        ict,
        references,
        weights
      };
    });
  }

  function classifyIct(score) {
    const value = Number(score || 0);
    if (value >= 80) return "Muito alta";
    if (value >= 60) return "Alta";
    if (value >= 40) return "Moderada";
    if (value >= 20) return "Baixa";
    return "Muito baixa";
  }

  return {
    DEFAULT_WEIGHTS,
    eligibleCourses,
    rawMetrics,
    buildProfiles,
    classifyIct,
    referenceValue
  };
});
