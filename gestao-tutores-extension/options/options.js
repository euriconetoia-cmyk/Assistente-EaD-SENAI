(() => {
  "use strict";

  const DEFAULTS = {
    maxCourses: 80,
    tutorRolePatterns: ["tutor", "tutor ead", "professor tutor", "docente tutor"],
    studentRolePatterns: ["estudante", "aluno", "student", "aprendiz"],
    staffRolePatterns: ["administrador", "manager", "coordenador", "coordenação", "professor", "teacher", "docente", "instrutor", "monitor", "tutor"]
  };

  const els = {
    maxCourses: document.querySelector("#max-courses"),
    tutors: document.querySelector("#tutor-patterns"),
    students: document.querySelector("#student-patterns"),
    staff: document.querySelector("#staff-patterns"),
    save: document.querySelector("#save"),
    reset: document.querySelector("#reset"),
    status: document.querySelector("#status")
  };

  function lines(value) {
    return [...new Set(String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
  }

  function fill(settings) {
    els.maxCourses.value = settings.maxCourses;
    els.tutors.value = settings.tutorRolePatterns.join("\n");
    els.students.value = settings.studentRolePatterns.join("\n");
    els.staff.value = settings.staffRolePatterns.join("\n");
  }

  function showStatus(text) {
    els.status.textContent = text;
    els.status.className = "saved";
    setTimeout(() => {
      els.status.textContent = "";
      els.status.className = "";
    }, 2200);
  }

  async function load() {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    fill({ ...DEFAULTS, ...(stored.gestaoTutoresSettings || {}) });
  }

  async function save() {
    const settings = {
      maxCourses: Math.min(500, Math.max(1, Number(els.maxCourses.value || DEFAULTS.maxCourses))),
      tutorRolePatterns: lines(els.tutors.value),
      studentRolePatterns: lines(els.students.value),
      staffRolePatterns: lines(els.staff.value)
    };

    if (!settings.tutorRolePatterns.length) {
      els.status.textContent = "Informe ao menos um papel de tutor.";
      els.status.className = "status-error";
      return;
    }

    await chrome.storage.local.set({ gestaoTutoresSettings: settings });
    fill(settings);
    showStatus("Configurações salvas.");
  }

  async function reset() {
    await chrome.storage.local.set({ gestaoTutoresSettings: DEFAULTS });
    fill(DEFAULTS);
    showStatus("Padrão restaurado.");
  }

  els.save.addEventListener("click", () => save().catch((error) => {
    els.status.textContent = error.message;
    els.status.className = "status-error";
  }));
  els.reset.addEventListener("click", () => reset().catch((error) => {
    els.status.textContent = error.message;
    els.status.className = "status-error";
  }));

  load().catch((error) => {
    els.status.textContent = error.message;
    els.status.className = "status-error";
  });
})();
