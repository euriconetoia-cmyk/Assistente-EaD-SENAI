(() => {
  "use strict";

  const DEFAULTS = globalThis.GestaoTutoresDefaults.SETTINGS;
  const els = {
    maxCourses: document.querySelector("#max-courses"),
    maxCategoryPages: document.querySelector("#max-category-pages"),
    maxPages: document.querySelector("#max-pages"),
    concurrency: document.querySelector("#concurrency"),
    requestTimeout: document.querySelector("#request-timeout"),
    requestRetries: document.querySelector("#request-retries"),
    incrementalFreshness: document.querySelector("#incremental-freshness"),
    historyRetention: document.querySelector("#history-retention"),
    tutors: document.querySelector("#tutor-patterns"),
    students: document.querySelector("#student-patterns"),
    management: document.querySelector("#management-patterns"),
    staff: document.querySelector("#staff-patterns"),
    modalities: document.querySelector("#modality-rules"),
    exclusions: document.querySelector("#exclusion-patterns"),
    institutionalRules: document.querySelector("#institutional-rules"),
    ictQuantitative: document.querySelector("#ict-quantitative"),
    ictComplexity: document.querySelector("#ict-complexity"),
    ictStudents: document.querySelector("#ict-students"),
    ictEnrollments: document.querySelector("#ict-enrollments"),
    ictMoodleCourses: document.querySelector("#ict-moodle-courses"),
    ictInstitutionalCourses: document.querySelector("#ict-institutional-courses"),
    ictClasses: document.querySelector("#ict-classes"),
    ictUcs: document.querySelector("#ict-ucs"),
    ictModalities: document.querySelector("#ict-modalities"),
    save: document.querySelector("#save"),
    reset: document.querySelector("#reset"),
    status: document.querySelector("#status"),
    clearData: document.querySelector("#clear-data"),
    clearStatus: document.querySelector("#clear-status")
  };

  function lines(value) {
    return [...new Set(String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
  }

  function modalityRulesToText(rules) {
    return (rules || []).map((rule) => `${rule.label}=${(rule.terms || []).join("|")}`).join("\n");
  }

  function parseModalityRules(value) {
    const rules = [];
    lines(value).forEach((line) => {
      const separator = line.indexOf("=");
      if (separator <= 0) return;
      const label = line.slice(0, separator).trim();
      const terms = line.slice(separator + 1).split("|").map((term) => term.trim()).filter(Boolean);
      if (label && terms.length) rules.push({ label, terms: [...new Set(terms)] });
    });
    return rules;
  }

  function parseInstitutionalRules(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`JSON das regras institucionais inválido: ${error.message}`);
    }
    if (!Array.isArray(parsed)) throw new Error("As regras institucionais devem ser um array JSON.");
    const allowedTargets = new Set(["cursoInstitucional", "turma", "unidadeCurricular", "tipoEntidade"]);
    const allowedSources = new Set(["name", "shortname", "categoryPath", "categoryId"]);
    const allowedTypes = new Set(["contains", "regex"]);
    parsed.forEach((rule, index) => {
      if (!rule || !allowedTargets.has(rule.target) || !allowedSources.has(rule.source) || !allowedTypes.has(rule.type) || !String(rule.pattern || "").trim()) {
        throw new Error(`Regra institucional ${index + 1} possui estrutura inválida.`);
      }
    });
    return parsed;
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function mergeIctWeights(settings) {
    const base = DEFAULTS.ictWeights;
    const current = settings.ictWeights || {};
    return {
      quantitative: Number(current.quantitative ?? base.quantitative),
      complexity: Number(current.complexity ?? base.complexity),
      quantitativeComponents: { ...base.quantitativeComponents, ...(current.quantitativeComponents || {}) },
      complexityComponents: { ...base.complexityComponents, ...(current.complexityComponents || {}) }
    };
  }

  function fill(settings) {
    const ict = mergeIctWeights(settings);
    els.maxCourses.value = settings.maxCourses;
    els.maxCategoryPages.value = settings.maxCategoryPages;
    els.maxPages.value = settings.maxPagesPerCourse;
    els.concurrency.value = settings.courseConcurrency;
    els.requestTimeout.value = Math.round(Number(settings.requestTimeoutMs || DEFAULTS.requestTimeoutMs) / 1000);
    els.requestRetries.value = Number(settings.requestRetries ?? DEFAULTS.requestRetries);
    els.incrementalFreshness.value = Number(settings.incrementalFreshnessMinutes ?? DEFAULTS.incrementalFreshnessMinutes);
    els.historyRetention.value = Number(settings.historyRetentionDays ?? DEFAULTS.historyRetentionDays);
    els.tutors.value = (settings.tutorRolePatterns || []).join("\n");
    els.students.value = (settings.studentRolePatterns || []).join("\n");
    els.management.value = (settings.managementRolePatterns || []).join("\n");
    els.staff.value = (settings.staffRolePatterns || []).join("\n");
    els.modalities.value = modalityRulesToText(settings.modalityRules);
    els.exclusions.value = (settings.exclusionPatterns || []).join("\n");
    els.institutionalRules.value = JSON.stringify(settings.institutionalRules || [], null, 2);
    els.ictQuantitative.value = ict.quantitative;
    els.ictComplexity.value = ict.complexity;
    els.ictStudents.value = ict.quantitativeComponents.uniqueStudents;
    els.ictEnrollments.value = ict.quantitativeComponents.enrollments;
    els.ictMoodleCourses.value = ict.quantitativeComponents.moodleCourses;
    els.ictInstitutionalCourses.value = ict.complexityComponents.institutionalCourses;
    els.ictClasses.value = ict.complexityComponents.classes;
    els.ictUcs.value = ict.complexityComponents.curriculumUnits;
    els.ictModalities.value = ict.complexityComponents.modalities;
  }

  function setStatus(text, isError = false) {
    els.status.textContent = text;
    els.status.className = isError ? "status-error" : "saved";
    if (!isError) setTimeout(() => { els.status.textContent = ""; els.status.className = ""; }, 2500);
  }

  async function load() {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    fill({ ...DEFAULTS, ...(stored.gestaoTutoresSettings || {}) });
  }

  async function save() {
    const modalityRules = parseModalityRules(els.modalities.value);
    const institutionalRules = parseInstitutionalRules(els.institutionalRules.value);
    const settings = {
      maxCourses: clamp(els.maxCourses.value, 1, 1000, DEFAULTS.maxCourses),
      maxCategoryPages: clamp(els.maxCategoryPages.value, 1, 1000, DEFAULTS.maxCategoryPages),
      maxPagesPerCourse: clamp(els.maxPages.value, 1, 500, DEFAULTS.maxPagesPerCourse),
      courseConcurrency: clamp(els.concurrency.value, 1, 8, DEFAULTS.courseConcurrency),
      requestTimeoutMs: clamp(els.requestTimeout.value, 3, 120, DEFAULTS.requestTimeoutMs / 1000) * 1000,
      requestRetries: clamp(els.requestRetries.value, 0, 3, DEFAULTS.requestRetries),
      incrementalFreshnessMinutes: clamp(els.incrementalFreshness.value, 1, 240, DEFAULTS.incrementalFreshnessMinutes),
      historyRetentionDays: clamp(els.historyRetention.value, 1, 365, DEFAULTS.historyRetentionDays),
      tutorRolePatterns: lines(els.tutors.value),
      studentRolePatterns: lines(els.students.value),
      managementRolePatterns: lines(els.management.value),
      staffRolePatterns: lines(els.staff.value),
      modalityRules,
      exclusionPatterns: lines(els.exclusions.value),
      institutionalRules,
      ictWeights: {
        quantitative: clamp(els.ictQuantitative.value, 0, 100, DEFAULTS.ictWeights.quantitative),
        complexity: clamp(els.ictComplexity.value, 0, 100, DEFAULTS.ictWeights.complexity),
        quantitativeComponents: {
          uniqueStudents: clamp(els.ictStudents.value, 0, 100, DEFAULTS.ictWeights.quantitativeComponents.uniqueStudents),
          enrollments: clamp(els.ictEnrollments.value, 0, 100, DEFAULTS.ictWeights.quantitativeComponents.enrollments),
          moodleCourses: clamp(els.ictMoodleCourses.value, 0, 100, DEFAULTS.ictWeights.quantitativeComponents.moodleCourses)
        },
        complexityComponents: {
          institutionalCourses: clamp(els.ictInstitutionalCourses.value, 0, 100, DEFAULTS.ictWeights.complexityComponents.institutionalCourses),
          classes: clamp(els.ictClasses.value, 0, 100, DEFAULTS.ictWeights.complexityComponents.classes),
          curriculumUnits: clamp(els.ictUcs.value, 0, 100, DEFAULTS.ictWeights.complexityComponents.curriculumUnits),
          modalities: clamp(els.ictModalities.value, 0, 100, DEFAULTS.ictWeights.complexityComponents.modalities)
        }
      },
      rulesRevision: new Date().toISOString()
    };

    if (!settings.tutorRolePatterns.length) return setStatus("Informe ao menos um papel de tutor.", true);
    if (!settings.studentRolePatterns.length) return setStatus("Informe ao menos um papel de estudante.", true);
    if (!settings.modalityRules.length) return setStatus("Informe ao menos uma regra válida de modalidade.", true);
    if (settings.ictWeights.quantitative + settings.ictWeights.complexity <= 0) return setStatus("O ICT precisa de ao menos um peso geral maior que zero.", true);

    await chrome.storage.local.set({ gestaoTutoresSettings: settings });
    fill(settings);
    setStatus("Configurações salvas e nova revisão de regras criada.");
  }

  async function reset() {
    const settings = { ...DEFAULTS, rulesRevision: new Date().toISOString() };
    await chrome.storage.local.set({ gestaoTutoresSettings: settings });
    fill(settings);
    setStatus("Padrão restaurado e revisão atualizada.");
  }

  async function clearLocalData() {
    const stored = await chrome.storage.local.get(null);
    const keys = Object.keys(stored).filter((key) => key.startsWith("gestaoTutoresSnapshot:") || key.startsWith("gestaoTutoresHistory:"));
    keys.push("gestaoTutoresHosts", "gestaoTutoresLastHost");
    await chrome.storage.local.remove([...new Set(keys)]);
    els.clearStatus.textContent = "Coletas e histórico local removidos. As configurações foram preservadas.";
    setTimeout(() => { els.clearStatus.textContent = ""; }, 3500);
  }

  els.save.addEventListener("click", () => save().catch((error) => setStatus(error.message, true)));
  els.reset.addEventListener("click", () => reset().catch((error) => setStatus(error.message, true)));
  els.clearData.addEventListener("click", () => clearLocalData().catch((error) => { els.clearStatus.textContent = error.message; }));
  load().catch((error) => setStatus(error.message, true));
})();
