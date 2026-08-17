(() => {
  "use strict";

  const Core = globalThis.GestaoTutoresCore;
  const environment = document.querySelector("#environment-select");
  const metrics = document.querySelector("#monitor-metrics");
  const table = document.querySelector("#monitor-table-body");
  const summary = document.querySelector("#monitor-result-summary");
  const globalMetrics = document.querySelector("#metrics");

  if (!Core || !environment || !metrics || !table || !summary) return;

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  }

  function metricCard(label, value, small) {
    return `<article class="metric-card"><span>${Core.escapeHtml(label)}</span><strong>${Core.escapeHtml(value)}</strong><small>${Core.escapeHtml(small || "")}</small></article>`;
  }

  function aggregate(snapshot) {
    const map = new Map();
    (snapshot?.courses || []).forEach((course) => {
      (course.monitors || []).forEach((monitor) => {
        const key = monitor.id || Core.normalizeText(`${monitor.name}|${monitor.email}`);
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: monitor.name || "Monitor sem nome",
            email: monitor.email || "",
            roles: [],
            courses: [],
            mixedTutorMonitor: false,
            mixedManagement: false
          });
        }
        const entry = map.get(key);
        entry.roles = Core.unique([...(entry.roles || []), ...(monitor.roles || [])]);
        entry.mixedTutorMonitor = Boolean(entry.mixedTutorMonitor || monitor.mixedTutorMonitor);
        entry.mixedManagement = Boolean(entry.mixedManagement || monitor.mixedManagement);
        if (!entry.email && monitor.email) entry.email = monitor.email;
        entry.courses.push(course);
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  function ensureGlobalMonitorCard(count) {
    if (!globalMetrics) return;
    globalMetrics.querySelector("[data-monitor-kpi]")?.remove();
    const card = document.createElement("article");
    card.className = "metric-card";
    card.dataset.monitorKpi = "true";
    card.innerHTML = `<span>Monitores identificados</span><strong>${formatNumber(count)}</strong><small>Papéis CTM/GO reconhecidos</small>`;
    globalMetrics.appendChild(card);
  }

  async function load() {
    const host = environment.value;
    if (!host) return;
    const stored = await chrome.storage.local.get(`gestaoTutoresSnapshot:${host}`);
    const snapshot = stored[`gestaoTutoresSnapshot:${host}`];
    const monitors = aggregate(snapshot);
    const coursesWithMonitor = new Set(monitors.flatMap((monitor) => monitor.courses.map((course) => course.id))).size;
    const mixed = monitors.filter((monitor) => monitor.mixedTutorMonitor).length;

    metrics.innerHTML = [
      metricCard("Monitores identificados", formatNumber(monitors.length), "Pessoas únicas"),
      metricCard("Cursos com monitor", formatNumber(coursesWithMonitor), "Cursos Moodle"),
      metricCard("Tutor + Monitor", formatNumber(mixed), "Papéis simultâneos")
    ].join("");

    table.innerHTML = monitors.length ? monitors.map((monitor) => {
      const courses = Core.unique(monitor.courses.map((course) => course.name));
      const flags = [
        monitor.mixedTutorMonitor ? '<span class="flag">Tutor + Monitor</span>' : "",
        monitor.mixedManagement ? '<span class="flag">Papel de gestão</span>' : ""
      ].filter(Boolean).join(" ");
      return `<tr><td><strong>${Core.escapeHtml(monitor.name)}</strong>${monitor.email ? `<br><small>${Core.escapeHtml(monitor.email)}</small>` : ""}${flags ? `<br>${flags}` : ""}</td><td>${Core.escapeHtml((monitor.roles || []).join(", ") || "Não identificado")}</td><td>${formatNumber(courses.length)}</td><td>${Core.escapeHtml(courses.slice(0, 8).join(", ") || "Sem curso")}${courses.length > 8 ? ` e mais ${courses.length - 8}` : ""}</td></tr>`;
    }).join("") : '<tr><td colspan="4" class="empty-cell">Nenhum monitor identificado nesta coleta.</td></tr>';

    summary.textContent = `${monitors.length} monitor(es) único(s) identificado(s) em ${coursesWithMonitor} curso(s).`;
    ensureGlobalMonitorCard(monitors.length);
  }

  environment.addEventListener("change", () => setTimeout(() => load().catch(console.error), 250));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const key = `gestaoTutoresSnapshot:${environment.value}`;
    if (changes[key]) setTimeout(() => load().catch(console.error), 250);
  });

  setTimeout(() => load().catch(console.error), 350);
})();
