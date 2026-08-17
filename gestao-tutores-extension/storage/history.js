(function (root, factory) {
  const api = factory(root?.GestaoTutoresCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  if (!Core) throw new Error("GestaoTutoresCore é obrigatório para histórico.");

  function buildHistoryEntry(snapshot) {
    const tutorMap = new Map();
    const globalStudents = new Set();
    let globalEnrollments = 0;
    let eligibleCourses = 0;

    (snapshot?.courses || []).forEach((course) => {
      if (course.excluded || course.collectionState !== "completo") return;
      eligibleCourses += 1;
      const studentIds = Core.unique(course.studentIds || []);
      studentIds.forEach((id) => globalStudents.add(id));
      globalEnrollments += Number(course.enrollmentCount ?? studentIds.length);

      (course.tutors || []).forEach((tutor) => {
        const key = tutor.id || Core.normalizeText(`${tutor.name}|${tutor.email}`);
        if (!tutorMap.has(key)) {
          tutorMap.set(key, {
            id: key,
            name: tutor.name || "Tutor sem nome",
            roles: new Set(),
            studentIds: new Set(),
            courseIds: new Set(),
            institutionalCourses: new Set(),
            classes: new Set(),
            curriculumUnits: new Set(),
            modalities: new Set(),
            enrollments: 0
          });
        }
        const entry = tutorMap.get(key);
        (tutor.roles || []).forEach((role) => entry.roles.add(role));
        studentIds.forEach((id) => entry.studentIds.add(id));
        entry.courseIds.add(course.id);
        if (course.cursoInstitucional) entry.institutionalCourses.add(course.cursoInstitucional);
        if (course.turma) entry.classes.add(course.turma);
        if (course.unidadeCurricular) entry.curriculumUnits.add(course.unidadeCurricular);
        if (course.modality && course.modality !== "Não identificada") entry.modalities.add(course.modality);
        entry.enrollments += Number(course.enrollmentCount ?? studentIds.length);
      });
    });

    const tutors = [...tutorMap.values()].map((entry) => ({
      id: entry.id,
      name: entry.name,
      roles: [...entry.roles],
      uniqueStudents: entry.studentIds.size,
      enrollments: entry.enrollments,
      moodleCourses: entry.courseIds.size,
      institutionalCourses: entry.institutionalCourses.size,
      classes: entry.classes.size,
      curriculumUnits: entry.curriculumUnits.size,
      modalities: entry.modalities.size
    })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: `${snapshot.host}:${snapshot.collectedAt}`,
      host: snapshot.host,
      environment: snapshot.environment,
      collectedAt: snapshot.collectedAt,
      durationMs: Number(snapshot.durationMs || 0),
      schemaVersion: snapshot.schemaVersion,
      rulesetVersion: snapshot.rulesetVersion,
      rulesRevision: snapshot.rulesRevision || "default",
      adapterId: snapshot.adapterId,
      quality: { ...(snapshot.quality || {}) },
      global: {
        tutors: tutors.length,
        eligibleCourses,
        uniqueStudents: globalStudents.size,
        enrollments: globalEnrollments
      },
      tutors
    };
  }

  function pruneHistory(entries, retentionDays, now = Date.now()) {
    const retentionMs = Math.max(1, Number(retentionDays || 90)) * 86400000;
    const cutoff = now - retentionMs;
    return (entries || [])
      .filter((entry) => {
        const time = new Date(entry.collectedAt).getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));
  }

  function upsertHistory(entries, entry) {
    const map = new Map((entries || []).map((item) => [item.id, item]));
    map.set(entry.id, entry);
    return [...map.values()].sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));
  }

  async function save(snapshot, retentionDays) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const key = `gestaoTutoresHistory:${snapshot.host}`;
    const stored = await chrome.storage.local.get(key);
    const entry = buildHistoryEntry(snapshot);
    const history = pruneHistory(upsertHistory(stored[key] || [], entry), retentionDays);
    await chrome.storage.local.set({ [key]: history });
  }

  async function load(host) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
    const key = `gestaoTutoresHistory:${host}`;
    const stored = await chrome.storage.local.get(key);
    return stored[key] || [];
  }

  return { buildHistoryEntry, pruneHistory, upsertHistory, save, load };
});
