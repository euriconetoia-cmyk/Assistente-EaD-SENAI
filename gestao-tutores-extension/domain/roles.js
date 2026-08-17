(function (root, factory) {
  const api = factory(root?.GestaoTutoresCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresRoles = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  if (!Core) throw new Error("GestaoTutoresCore é obrigatório para classificação de papéis.");

  function classifyParticipant(participant, hasExplicitRoles, settings) {
    const roleLabels = Core.splitRoleLabels(participant?.roleText);
    const isTutor = Core.roleMatches(roleLabels, settings?.tutorRolePatterns);
    const isMonitor = Core.roleMatches(roleLabels, settings?.monitorRolePatterns);
    const isManagement = Core.roleMatches(roleLabels, settings?.managementRolePatterns);
    const isStudentExplicit = Core.roleMatches(roleLabels, settings?.studentRolePatterns);
    const isStaff = Core.roleMatches(roleLabels, settings?.staffRolePatterns) || isTutor || isMonitor || isManagement;
    const hasRoleText = Boolean(String(participant?.roleText || "").trim());
    const isStudent = isStudentExplicit || (!hasExplicitRoles && !isTutor && !isMonitor && !isStaff && hasRoleText);
    const isUnclassified = Boolean(hasExplicitRoles && !isTutor && !isMonitor && !isStudentExplicit && !isStaff && hasRoleText);

    return {
      roleLabels,
      isTutor,
      isMonitor,
      isManagement,
      isStudent,
      isStaff,
      isUnclassified
    };
  }

  function staffEntry(participant, classification) {
    return {
      id: participant.id,
      moodleUserId: participant.moodleUserId,
      name: participant.name,
      email: participant.email,
      roles: classification.roleLabels,
      mixedManagement: classification.isManagement,
      mixedTutorMonitor: Boolean(classification.isTutor && classification.isMonitor)
    };
  }

  function classifyRows(extracted, settings) {
    const tutors = [];
    const monitors = [];
    const studentIds = [];
    const participantIds = [];
    let unclassifiedCount = 0;

    (extracted?.rows || []).forEach((participant) => {
      participantIds.push(participant.id);
      const classification = classifyParticipant(participant, Boolean(extracted.hasExplicitRoles), settings);

      if (classification.isTutor) tutors.push(staffEntry(participant, classification));
      if (classification.isMonitor) monitors.push(staffEntry(participant, classification));

      if (!classification.isTutor && !classification.isMonitor && classification.isStudent) {
        studentIds.push(participant.id);
      } else if (classification.isUnclassified) {
        unclassifiedCount += 1;
      }
    });

    const warnings = [...(extracted?.warnings || [])];
    if (unclassifiedCount) {
      warnings.push(`${unclassifiedCount} participante(s) possuem papel não reconhecido e não foram presumidos como estudantes.`);
    }
    if (!tutors.length) warnings.push("Nenhum tutor foi identificado pelos padrões configurados.");

    let confidence = extracted?.confidence || "baixa";
    if (unclassifiedCount && confidence === "alta") confidence = "média";

    return {
      tutors: Core.uniqueBy(tutors, (item) => item.id),
      monitors: Core.uniqueBy(monitors, (item) => item.id),
      studentIds: Core.unique(studentIds),
      participantIds: Core.unique(participantIds),
      unclassifiedCount,
      confidence,
      warnings: Core.unique(warnings)
    };
  }

  return { classifyParticipant, classifyRows };
});
