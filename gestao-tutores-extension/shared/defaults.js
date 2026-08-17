(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresDefaults = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MODALITY_RULES = [
    { label: "Aprendizagem", terms: ["aprendizagem", "aprendiz industrial"] },
    { label: "Técnico", terms: ["curso técnico", "curso tecnico", "técnico em", "tecnico em", "tec."] },
    { label: "Qualificação", terms: ["qualificação", "qualificacao", "qualificação profissional", "qualificacao profissional", "qua."] },
    { label: "Aperfeiçoamento", terms: ["aperfeiçoamento", "aperfeicoamento", "aperfeiçoamento profissional"] },
    { label: "Pós-graduação", terms: ["pós-graduação", "pos-graduacao", "pos graduacao", "mba", "especialização", "especializacao"] },
    { label: "EJA", terms: ["eja", "educação de jovens e adultos", "educacao de jovens e adultos"] }
  ];

  const SETTINGS = {
    maxCourses: 500,
    maxCategoryPages: 250,
    maxPagesPerCourse: 80,
    courseConcurrency: 4,
    tutorRolePatterns: ["tutor", "tutor online", "tutor ead", "professor tutor", "docente tutor"],
    studentRolePatterns: ["estudante", "aluno", "student", "aprendiz"],
    managementRolePatterns: ["coordenação", "coordenacao", "coordenador", "gestor", "manager", "administrador", "admin"],
    staffRolePatterns: [
      "administrador", "admin", "manager", "gestor", "coordenador", "coordenação", "coordenacao",
      "professor", "teacher", "docente", "instrutor", "monitor", "tutor", "guest", "convidado"
    ],
    modalityRules: MODALITY_RULES
  };

  return {
    SUPPORTED_HOSTS: ["ead.senai.br", "ead.fieg.com.br"],
    SETTINGS,
    MODALITY_RULES
  };
});
