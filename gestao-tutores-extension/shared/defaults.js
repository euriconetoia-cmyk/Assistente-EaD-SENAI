(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresDefaults = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RULESET_VERSION = 5;

  const MODALITY_RULES = [
    { label: "Aprendizagem", terms: ["aprendizagem", "aprendiz industrial"] },
    { label: "Técnico", terms: ["curso técnico", "curso tecnico", "técnico em", "tecnico em", "tec."] },
    { label: "Qualificação", terms: ["qualificação", "qualificacao", "qualificação profissional", "qualificacao profissional", "qua."] },
    { label: "Aperfeiçoamento", terms: ["aperfeiçoamento", "aperfeicoamento", "aperfeiçoamento profissional"] },
    { label: "Pós-graduação", terms: ["pós-graduação", "pos-graduacao", "pos graduacao", "mba", "especialização", "especializacao"] },
    { label: "EJA", terms: ["eja", "educação de jovens e adultos", "educacao de jovens e adultos"] }
  ];

  const ICT_WEIGHTS = {
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
  };

  const SETTINGS = {
    maxCourses: 500,
    maxCategoryPages: 250,
    maxPagesPerCourse: 80,
    courseConcurrency: 4,
    requestTimeoutMs: 20000,
    requestRetries: 1,
    tutorRolePatterns: ["tutor", "tutor online", "tutor ead", "professor tutor", "docente tutor"],
    studentRolePatterns: ["estudante", "aluno", "student", "aprendiz"],
    managementRolePatterns: ["coordenação", "coordenacao", "coordenador", "gestor", "manager", "administrador", "admin"],
    staffRolePatterns: [
      "administrador", "admin", "manager", "gestor", "coordenador", "coordenação", "coordenacao",
      "professor", "teacher", "docente", "instrutor", "monitor", "tutor", "guest", "convidado"
    ],
    modalityRules: MODALITY_RULES,
    institutionalRules: [],
    exclusionPatterns: [],
    ictWeights: ICT_WEIGHTS,
    historyRetentionDays: 90
  };

  return {
    SUPPORTED_HOSTS: ["ead.senai.br", "ead.fieg.com.br"],
    SETTINGS,
    MODALITY_RULES,
    ICT_WEIGHTS,
    RULESET_VERSION
  };
});
