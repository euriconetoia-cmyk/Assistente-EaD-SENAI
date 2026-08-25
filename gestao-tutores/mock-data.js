(() => {
  "use strict";

  function studentIds(prefix, start, end) {
    return Array.from({ length: end - start + 1 }, (_, index) => {
      const value = String(start + index).padStart(3, "0");
      return `${prefix}-${value}`;
    });
  }

  window.GESTAO_TUTORES_MOCK = {
    tutors: [
      {
        id: "tutor-a",
        name: "Tutor A",
        classes: [
          { id: "turma-101", course: "Técnico em Logística", className: "LOG.2026.001", modality: "Técnico", studentIds: studentIds("A", 1, 42), status: "Ativa", url: "#" },
          { id: "turma-102", course: "Técnico em Logística", className: "LOG.2026.002", modality: "Técnico", studentIds: studentIds("A", 30, 68), status: "Ativa", url: "#" },
          { id: "turma-103", course: "Aprendizagem em Logística", className: "APR.LOG.2026.003", modality: "Aprendizagem", studentIds: studentIds("A", 60, 90), status: "Ativa", url: "#" },
          { id: "turma-104", course: "Técnico em Administração", className: "ADM.2026.004", modality: "Técnico", studentIds: studentIds("A", 80, 124), status: "Ativa", url: "#" }
        ]
      },
      {
        id: "tutor-b",
        name: "Tutor B",
        classes: [
          { id: "turma-201", course: "Qualificação Profissional", className: "QUA.2026.001", modality: "Qualificação", studentIds: studentIds("B", 1, 36), status: "Ativa", url: "#" },
          { id: "turma-202", course: "Qualificação Profissional", className: "QUA.2026.002", modality: "Qualificação", studentIds: studentIds("B", 30, 63), status: "Ativa", url: "#" },
          { id: "turma-203", course: "Aperfeiçoamento Profissional", className: "APE.2026.001", modality: "Aperfeiçoamento", studentIds: studentIds("B", 55, 81), status: "Ativa", url: "#" }
        ]
      },
      {
        id: "tutor-c",
        name: "Tutor C",
        classes: [
          { id: "turma-301", course: "Técnico em Redes de Computadores", className: "REDES.2026.001", modality: "Técnico", studentIds: studentIds("C", 1, 48), status: "Ativa", url: "#" },
          { id: "turma-302", course: "Técnico em Informática", className: "INFO.2026.001", modality: "Técnico", studentIds: studentIds("C", 40, 85), status: "Ativa", url: "#" },
          { id: "turma-303", course: "Técnico em Desenvolvimento de Sistemas", className: "DS.2026.001", modality: "Técnico", studentIds: studentIds("C", 75, 118), status: "Ativa", url: "#" },
          { id: "turma-304", course: "Técnico em Desenvolvimento de Sistemas", className: "DS.2026.002", modality: "Técnico", studentIds: studentIds("C", 110, 152), status: "Ativa", url: "#" },
          { id: "turma-305", course: "Introdução à Tecnologia da Informação", className: "ITI.2026.001", modality: "Qualificação", studentIds: studentIds("C", 140, 190), status: "Ativa", url: "#" }
        ]
      },
      {
        id: "tutor-d",
        name: "Tutor D",
        classes: [
          { id: "turma-401", course: "Pós-graduação em Gestão", className: "POS.2026.001", modality: "Pós-graduação", studentIds: studentIds("D", 1, 24), status: "Ativa", url: "#" },
          { id: "turma-402", course: "Pós-graduação em Gestão", className: "POS.2026.002", modality: "Pós-graduação", studentIds: studentIds("D", 15, 36), status: "Encerrada", url: "#" }
        ]
      }
    ],
    unassignedClasses: [
      { id: "turma-sem-tutor", course: "Curso sem tutor identificado", className: "SEM.TUTOR.001", modality: "Técnico", studentIds: studentIds("U", 1, 29), status: "Ativa", url: "#" }
    ]
  };
})();
