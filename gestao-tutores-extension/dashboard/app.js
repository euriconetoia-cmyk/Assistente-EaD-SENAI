(() => {
  "use strict";

  const state = {
    snapshot: null,
    model: null,
    search: "",
    modality: "",
    load: ""
  };

  const els = {
    status: document.querySelector("#status-text"),
    collect: document.querySelector("#btn-collect"),
    export: document.querySelector("#btn-export"),
    metrics: document.querySelector("#metrics"),
    search: document.querySelector("#filter-search"),
    modality: document.querySelector("#filter-modality"),
    load: document.querySelector("#filter-load"),
    reset: document.querySelector("#btn-reset"),
    loadChart: document.querySelector("#load-chart"),
    modalitySummary: document.querySelector("#modality-summary"),
    tutorTable: document.querySelector("#tutor-table-body"),
    resultSummary: document.querySelector("#result-summary"),
    diagnostics: document.querySelector("#diagnostics"),
    progress: document.querySelector("#collection-progress"),
    progressTitle: document.querySelector("#progress-title"),
    progressCounter: document.querySelector("#progress-counter"),
    progressBar: document.querySelector("#progress-bar"),
    progressCourse: document.querySelector("#progress-course"),
    dialog: document.querySelector("#tutor-dialog"),
    dialogTitle: document.querySelector("#dialog-title"),
    dialogContent: document.querySelector("#dialog-content")
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  }

  function formatDate(iso) {
    if (!iso) return "Data não disponível";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(response);
      });
    });
  }

  function buildModel(snapshot) {
    const tutorMap = new Map();
    const globalStudentIds = new Set();
    let enrollments = 0;

    (snapshot.courses || []).forEach((course) => {
      const students = course.students || [];
      const studentIds = students.map((student) => student.id).filter(Boolean);
      enrollments += studentIds.length;
      studentIds.forEach((id) => globalStudentIds.add(id));

      (course.tutors || []).forEach((tutor) => {
        const key = tutor.id || normalizeText(`${tutor.name}|${tutor.email}`);
        if (!tutorMap.has(key)) {
          tutorMap.set(key, {
            id: key,
            name: tutor.name || "Tutor sem nome",
            email: tutor.email || "",
            classes: [],
            studentIds: new Set()
          });
        }

        const entry = tutorMap.get(key);
        studentIds.forEach((id) => entry.studentIds.add(id));
        entry.classes.push({
          id: course.id,
          course: course.name,
          className: course.className || course.name,
          modality: course.modality || "Não identificada",
          status: course.status || "Não identificado",
          url: course.url,
          participantCount: course.participantCount || 0,
          enrollmentCount: studentIds.length,
          studentIds,
          confidence: course.confidence || "baixa",
          warnings: course.warnings || []
        });
      });
    });

    const tutors = [...tutorMap.values()].map((tutor) => ({
      ...tutor,
      studentIds: [...tutor.studentIds]
    }));

    return {
      snapshot,
      tutors,
      courses: snapshot.courses || [],
      totalEnrollments: enrollments,
      totalUniqueStudents: globalStudentIds.size
    };
  }

  function tutorStats(tutor) {
    const classes = tutor.classes || [];
    return {
      classCount: classes.length,
      courseCount: unique(classes.map((item) => item.course)).length,
      enrollmentCount: classes.reduce((sum, item) => sum + item.enrollmentCount, 0),
      uniqueStudents: (tutor.studentIds || []).length,
      modalities: unique(classes.map((item) => item.modality)),
      avgPerClass: classes.length ? classes.reduce((sum, item) => sum + item.enrollmentCount, 0) / classes.length : 0
    };
  }

  function getLoadClassification(value, average) {
    if (!average) return "Média";
    const ratio = value / average;
    if (ratio >= 1.25) return "Alta";
    if (ratio <= 0.75) return "Baixa";
    return "Média";
  }

  function getViewData() {
    if (!state.model) return { tutors: [], average: 0, allClasses: [] };
    const query = normalizeText(state.search);

    let tutors = state.model.tutors.map((tutor) => {
      const filteredClasses = tutor.classes.filter((item) => {
        const modalityMatches = !state.modality || item.modality === state.modality;
        const haystack = normalizeText(`${tutor.name} ${tutor.email} ${item.course} ${item.className} ${item.modality}`);
        const searchMatches = !query || haystack.includes(query);
        return modalityMatches && searchMatches;
      });

      return { ...tutor, classes: filteredClasses };
    }).filter((tutor) => tutor.classes.length);

    tutors = tutors.map((tutor) => {
      const studentIds = unique(tutor.classes.flatMap((item) => item.studentIds));
      return { ...tutor, studentIds };
    });

    const average = tutors.length
      ? tutors.reduce((sum, tutor) => sum + tutorStats(tutor).uniqueStudents, 0) / tutors.length
      : 0;

    if (state.load) {
      tutors = tutors.filter((tutor) => getLoadClassification(tutorStats(tutor).uniqueStudents, average) === state.load);
    }

    return {
      tutors,
      average,
      allClasses: tutors.flatMap((tutor) => tutor.classes)
    };
  }

  function renderMetrics() {
    if (!state.model) {
      els.metrics.innerHTML = "";
      return;
    }

    const cards = [
      ["Tutores identificados", state.model.tutors.length, "Papel compatível"],
      ["Cursos e turmas", state.model.courses.length, `${state.snapshot.discoveredCourses || 0} descobertos`],
      ["Matrículas", state.model.totalEnrollments, "Soma por curso"],
      ["Alunos únicos", state.model.totalUniqueStudents, "Deduplicados por ID"],
      ["Média por tutor", state.model.tutors.length ? Math.round(state.model.tutors.reduce((s, t) => s + tutorStats(t).uniqueStudents, 0) / state.model.tutors.length) : 0, "Alunos únicos"],
      ["Modalidades", unique(state.model.courses.map((course) => course.modality)).length, "Classificações encontradas"]
    ];

    els.metrics.innerHTML = cards.map(([label, value, small]) => `
      <article class="metric-card"><span>${escapeHtml(label)}</span><strong>${formatNumber(value)}</strong><small>${escapeHtml(small)}</small></article>
    `).join("");
  }

  function renderFilters() {
    if (!state.model) return;
    const current = els.modality.value;
    const modalities = unique(state.model.courses.map((course) => course.modality)).sort();
    els.modality.innerHTML = '<option value="">Todas</option>' + modalities.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
    els.modality.value = modalities.includes(current) ? current : "";
  }

  function renderLoadChart(view) {
    const ranked = view.tutors
      .map((tutor) => ({ tutor, stats: tutorStats(tutor) }))
      .sort((a, b) => b.stats.uniqueStudents - a.stats.uniqueStudents);
    const max = Math.max(...ranked.map((item) => item.stats.uniqueStudents), 1);

    els.loadChart.innerHTML = ranked.length ? ranked.map(({ tutor, stats }) => `
      <button class="bar-row" type="button" data-tutor-id="${escapeHtml(tutor.id)}">
        <span class="bar-label">${escapeHtml(tutor.name)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(4, Math.round(stats.uniqueStudents / max * 100))}%"></span></span>
        <strong class="bar-value">${formatNumber(stats.uniqueStudents)}</strong>
      </button>
    `).join("") : '<p class="empty">Nenhum tutor no filtro atual.</p>';
  }

  function renderModalities(view) {
    const counts = {};
    unique(view.allClasses.map((item) => `${item.id}|${item.modality}`)).forEach((key) => {
      const modality = key.split("|").slice(1).join("|") || "Não identificada";
      counts[modality] = (counts[modality] || 0) + 1;
    });
    const total = Math.max(Object.values(counts).reduce((a, b) => a + b, 0), 1);

    els.modalitySummary.innerHTML = Object.entries(counts).length ? Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([modality, count]) => `<div class="modality-item"><div><strong>${escapeHtml(modality)}</strong><span>${count} turma(s)</span></div><strong>${Math.round(count / total * 100)}%</strong></div>`).join("")
      : '<p class="empty">Nenhuma modalidade no filtro atual.</p>';
  }

  function renderTutorTable(view) {
    els.tutorTable.innerHTML = view.tutors.length ? view.tutors.map((tutor) => {
      const stats = tutorStats(tutor);
      const load = getLoadClassification(stats.uniqueStudents, view.average);
      return `<tr>
        <td><strong>${escapeHtml(tutor.name)}</strong>${tutor.email ? `<br><small>${escapeHtml(tutor.email)}</small>` : ""}</td>
        <td>${stats.classCount}</td><td>${stats.courseCount}</td><td>${formatNumber(stats.enrollmentCount)}</td><td>${formatNumber(stats.uniqueStudents)}</td>
        <td>${escapeHtml(stats.modalities.join(", ") || "Não identificada")}</td><td>${stats.avgPerClass.toFixed(1).replace(".", ",")}</td>
        <td><span class="load-badge load-${load}">${load}</span></td>
        <td><button class="link-button" type="button" data-tutor-id="${escapeHtml(tutor.id)}">Detalhes</button></td>
      </tr>`;
    }).join("") : '<tr><td colspan="9" class="empty-cell">Nenhum tutor encontrado para os filtros atuais.</td></tr>';

    els.resultSummary.textContent = `${view.tutors.length} tutor(es) no recorte atual.`;
  }

  function renderDiagnostics(view) {
    if (!state.model) return;
    const items = [];
    const courses = state.model.courses;

    if (state.snapshot.truncated) {
      items.push({ severity: "danger", title: "Coleta limitada", description: `${state.snapshot.processedCourses} de ${state.snapshot.discoveredCourses} cursos foram processados. Aumente o limite nas configurações antes de usar como relatório definitivo.` });
    }

    courses.forEach((course) => {
      if (!(course.tutors || []).length) items.push({ severity: "warning", title: "Turma sem tutor identificado", description: course.name });
      if ((course.tutors || []).length > 1) items.push({ severity: "info", title: "Mais de um tutor identificado", description: `${course.name}: ${course.tutors.map((tutor) => tutor.name).join(", ")}` });
      if (!(course.students || []).length) items.push({ severity: "warning", title: "Nenhum aluno identificado", description: course.name });
      if (course.modality === "Não identificada") items.push({ severity: "info", title: "Modalidade não identificada", description: course.name });
      if (course.confidence !== "alta") items.push({ severity: "warning", title: `Confiança ${course.confidence || "baixa"} na leitura`, description: course.name });
      (course.warnings || []).forEach((warning) => items.push({ severity: "info", title: course.name, description: warning }));
    });

    view.tutors.forEach((tutor) => {
      const stats = tutorStats(tutor);
      const load = getLoadClassification(stats.uniqueStudents, view.average);
      if (load === "Alta") items.push({ severity: "warning", title: "Carga acima da média do recorte", description: `${tutor.name}: ${formatNumber(stats.uniqueStudents)} alunos únicos em ${stats.classCount} turma(s).` });
      if (stats.modalities.length >= 3) items.push({ severity: "info", title: "Tutor em múltiplas modalidades", description: `${tutor.name}: ${stats.modalities.join(", ")}` });
    });

    els.diagnostics.innerHTML = items.length ? items.slice(0, 80).map((item) => `
      <article class="diagnostic-item diagnostic-${item.severity}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></article>
    `).join("") : '<p class="empty">Nenhuma inconsistência identificada.</p>';
  }

  function render() {
    if (!state.model) return;
    const view = getViewData();
    renderMetrics();
    renderFilters();
    renderLoadChart(view);
    renderModalities(view);
    renderTutorTable(view);
    renderDiagnostics(view);
    els.export.disabled = false;
  }

  function showSnapshot(snapshot) {
    state.snapshot = snapshot;
    state.model = buildModel(snapshot);
    els.status.className = "status-ok";
    els.status.textContent = `${snapshot.environment || snapshot.host} | coleta de ${formatDate(snapshot.collectedAt)} | ${snapshot.processedCourses || 0} curso(s) processado(s)`;
    render();
  }

  async function findMoodleTab() {
    const tabs = await chrome.tabs.query({ url: ["https://ead.senai.br/*", "https://ead.fieg.com.br/*"] });
    if (!tabs.length) throw new Error("Nenhuma aba do Moodle SENAI/FIEG está aberta. Abra o Moodle autenticado e tente novamente.");
    return [...tabs].sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }

  async function collect() {
    els.collect.disabled = true;
    els.export.disabled = true;
    els.progress.classList.remove("hidden");
    els.progressTitle.textContent = "Coletando dados do Moodle";
    els.progressCounter.textContent = "Preparando";
    els.progressBar.style.width = "3%";
    els.progressCourse.textContent = "Localizando uma aba autenticada...";
    els.status.className = "";
    els.status.textContent = "Coleta em andamento.";

    try {
      const tab = await findMoodleTab();
      const response = await sendMessageToTab(tab.id, { type: "GESTAO_TUTORES_COLLECT" });
      if (!response?.ok) throw new Error(response?.error || "Falha não identificada durante a coleta.");
      showSnapshot(response.snapshot);
      els.progressBar.style.width = "100%";
      els.progressCounter.textContent = "Concluído";
      els.progressCourse.textContent = `Coleta finalizada em ${Math.round((response.snapshot.durationMs || 0) / 1000)} s.`;
      setTimeout(() => els.progress.classList.add("hidden"), 1800);
    } catch (error) {
      els.status.className = "status-error";
      els.status.textContent = error.message;
      els.progressTitle.textContent = "Falha na coleta";
      els.progressCourse.textContent = error.message;
    } finally {
      els.collect.disabled = false;
      els.export.disabled = !state.model;
    }
  }

  function openTutor(tutorId) {
    if (!state.model) return;
    const tutor = state.model.tutors.find((item) => item.id === tutorId);
    if (!tutor) return;
    const stats = tutorStats(tutor);
    const allAverage = state.model.tutors.length ? state.model.tutors.reduce((sum, item) => sum + tutorStats(item).uniqueStudents, 0) / state.model.tutors.length : 0;
    const load = getLoadClassification(stats.uniqueStudents, allAverage);

    els.dialogTitle.textContent = tutor.name;
    els.dialogContent.innerHTML = `
      <section class="dialog-metrics">
        <div><span>Turmas</span><strong>${stats.classCount}</strong></div><div><span>Cursos</span><strong>${stats.courseCount}</strong></div>
        <div><span>Matrículas</span><strong>${formatNumber(stats.enrollmentCount)}</strong></div><div><span>Alunos únicos</span><strong>${formatNumber(stats.uniqueStudents)}</strong></div>
        <div><span>Carga</span><strong>${load}</strong></div>
      </section>
      ${tutor.email ? `<p class="notice">E-mail identificado: ${escapeHtml(tutor.email)}</p>` : ""}
      <div class="table-wrap"><table><thead><tr><th>Turma ou curso</th><th>Modalidade</th><th>Alunos</th><th>Confiança</th><th></th></tr></thead><tbody>
        ${tutor.classes.map((item) => `<tr><td><strong>${escapeHtml(item.className)}</strong></td><td>${escapeHtml(item.modality)}</td><td>${formatNumber(item.enrollmentCount)}</td><td><span class="confidence-badge confidence-${escapeHtml(item.confidence)}">${escapeHtml(item.confidence)}</span></td><td><a class="link-button" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Abrir Moodle</a></td></tr>`).join("")}
      </tbody></table></div>`;
    els.dialog.showModal();
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    if (!state.model) return;
    const view = getViewData();
    const rows = [["Tutor", "Email", "Curso/Turma", "Modalidade", "Matrículas", "Alunos únicos no tutor", "Confiança", "URL"]];
    view.tutors.forEach((tutor) => {
      const stats = tutorStats(tutor);
      tutor.classes.forEach((item) => rows.push([tutor.name, tutor.email, item.className, item.modality, item.enrollmentCount, stats.uniqueStudents, item.confidence, item.url]));
    });
    const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gestao-tutores-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "GESTAO_TUTORES_PROGRESS") return;
    const progress = message.progress || {};
    const total = Math.max(Number(progress.total || 0), 1);
    const current = Number(progress.current || 0);
    els.progress.classList.remove("hidden");
    els.progressCounter.textContent = `${current}/${total}`;
    els.progressBar.style.width = `${Math.max(3, Math.round(current / total * 100))}%`;
    els.progressCourse.textContent = progress.course || "Processando...";
  });

  els.collect.addEventListener("click", collect);
  els.export.addEventListener("click", exportCsv);
  els.search.addEventListener("input", (event) => { state.search = event.target.value; render(); });
  els.modality.addEventListener("change", (event) => { state.modality = event.target.value; render(); });
  els.load.addEventListener("change", (event) => { state.load = event.target.value; render(); });
  els.reset.addEventListener("click", () => {
    state.search = ""; state.modality = ""; state.load = "";
    els.search.value = ""; els.modality.value = ""; els.load.value = "";
    render();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-tutor-id]");
    if (trigger) openTutor(trigger.dataset.tutorId);
  });

  chrome.storage.local.get("gestaoTutoresSnapshot").then((stored) => {
    if (stored.gestaoTutoresSnapshot) showSnapshot(stored.gestaoTutoresSnapshot);
  }).catch((error) => {
    els.status.className = "status-error";
    els.status.textContent = `Não foi possível ler o cache local: ${error.message}`;
  });
})();
