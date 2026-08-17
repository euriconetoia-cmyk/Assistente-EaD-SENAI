(() => {
  "use strict";

  const DEFAULTS = globalThis.GestaoTutoresDefaults.SETTINGS;
  const els = {
    maxCourses: document.querySelector("#max-courses"),
    maxCategoryPages: document.querySelector("#max-category-pages"),
    maxPages: document.querySelector("#max-pages"),
    concurrency: document.querySelector("#concurrency"),
    tutors: document.querySelector("#tutor-patterns"),
    students: document.querySelector("#student-patterns"),
    management: document.querySelector("#management-patterns"),
    staff: document.querySelector("#staff-patterns"),
    modalities: document.querySelector("#modality-rules"),
    save: document.querySelector("#save"),
    reset: document.querySelector("#reset"),
    status: document.querySelector("#status")
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

  function fill(settings) {
    els.maxCourses.value = settings.maxCourses;
    els.maxCategoryPages.value = settings.maxCategoryPages;
    els.maxPages.value = settings.maxPagesPerCourse;
    els.concurrency.value = settings.courseConcurrency;
    els.tutors.value = settings.tutorRolePatterns.join("\n");
    els.students.value = settings.studentRolePatterns.join("\n");
    els.management.value = settings.managementRolePatterns.join("\n");
    els.staff.value = settings.staffRolePatterns.join("\n");
    els.modalities.value = modalityRulesToText(settings.modalityRules);
  }

  function setStatus(text, isError = false) {
    els.status.textContent = text;
    els.status.className = isError ? "status-error" : "saved";
    if (!isError) setTimeout(() => { els.status.textContent = ""; els.status.className = ""; }, 2200);
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  async function load() {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    fill({ ...DEFAULTS, ...(stored.gestaoTutoresSettings || {}) });
  }

  async function save() {
    const modalityRules = parseModalityRules(els.modalities.value);
    const settings = {
      maxCourses: clamp(els.maxCourses.value, 1, 1000, DEFAULTS.maxCourses),
      maxCategoryPages: clamp(els.maxCategoryPages.value, 1, 1000, DEFAULTS.maxCategoryPages),
      maxPagesPerCourse: clamp(els.maxPages.value, 1, 500, DEFAULTS.maxPagesPerCourse),
      courseConcurrency: clamp(els.concurrency.value, 1, 8, DEFAULTS.courseConcurrency),
      tutorRolePatterns: lines(els.tutors.value),
      studentRolePatterns: lines(els.students.value),
      managementRolePatterns: lines(els.management.value),
      staffRolePatterns: lines(els.staff.value),
      modalityRules
    };

    if (!settings.tutorRolePatterns.length) return setStatus("Informe ao menos um papel de tutor.", true);
    if (!settings.studentRolePatterns.length) return setStatus("Informe ao menos um papel de estudante.", true);
    if (!settings.modalityRules.length) return setStatus("Informe ao menos uma regra válida de modalidade.", true);

    await chrome.storage.local.set({ gestaoTutoresSettings: settings });
    fill(settings);
    setStatus("Configurações salvas.");
  }

  async function reset() {
    await chrome.storage.local.set({ gestaoTutoresSettings: DEFAULTS });
    fill(DEFAULTS);
    setStatus("Padrão restaurado.");
  }

  els.save.addEventListener("click", () => save().catch((error) => setStatus(error.message, true)));
  els.reset.addEventListener("click", () => reset().catch((error) => setStatus(error.message, true)));
  load().catch((error) => setStatus(error.message, true));
})();
