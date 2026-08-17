(function (root, factory) {
  const api = factory(root?.GestaoTutoresCore, root?.GestaoTutoresWorkload);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresHistory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core, Workload) {
  "use strict";

  if (!Core) throw new Error("GestaoTutoresCore é obrigatório para histórico.");
  if (!Workload) throw new Error("GestaoTutoresWorkload é obrigatório para histórico.");

  function buildHistoryEntry(snapshot, ictWeights) {
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
            courses: []
          });
        }
        const entry = tutorMap.get(key);
        (tutor.roles || []).forEach((role) => entry.roles.add(role));
        entry.courses.push(course);
      });
    });

    const tutorObjects = [...tutorMap.values()].map((entry) => ({
      id: entry.id,
      name: entry.name,
      roles: [...entry.roles],
      courses: entry.courses
    }));
    const profiles = new Map(Workload.buildProfiles(tutorObjects, ictWeights).map((profile) => [profile.tutorId, profile]));

    const tutors = tutorObjects.map((tutor) => {
      const profile = profiles.get(tutor.id);
      const raw = profile?.raw || Workload.rawMetrics(tutor);
      return {
        id: tutor.id,
        name: tutor.name,
        roles: tutor.roles,
        uniqueStudents: raw.uniqueStudents,
        enrollments: raw.enrollments,
        moodleCourses: raw.moodleCourses,
        institutionalCourses: raw.institutionalCourses,
        classes: raw.classes,
        curriculumUnits: raw.curriculumUnits,
        modalities: raw.modalities,
        quantitativeScore: profile?.quantitative?.score || 0,
        complexityScore: profile?.complexity?.score || 0,
        ict: profile?.ict || 0,
        ictClass: Workload.classifyIct(profile?.ict || 0)
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

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
      ictWeights: ictWeights || Workload.DEFAULT_WEIGHTS,
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

  async function save(snapshot, retentionDays, ictWeights) {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const key = `gestaoTutoresHistory:${snapshot.host}`;
    const stored = await chrome.storage.local.get(key);
    const entry = buildHistoryEntry(snapshot, ictWeights);
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
