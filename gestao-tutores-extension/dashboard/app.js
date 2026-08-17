(() => {
  "use strict";

  const Core = globalThis.GestaoTutoresCore;
  const SUPPORTED_HOSTS = ["ead.fieg.com.br", "ead.senai.br"];

  const state = {
    host: "",
    snapshot: null,
    model: null,
    tab: "executive",
    tutorSearch: "",
    tutorModality: "",
    tutorLoad: "",
    courseSearch: "",
    courseModality: "",
    courseTutorStatus: "",
    courseConfidence: ""
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    status: $("#status-text"), environment: $("#environment-select"), collect: $("#btn-collect"),
    metrics: $("#metrics"), workloadMetrics: $("#workload-metrics"), baseHealth: $("#base-health"),
    priorityActions: $("#priority-actions"), loadChart: $("#load-chart"), modalitySummary: $("#modality-summary"),
    tutorSearch: $("#tutor-search"), tutorModality: $("#tutor-modality"), tutorLoad: $("#tutor-load"),
    tutorTable: $("#tutor-table-body"), tutorSummary: $("#tutor-result-summary"),
    courseSearch: $("#course-search"), courseModality: $("#course-modality"), courseTutorStatus: $("#course-tutor-status"),
    courseConfidence: $("#course-confidence"), courseTable: $("#course-table-body"), courseSummary: $("#course-result-summary"),
    qualityMetrics: $("#quality-metrics"), qualityTable: $("#quality-table-body"),
    progress: $("#collection-progress"), progressTitle: $("#progress-title"), progressCounter: $("#progress-counter"),
    progressBar: $("#progress-bar"), progressCourse: $("#progress-course"),
    dialog: $("#tutor-dialog"), dialogTitle: $("#dialog-title"), dialogContent: $("#dialog-content")
  };

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  }

  function formatDecimal(value) {
    return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  }

  function formatDate(iso) {
    if (!iso) return "Data não disponível";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));
  }

  function metricCard(label, value, small) {
    return `<article class="metric-card"><span>${Core.escapeHtml(label)}</span><strong>${Core.escapeHtml(value)}</strong><small>${Core.escapeHtml(small || "")}</small></article>`;
  }

  function tutorStats(tutor) {
    const courses = tutor.courses || [];
    const links = courses.reduce((sum, course) => sum + Number(course.enrollmentCount || 0), 0);
    return {
      courseCount: courses.length,
      enrollmentCount: links,
      uniqueStudents: (tutor.studentIds || []).length,
      modalities: Core.unique(courses.map((course) => course.modality)),
      avgPerCourse: courses.length ? links / courses.length : 0,
      roles: Core.unique(tutor.roles || [])
    };
  }

  function createCourseIssues(course) {
    const issues = [];
    const tutors = course.tutors || [];
    if (!tutors.length) issues.push({ severity: "warning", type: "Curso sem tutor identificado", detail: "Nenhum papel configurado como tutor foi encontrado." });
    if (tutors.length > 1) issues.push({ severity: "info", type: "Múltiplos tutores", detail: tutors.map((tutor) => tutor.name).join(", ") });
    if (course.modality === "Não identificada") issues.push({ severity: "info", type: "Modalidade não identificada", detail: "Nome, shortname e categoria não forneceram evidência suficiente." });
    if (course.confidence !== "alta") issues.push({ severity: "warning", type: `Confiança ${course.confidence || "baixa"}`, detail: "A leitura de participantes precisa de conferência." });
    if (course.paginationComplete === false) issues.push({ severity: "danger", type: "Paginação incompleta", detail: `${course.pagesRead || 0} de ${course.totalPagesDetected || 0} página(s) lida(s).` });
    if (!(course.studentIds || []).length) issues.push({ severity: "warning", type: "Nenhum aluno identificado", detail: "Não há IDs de estudantes válidos no snapshot do curso." });
    if (course.status === "Erro de leitura") issues.push({ severity: "danger", type: "Erro de leitura", detail: (course.warnings || ["Falha não especificada."])[0] });
    (course.warnings || []).forEach((warning) => {
      if (!issues.some((item) => Core.normalizeText(item.detail) === Core.normalizeText(warning))) {
        issues.push({ severity: "info", type: "Aviso do coletor", detail: warning });
      }
    });
    return issues;
  }

  function buildModel(snapshot) {
    const courses = snapshot.courses || [];
    const globalStudents = new Set();
    const tutorMap = new Map();
    const courseIssues = new Map();
    let totalEnrollments = 0;

    courses.forEach((course) => {
      const studentIds = Core.unique(course.studentIds || []);
      studentIds.forEach((id) => globalStudents.add(id));
      totalEnrollments += Number(course.enrollmentCount ?? studentIds.length);
      courseIssues.set(course.id, createCourseIssues(course));

      (course.tutors || []).forEach((tutor) => {
        const key = tutor.id || Core.normalizeText(`${tutor.name}|${tutor.email}`);
        if (!tutorMap.has(key)) {
          tutorMap.set(key, {
            id: key,
            name: tutor.name || "Tutor sem nome",
            email: tutor.email || "",
            roles: [],
            mixedManagement: false,
            courses: [],
            studentIds: new Set()
          });
        }
        const entry = tutorMap.get(key);
        entry.roles = Core.unique([...(entry.roles || []), ...(tutor.roles || [])]);
        entry.mixedManagement = Boolean(entry.mixedManagement || tutor.mixedManagement);
        if (!entry.email && tutor.email) entry.email = tutor.email;
        entry.courses.push(course);
        studentIds.forEach((id) => entry.studentIds.add(id));
      });
    });

    const tutors = [...tutorMap.values()].map((tutor) => ({ ...tutor, studentIds: [...tutor.studentIds] }));
    const loadStats = Core.distributionStats(tutors.map((tutor) => tutorStats(tutor).uniqueStudents));
    const allIssues = courses.flatMap((course) => (courseIssues.get(course.id) || []).map((issue) => ({ course, ...issue })));

    return {
      courses,
      tutors,
      courseIssues,
      allIssues,
      totalEnrollments,
      totalUniqueStudents: globalStudents.size,
      loadStats
    };
  }

  function globalIndicators() {
    const model = state.model;
    const snapshot = state.snapshot;
    const processed = Number(snapshot?.processedCourses || model?.courses.length || 0);
    const discovered = Number(snapshot?.discoveredCourses || processed);
    const withTutor = model.courses.filter((course) => (course.tutors || []).length > 0).length;
    const withModality = model.courses.filter((course) => course.modality && course.modality !== "Não identificada").length;
    const highConfidence = model.courses.filter((course) => course.confidence === "alta" && course.paginationComplete !== false).length;
    return {
      processed,
      discovered,
      coverage: Core.percent(processed, discovered),
      withTutor,
      tutorCoverage: Core.percent(withTutor, processed),
      withModality,
      modalityCoverage: Core.percent(withModality, processed),
      highConfidence,
      confidenceCoverage: Core.percent(highConfidence, processed)
    };
  }

  function qualityCounts() {
    const courses = state.model?.courses || [];
    return {
      noTutor: courses.filter((course) => !(course.tutors || []).length).length,
      multipleTutors: courses.filter((course) => (course.tutors || []).length > 1).length,
      unknownModality: courses.filter((course) => course.modality === "Não identificada").length,
      lowConfidence: courses.filter((course) => course.confidence !== "alta").length,
      incompletePagination: courses.filter((course) => course.paginationComplete === false).length,
      noStudents: courses.filter((course) => !(course.studentIds || []).length).length,
      errors: courses.filter((course) => course.status === "Erro de leitura").length,
      mixedManagementTutors: (state.model?.tutors || []).filter((tutor) => tutor.mixedManagement).length
    };
  }

  function renderGlobalMetrics() {
    const indicators = globalIndicators();
    const model = state.model;
    els.metrics.innerHTML = [
      metricCard("Tutores identificados", formatNumber(model.tutors.length), "Papéis compatíveis"),
      metricCard("Cursos Moodle", `${formatNumber(indicators.processed)} / ${formatNumber(indicators.discovered)}`, "Processados / descobertos"),
      metricCard("Alunos únicos", formatNumber(model.totalUniqueStudents), "Deduplicados por ID Moodle"),
      metricCard("Vínculos aluno x curso", formatNumber(model.totalEnrollments), "Não equivale a alunos únicos"),
      metricCard("Cobertura da coleta", `${indicators.coverage}%`, "Cursos processados"),
      metricCard("Cursos com tutor", `${indicators.tutorCoverage}%`, `${indicators.withTutor} curso(s)`),
      metricCard("Modalidade identificada", `${indicators.modalityCoverage}%`, `${indicators.withModality} curso(s)`),
      metricCard("Leitura de alta confiança", `${indicators.confidenceCoverage}%`, `${indicators.highConfidence} curso(s)`)
    ].join("");
  }

  function renderBaseHealth() {
    const indicators = globalIndicators();
    const quality = qualityCounts();
    let tone = "good";
    let title = "Base adequada para análise preliminar";
    let text = "A cobertura está completa e os principais indicadores de qualidade não apresentam bloqueios relevantes.";

    if (indicators.coverage < 100 || quality.incompletePagination > 0) {
      tone = "danger";
      title = "Base incompleta para decisão definitiva";
      text = "Existem cursos não processados ou páginas de participantes não lidas integralmente. Use os resultados apenas como diagnóstico até completar a coleta.";
    } else if (quality.noTutor > 0 || quality.lowConfidence > 0 || indicators.modalityCoverage < 80) {
      tone = "warning";
      title = "Base completa, mas precisa de validação";
      text = "A coleta terminou, porém ainda existem lacunas de papéis, modalidade ou confiança que podem afetar comparações de carga.";
    }

    els.baseHealth.innerHTML = `<div class="health-card health-${tone}"><strong>${Core.escapeHtml(title)}</strong><p>${Core.escapeHtml(text)}</p><small>Critério analítico interno, não representa regra institucional.</small></div>`;
  }

  function renderPriorityActions() {
    const indicators = globalIndicators();
    const quality = qualityCounts();
    const critical = state.model.tutors.filter((tutor) => Core.classifyLoad(tutorStats(tutor).uniqueStudents, state.model.loadStats) === "Crítica").length;
    const actions = [];
    if (indicators.coverage < 100) actions.push(["danger", "Completar a coleta", `${indicators.discovered - indicators.processed} curso(s) descoberto(s) ainda não foram processados.`]);
    if (quality.incompletePagination) actions.push(["danger", "Resolver paginação", `${quality.incompletePagination} curso(s) têm leitura parcial de participantes.`]);
    if (quality.noTutor) actions.push(["warning", "Revisar cursos sem tutor", `${quality.noTutor} curso(s) não possuem tutor reconhecido.`]);
    if (quality.lowConfidence) actions.push(["warning", "Validar papéis e participantes", `${quality.lowConfidence} curso(s) não atingiram confiança alta.`]);
    if (quality.unknownModality) actions.push(["info", "Melhorar classificação de modalidade", `${quality.unknownModality} curso(s) permanecem sem modalidade identificada.`]);
    if (quality.mixedManagementTutors) actions.push(["info", "Validar papéis mistos", `${quality.mixedManagementTutors} tutor(es) também possuem papel de gestão.`]);
    if (quality.multipleTutors) actions.push(["info", "Conferir múltiplos tutores", `${quality.multipleTutors} curso(s) possuem mais de um tutor reconhecido.`]);
    if (critical) actions.push(["warning", "Analisar concentração de carga", `${critical} tutor(es) aparecem como outlier crítico na distribuição atual.`]);

    els.priorityActions.innerHTML = actions.length
      ? actions.map(([tone, title, text]) => `<article class="priority priority-${tone}"><strong>${Core.escapeHtml(title)}</strong><span>${Core.escapeHtml(text)}</span></article>`).join("")
      : '<p class="empty">Nenhuma ação prioritária identificada.</p>';
  }

  function renderWorkload() {
    const stats = state.model.loadStats;
    const critical = state.model.tutors.filter((tutor) => Core.classifyLoad(tutorStats(tutor).uniqueStudents, stats) === "Crítica").length;
    els.workloadMetrics.innerHTML = [
      metricCard("Mediana de alunos", formatNumber(Math.round(stats.median)), "Referência robusta"),
      metricCard("Média de alunos", formatNumber(Math.round(stats.average)), "Pode ser afetada por extremos"),
      metricCard("Maior carga", formatNumber(stats.max), "Alunos únicos"),
      metricCard("Menor carga", formatNumber(stats.min), "Alunos únicos"),
      metricCard("Carga crítica", formatNumber(critical), "Outliers acima da distribuição")
    ].join("");
  }

  function loadBadge(label) {
    const safe = Core.escapeHtml(label);
    return `<span class="load-badge load-${Core.normalizeText(label).replace(/\s/g, "-")}">${safe}</span>`;
  }

  function renderLoadChart() {
    const stats = state.model.loadStats;
    const ranked = state.model.tutors.map((tutor) => ({ tutor, stats: tutorStats(tutor) })).sort((a, b) => b.stats.uniqueStudents - a.stats.uniqueStudents);
    const max = Math.max(...ranked.map((item) => item.stats.uniqueStudents), 1);
    els.loadChart.innerHTML = ranked.length
      ? ranked.slice(0, 20).map(({ tutor, stats: tutorData }) => {
          const classification = Core.classifyLoad(tutorData.uniqueStudents, stats);
          return `<button class="bar-row" type="button" data-tutor-id="${Core.escapeHtml(tutor.id)}"><span class="bar-label">${Core.escapeHtml(tutor.name)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(3, Math.round(tutorData.uniqueStudents / max * 100))}%"></span></span><strong>${formatNumber(tutorData.uniqueStudents)}</strong><span>${loadBadge(classification)}</span></button>`;
        }).join("")
      : '<p class="empty">Nenhum tutor identificado.</p>';
  }

  function renderModalities() {
    const counts = state.model.courses.reduce((acc, course) => {
      const key = course.modality || "Não identificada";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const total = Math.max(state.model.courses.length, 1);
    els.modalitySummary.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([modality, count]) => `<div class="modality-item"><div><strong>${Core.escapeHtml(modality)}</strong><span>${formatNumber(count)} curso(s)</span></div><strong>${Core.percent(count, total)}%</strong></div>`).join("") || '<p class="empty">Sem dados.</p>';
  }

  function availableModalities() {
    return Core.unique((state.model?.courses || []).map((course) => course.modality)).sort();
  }

  function populateFilter(select, values, current) {
    select.innerHTML = '<option value="">Todas</option>' + values.map((value) => `<option value="${Core.escapeHtml(value)}">${Core.escapeHtml(value)}</option>`).join("");
    select.value = values.includes(current) ? current : "";
  }

  function filteredTutors() {
    const query = Core.normalizeText(state.tutorSearch);
    const loadStats = state.model.loadStats;
    return state.model.tutors.filter((tutor) => {
      const stats = tutorStats(tutor);
      const haystack = Core.normalizeText([tutor.name, tutor.email, ...(tutor.roles || []), ...tutor.courses.flatMap((course) => [course.name, course.shortname, course.modality])].join(" "));
      const matchesSearch = !query || haystack.includes(query);
      const matchesModality = !state.tutorModality || stats.modalities.includes(state.tutorModality);
      const matchesLoad = !state.tutorLoad || Core.classifyLoad(stats.uniqueStudents, loadStats) === state.tutorLoad;
      return matchesSearch && matchesModality && matchesLoad;
    });
  }

  function renderTutorTable() {
    const tutors = filteredTutors();
    const loadStats = state.model.loadStats;
    els.tutorTable.innerHTML = tutors.length ? tutors.map((tutor) => {
      const stats = tutorStats(tutor);
      const classification = Core.classifyLoad(stats.uniqueStudents, loadStats);
      const management = tutor.mixedManagement ? '<span class="flag">Papel misto de gestão</span>' : "";
      return `<tr><td><strong>${Core.escapeHtml(tutor.name)}</strong>${tutor.email ? `<br><small>${Core.escapeHtml(tutor.email)}</small>` : ""}${management}</td><td>${Core.escapeHtml(stats.roles.join(", ") || "Não identificado")}</td><td>${stats.courseCount}</td><td>${formatNumber(stats.enrollmentCount)}</td><td>${formatNumber(stats.uniqueStudents)}</td><td>${Core.escapeHtml(stats.modalities.join(", ") || "Não identificada")}</td><td>${formatDecimal(stats.avgPerCourse)}</td><td>${loadBadge(classification)}</td><td><button type="button" class="link-button" data-tutor-id="${Core.escapeHtml(tutor.id)}">Detalhes</button></td></tr>`;
    }).join("") : '<tr><td colspan="9" class="empty-cell">Nenhum tutor encontrado para o recorte atual.</td></tr>';
    els.tutorSummary.textContent = `${tutors.length} de ${state.model.tutors.length} tutor(es) no recorte atual.`;
  }

  function courseTutorStatus(course) {
    const count = (course.tutors || []).length;
    if (!count) return "none";
    if (count > 1) return "multiple";
    return "single";
  }

  function filteredCourses() {
    const query = Core.normalizeText(state.courseSearch);
    return state.model.courses.filter((course) => {
      const haystack = Core.normalizeText([course.name, course.shortname, course.modality, ...(course.categoryPath || []), ...(course.tutors || []).flatMap((tutor) => [tutor.name, ...(tutor.roles || [])])].join(" "));
      return (!query || haystack.includes(query))
        && (!state.courseModality || course.modality === state.courseModality)
        && (!state.courseTutorStatus || courseTutorStatus(course) === state.courseTutorStatus)
        && (!state.courseConfidence || course.confidence === state.courseConfidence);
    });
  }

  function renderCourseTable() {
    const courses = filteredCourses();
    els.courseTable.innerHTML = courses.length ? courses.map((course) => {
      const tutors = (course.tutors || []).map((tutor) => tutor.name).join(", ") || "Sem tutor identificado";
      const issues = state.model.courseIssues.get(course.id) || [];
      const category = (course.categoryPath || []).join(" › ") || "Não identificada";
      const pages = course.totalPagesDetected ? `${course.pagesRead || 0}/${course.totalPagesDetected}` : "0";
      return `<tr><td><strong>${Core.escapeHtml(course.name)}</strong>${course.shortname ? `<br><small>${Core.escapeHtml(course.shortname)}</small>` : ""}</td><td>${Core.escapeHtml(tutors)}</td><td>${formatNumber(course.enrollmentCount || 0)}</td><td>${Core.escapeHtml(course.modality || "Não identificada")}</td><td>${Core.escapeHtml(category)}</td><td><span class="confidence confidence-${Core.normalizeText(course.confidence)}">${Core.escapeHtml(course.confidence || "baixa")}</span></td><td>${Core.escapeHtml(pages)}</td><td>${issues.length}</td><td><a class="link-button" href="${Core.escapeHtml(course.url)}" target="_blank" rel="noopener">Abrir Moodle</a></td></tr>`;
    }).join("") : '<tr><td colspan="9" class="empty-cell">Nenhum curso encontrado para o recorte atual.</td></tr>';
    els.courseSummary.textContent = `${courses.length} de ${state.model.courses.length} curso(s) Moodle no recorte atual.`;
  }

  function renderQuality() {
    const quality = qualityCounts();
    els.qualityMetrics.innerHTML = [
      metricCard("Sem tutor", formatNumber(quality.noTutor), "Cursos Moodle"),
      metricCard("Múltiplos tutores", formatNumber(quality.multipleTutors), "Exigem conferência"),
      metricCard("Modalidade desconhecida", formatNumber(quality.unknownModality), "Cursos Moodle"),
      metricCard("Confiança abaixo de alta", formatNumber(quality.lowConfidence), "Leitura parcial ou aproximada"),
      metricCard("Paginação incompleta", formatNumber(quality.incompletePagination), "Bloqueador de contagem"),
      metricCard("Sem alunos", formatNumber(quality.noStudents), "IDs não identificados"),
      metricCard("Erros de leitura", formatNumber(quality.errors), "Falhas técnicas")
    ].join("");

    const severityOrder = { danger: 0, warning: 1, info: 2 };
    const issues = [...state.model.allIssues].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) || a.course.name.localeCompare(b.course.name));
    els.qualityTable.innerHTML = issues.length ? issues.slice(0, 1500).map((item) => `<tr><td><strong>${Core.escapeHtml(item.course.name)}</strong></td><td><span class="severity severity-${item.severity}">${Core.escapeHtml(item.severity)}</span></td><td>${Core.escapeHtml(item.type)}</td><td>${Core.escapeHtml(item.detail)}</td><td><a class="link-button" href="${Core.escapeHtml(item.course.url)}" target="_blank" rel="noopener">Abrir</a></td></tr>`).join("") : '<tr><td colspan="5" class="empty-cell">Nenhum problema identificado.</td></tr>';
  }

  function renderAll() {
    if (!state.model) return;
    renderGlobalMetrics();
    renderBaseHealth();
    renderPriorityActions();
    renderWorkload();
    renderLoadChart();
    renderModalities();
    populateFilter(els.tutorModality, availableModalities(), state.tutorModality);
    populateFilter(els.courseModality, availableModalities(), state.courseModality);
    renderTutorTable();
    renderCourseTable();
    renderQuality();
  }

  function showSnapshot(snapshot) {
    state.snapshot = snapshot;
    state.host = snapshot.host;
    state.model = buildModel(snapshot);
    els.environment.value = snapshot.host;
    els.status.className = "status-ok";
    els.status.textContent = `${snapshot.environment || snapshot.host} | coleta de ${formatDate(snapshot.collectedAt)} | ${snapshot.processedCourses || 0} curso(s) processado(s)`;
    renderAll();
  }

  function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message)); else resolve(response);
      });
    });
  }

  async function findMoodleTab() {
    const preferred = state.host || els.environment.value;
    const patterns = preferred ? [`https://${preferred}/*`] : SUPPORTED_HOSTS.map((host) => `https://${host}/*`);
    const tabs = await chrome.tabs.query({ url: patterns });
    if (!tabs.length) throw new Error("Nenhuma aba do Moodle selecionado está aberta. Abra o Moodle autenticado e tente novamente.");
    return [...tabs].sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }

  async function collect() {
    els.collect.disabled = true;
    els.progress.classList.remove("hidden");
    els.progressTitle.textContent = "Coletando todos os cursos disponíveis";
    els.progressCounter.textContent = "Preparando";
    els.progressBar.style.width = "2%";
    els.progressCourse.textContent = "Localizando o Moodle autenticado...";
    try {
      const tab = await findMoodleTab();
      const response = await sendMessageToTab(tab.id, { type: "GESTAO_TUTORES_COLLECT" });
      if (!response?.ok) throw new Error(response?.error || "Falha não identificada na coleta.");
      await refreshEnvironmentOptions(response.snapshot.host);
      showSnapshot(response.snapshot);
      els.progressBar.style.width = "100%";
      els.progressCounter.textContent = "Concluído";
      els.progressCourse.textContent = `Coleta concluída em ${Math.round((response.snapshot.durationMs || 0) / 1000)} s.`;
      setTimeout(() => els.progress.classList.add("hidden"), 1800);
    } catch (error) {
      els.status.className = "status-error";
      els.status.textContent = error.message;
      els.progressTitle.textContent = "Falha na coleta";
      els.progressCourse.textContent = error.message;
    } finally {
      els.collect.disabled = false;
    }
  }

  async function loadSnapshot(host) {
    if (!host) return;
    const stored = await chrome.storage.local.get(`gestaoTutoresSnapshot:${host}`);
    const snapshot = stored[`gestaoTutoresSnapshot:${host}`];
    if (snapshot) showSnapshot(snapshot);
    else {
      state.host = host;
      state.snapshot = null;
      state.model = null;
      els.status.className = "";
      els.status.textContent = `Ainda não há coleta salva para ${host}.`;
      els.metrics.innerHTML = "";
    }
  }

  async function refreshEnvironmentOptions(preferredHost) {
    const stored = await chrome.storage.local.get(["gestaoTutoresHosts", "gestaoTutoresLastHost"]);
    const hosts = Core.unique([...(stored.gestaoTutoresHosts || []), ...SUPPORTED_HOSTS]);
    els.environment.innerHTML = hosts.map((host) => `<option value="${Core.escapeHtml(host)}">${host === "ead.fieg.com.br" ? "Moodle Goiás" : host === "ead.senai.br" ? "Moodle CTM GO" : Core.escapeHtml(host)}</option>`).join("");
    const selected = preferredHost || stored.gestaoTutoresLastHost || hosts[0] || "";
    els.environment.value = selected;
    state.host = selected;
  }

  function openTutor(tutorId) {
    const tutor = state.model?.tutors.find((item) => item.id === tutorId);
    if (!tutor) return;
    const stats = tutorStats(tutor);
    const classification = Core.classifyLoad(stats.uniqueStudents, state.model.loadStats);
    els.dialogTitle.textContent = tutor.name;
    els.dialogContent.innerHTML = `<section class="dialog-metrics">${metricCard("Cursos Moodle", stats.courseCount, "Vínculos do tutor")}${metricCard("Vínculos", formatNumber(stats.enrollmentCount), "Aluno x curso")}${metricCard("Alunos únicos", formatNumber(stats.uniqueStudents), "Deduplicados")}${metricCard("Carga", classification, "Comparação estatística")}</section>${tutor.mixedManagement ? '<p class="notice warning">Este tutor também possui papel de gestão. Valide o vínculo antes de usar a carga para redistribuição.</p>' : ""}<p class="notice">Papéis encontrados: ${Core.escapeHtml(stats.roles.join(", ") || "Não identificados")}</p><div class="table-wrap"><table><thead><tr><th>Curso Moodle</th><th>Modalidade</th><th>Vínculos</th><th>Confiança</th><th></th></tr></thead><tbody>${tutor.courses.map((course) => `<tr><td><strong>${Core.escapeHtml(course.name)}</strong></td><td>${Core.escapeHtml(course.modality)}</td><td>${formatNumber(course.enrollmentCount || 0)}</td><td>${Core.escapeHtml(course.confidence || "baixa")}</td><td><a class="link-button" href="${Core.escapeHtml(course.url)}" target="_blank" rel="noopener">Abrir Moodle</a></td></tr>`).join("")}</tbody></table></div>`;
    els.dialog.showModal();
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map(Core.csvEscape).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportTutors() {
    const rows = [["Tutor", "Email", "Papeis", "Cursos Moodle", "Vinculos aluno x curso", "Alunos unicos", "Modalidades", "Carga", "Papel misto de gestao"]];
    filteredTutors().forEach((tutor) => {
      const stats = tutorStats(tutor);
      rows.push([tutor.name, tutor.email, stats.roles.join(", "), stats.courseCount, stats.enrollmentCount, stats.uniqueStudents, stats.modalities.join(", "), Core.classifyLoad(stats.uniqueStudents, state.model.loadStats), tutor.mixedManagement ? "Sim" : "Não"]);
    });
    downloadCsv(`gestao-tutores-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportCourses() {
    const rows = [["ID Moodle", "Curso Moodle", "Shortname", "Categoria", "Modalidade", "Tutores", "Papeis", "Vinculos aluno x curso", "Confianca", "Paginas lidas", "Paginas detectadas", "Alertas", "URL"]];
    filteredCourses().forEach((course) => rows.push([course.id, course.name, course.shortname, (course.categoryPath || []).join(" > "), course.modality, (course.tutors || []).map((tutor) => tutor.name).join(", "), (course.tutors || []).flatMap((tutor) => tutor.roles || []).join(", "), course.enrollmentCount || 0, course.confidence, course.pagesRead || 0, course.totalPagesDetected || 0, (state.model.courseIssues.get(course.id) || []).length, course.url]));
    downloadCsv(`cursos-moodle-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportQuality() {
    const rows = [["Curso Moodle", "Severidade", "Problema", "Detalhe", "URL"]];
    state.model.allIssues.forEach((item) => rows.push([item.course.name, item.severity, item.type, item.detail, item.course.url]));
    downloadCsv(`qualidade-dados-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      state.tab = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item.dataset.tab === state.tab));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${state.tab}`));
      return;
    }
    const tutor = event.target.closest("[data-tutor-id]");
    if (tutor) openTutor(tutor.dataset.tutorId);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "GESTAO_TUTORES_PROGRESS") return;
    const progress = message.progress || {};
    const total = Math.max(Number(progress.total || 0), 1);
    const current = Number(progress.current || 0);
    els.progress.classList.remove("hidden");
    els.progressCounter.textContent = `${current}/${total}`;
    els.progressBar.style.width = `${Math.max(2, Math.round(current / total * 100))}%`;
    els.progressCourse.textContent = progress.course || "Processando...";
  });

  els.collect.addEventListener("click", collect);
  els.environment.addEventListener("change", () => { state.host = els.environment.value; loadSnapshot(state.host).catch(console.error); });
  els.tutorSearch.addEventListener("input", (event) => { state.tutorSearch = event.target.value; renderTutorTable(); });
  els.tutorModality.addEventListener("change", (event) => { state.tutorModality = event.target.value; renderTutorTable(); });
  els.tutorLoad.addEventListener("change", (event) => { state.tutorLoad = event.target.value; renderTutorTable(); });
  $("#btn-reset-tutors").addEventListener("click", () => { state.tutorSearch = ""; state.tutorModality = ""; state.tutorLoad = ""; els.tutorSearch.value = ""; els.tutorModality.value = ""; els.tutorLoad.value = ""; renderTutorTable(); });
  $("#btn-export-tutors").addEventListener("click", exportTutors);
  els.courseSearch.addEventListener("input", (event) => { state.courseSearch = event.target.value; renderCourseTable(); });
  els.courseModality.addEventListener("change", (event) => { state.courseModality = event.target.value; renderCourseTable(); });
  els.courseTutorStatus.addEventListener("change", (event) => { state.courseTutorStatus = event.target.value; renderCourseTable(); });
  els.courseConfidence.addEventListener("change", (event) => { state.courseConfidence = event.target.value; renderCourseTable(); });
  $("#btn-reset-courses").addEventListener("click", () => { state.courseSearch = ""; state.courseModality = ""; state.courseTutorStatus = ""; state.courseConfidence = ""; els.courseSearch.value = ""; els.courseModality.value = ""; els.courseTutorStatus.value = ""; els.courseConfidence.value = ""; renderCourseTable(); });
  $("#btn-export-courses").addEventListener("click", exportCourses);
  $("#btn-export-quality").addEventListener("click", exportQuality);

  (async function init() {
    try {
      await refreshEnvironmentOptions();
      await loadSnapshot(state.host);
    } catch (error) {
      els.status.className = "status-error";
      els.status.textContent = `Não foi possível inicializar a dashboard: ${error.message}`;
    }
  })();
})();
