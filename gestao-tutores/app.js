(() => {
  "use strict";

  const source = window.GESTAO_TUTORES_MOCK || { tutors: [], unassignedClasses: [] };

  const state = {
    search: "",
    modality: "",
    status: ""
  };

  const els = {
    metrics: document.querySelector("#metrics"),
    loadChart: document.querySelector("#load-chart"),
    modalitySummary: document.querySelector("#modality-summary"),
    tutorTableBody: document.querySelector("#tutor-table-body"),
    diagnostics: document.querySelector("#diagnostics"),
    resultSummary: document.querySelector("#result-summary"),
    filterSearch: document.querySelector("#filter-search"),
    filterModality: document.querySelector("#filter-modality"),
    filterStatus: document.querySelector("#filter-status"),
    btnReset: document.querySelector("#btn-reset"),
    btnExport: document.querySelector("#btn-export"),
    dialog: document.querySelector("#tutor-dialog"),
    dialogTitle: document.querySelector("#dialog-title"),
    dialogContent: document.querySelector("#dialog-content")
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  }

  function getTutorStats(tutor) {
    const classes = tutor.classes || [];
    const enrollments = classes.reduce((sum, item) => sum + Number(item.enrollments || 0), 0);
    const fallbackUniqueStudents = classes.reduce((sum, item) => sum + Number(item.uniqueStudents || 0), 0);
    const uniqueStudents = Number.isFinite(Number(tutor.uniqueStudents))
      ? Number(tutor.uniqueStudents)
      : fallbackUniqueStudents;
    const courses = unique(classes.map((item) => item.course));
    const modalities = unique(classes.map((item) => item.modality));
    const averagePerClass = classes.length ? enrollments / classes.length : 0;

    return {
      classCount: classes.length,
      courseCount: courses.length,
      enrollments,
      uniqueStudents,
      modalities,
      averagePerClass
    };
  }

  function getFilteredTutors() {
    const query = normalizeText(state.search);

    return source.tutors
      .map((tutor) => {
        const filteredClasses = (tutor.classes || []).filter((item) => {
          const matchesModality = !state.modality || item.modality === state.modality;
          const matchesStatus = !state.status || item.status === state.status;
          const haystack = normalizeText(`${tutor.name} ${item.course} ${item.className} ${item.modality}`);
          const matchesSearch = !query || haystack.includes(query);
          return matchesModality && matchesStatus && matchesSearch;
        });

        const tutorNameMatches = !query || normalizeText(tutor.name).includes(query);
        const hasStructuralFilter = Boolean(state.modality || state.status);

        if (!filteredClasses.length && !(tutorNameMatches && !hasStructuralFilter)) {
          return null;
        }

        return {
          ...tutor,
          classes: filteredClasses.length || hasStructuralFilter || query ? filteredClasses : tutor.classes
        };
      })
      .filter((tutor) => tutor && tutor.classes.length > 0);
  }

  function getLoadClassification(value, average) {
    if (!average) return { label: "Sem referência", tone: "neutral" };
    const ratio = value / average;
    if (ratio >= 1.25) return { label: "Alta", tone: "high" };
    if (ratio <= 0.75) return { label: "Baixa", tone: "low" };
    return { label: "Média", tone: "medium" };
  }

  function buildDashboardStats(tutors) {
    const tutorStats = tutors.map((tutor) => ({ tutor, stats: getTutorStats(tutor) }));
    const allClasses = tutors.flatMap((tutor) => tutor.classes || []);
    const totalEnrollments = tutorStats.reduce((sum, item) => sum + item.stats.enrollments, 0);
    const totalUniqueStudents = tutorStats.reduce((sum, item) => sum + item.stats.uniqueStudents, 0);
    const avgStudentsPerTutor = tutors.length ? totalUniqueStudents / tutors.length : 0;
    const avgClassesPerTutor = tutors.length ? allClasses.length / tutors.length : 0;
    const modalities = unique(allClasses.map((item) => item.modality));

    return {
      tutorStats,
      allClasses,
      totalEnrollments,
      totalUniqueStudents,
      avgStudentsPerTutor,
      avgClassesPerTutor,
      modalities
    };
  }

  function renderMetrics(data) {
    const cards = [
      ["Tutores", data.tutorStats.length],
      ["Turmas", data.allClasses.length],
      ["Matrículas", data.totalEnrollments],
      ["Alunos únicos", data.totalUniqueStudents],
      ["Média por tutor", Math.round(data.avgStudentsPerTutor)],
      ["Modalidades", data.modalities.length]
    ];

    els.metrics.innerHTML = cards
      .map(([label, value]) => `
        <article class="metric-card">
          <span>${label}</span>
          <strong>${formatNumber(value)}</strong>
        </article>
      `)
      .join("");
  }

  function renderLoadChart(data) {
    const ranked = [...data.tutorStats]
      .sort((a, b) => b.stats.uniqueStudents - a.stats.uniqueStudents);
    const maxValue = Math.max(...ranked.map((item) => item.stats.uniqueStudents), 1);

    els.loadChart.innerHTML = ranked.length
      ? ranked.map(({ tutor, stats }) => {
          const percent = Math.max(4, Math.round((stats.uniqueStudents / maxValue) * 100));
          return `
            <button class="bar-row" type="button" data-tutor-id="${tutor.id}">
              <span class="bar-label">${tutor.name}</span>
              <span class="bar-track"><span class="bar-fill" style="width:${percent}%"></span></span>
              <strong>${formatNumber(stats.uniqueStudents)}</strong>
            </button>
          `;
        }).join("")
      : '<p class="empty-state">Nenhum tutor encontrado para os filtros atuais.</p>';
  }

  function renderModalities(data) {
    const counts = data.allClasses.reduce((acc, item) => {
      const key = item.modality || "Não identificada";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const total = Math.max(data.allClasses.length, 1);
    els.modalitySummary.innerHTML = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([modality, count]) => {
        const percent = Math.round((count / total) * 100);
        return `
          <div class="modality-item">
            <div>
              <strong>${modality}</strong>
              <span>${count} turma${count === 1 ? "" : "s"}</span>
            </div>
            <strong>${percent}%</strong>
          </div>
        `;
      })
      .join("") || '<p class="empty-state">Sem modalidades para exibir.</p>';
  }

  function renderTutorTable(data) {
    els.tutorTableBody.innerHTML = data.tutorStats.length
      ? data.tutorStats.map(({ tutor, stats }) => {
          const load = getLoadClassification(stats.uniqueStudents, data.avgStudentsPerTutor);
          return `
            <tr>
              <td><strong>${tutor.name}</strong></td>
              <td>${stats.classCount}</td>
              <td>${stats.courseCount}</td>
              <td>${formatNumber(stats.enrollments)}</td>
              <td>${formatNumber(stats.uniqueStudents)}</td>
              <td>${stats.modalities.join(", ") || "Não identificada"}</td>
              <td>${stats.averagePerClass.toFixed(1).replace(".", ",")}</td>
              <td><span class="load-badge load-${load.tone}">${load.label}</span></td>
              <td><button type="button" class="link-button" data-tutor-id="${tutor.id}">Detalhes</button></td>
            </tr>
          `;
        }).join("")
      : '<tr><td colspan="9" class="empty-state">Nenhum resultado encontrado.</td></tr>';

    els.resultSummary.textContent = `${data.tutorStats.length} tutor(es) e ${data.allClasses.length} turma(s) no recorte atual.`;
  }

  function renderDiagnostics(data) {
    const items = [];
    const average = data.avgStudentsPerTutor;

    source.unassignedClasses
      .filter((item) => (!state.modality || item.modality === state.modality) && (!state.status || item.status === state.status))
      .forEach((item) => {
        items.push({
          severity: "warning",
          title: "Turma sem tutor identificado",
          description: `${item.className} | ${item.course}`
        });
      });

    data.tutorStats.forEach(({ tutor, stats }) => {
      if (average && stats.uniqueStudents >= average * 1.25) {
        items.push({
          severity: "attention",
          title: "Carga acima da média do recorte",
          description: `${tutor.name} está com ${formatNumber(stats.uniqueStudents)} alunos únicos.`
        });
      }
      if (stats.modalities.length >= 3) {
        items.push({
          severity: "info",
          title: "Tutor em múltiplas modalidades",
          description: `${tutor.name} aparece em ${stats.modalities.length} modalidades.`
        });
      }
    });

    els.diagnostics.innerHTML = items.length
      ? items.map((item) => `
          <article class="diagnostic-item diagnostic-${item.severity}">
            <strong>${item.title}</strong>
            <span>${item.description}</span>
          </article>
        `).join("")
      : '<p class="empty-state">Nenhuma inconsistência identificada no recorte atual.</p>';
  }

  function openTutorDetails(tutorId) {
    const tutor = getFilteredTutors().find((item) => item.id === tutorId)
      || source.tutors.find((item) => item.id === tutorId);
    if (!tutor) return;

    const stats = getTutorStats(tutor);
    els.dialogTitle.textContent = tutor.name;
    els.dialogContent.innerHTML = `
      <section class="dialog-metrics">
        <div><span>Turmas</span><strong>${stats.classCount}</strong></div>
        <div><span>Cursos</span><strong>${stats.courseCount}</strong></div>
        <div><span>Matrículas</span><strong>${formatNumber(stats.enrollments)}</strong></div>
        <div><span>Alunos únicos</span><strong>${formatNumber(stats.uniqueStudents)}</strong></div>
      </section>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Turma</th><th>Curso</th><th>Modalidade</th><th>Alunos</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            ${tutor.classes.map((item) => `
              <tr>
                <td><strong>${item.className}</strong></td>
                <td>${item.course}</td>
                <td>${item.modality || "Não identificada"}</td>
                <td>${formatNumber(item.uniqueStudents)}</td>
                <td>${item.status}</td>
                <td>${item.url && item.url !== "#" ? `<a class="link-button" href="${item.url}" target="_blank" rel="noopener">Abrir Moodle</a>` : '<span class="muted">Mock</span>'}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    els.dialog.showModal();
  }

  function escapeCsv(value) {
    const stringValue = String(value ?? "");
    if (/[;"\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
    return stringValue;
  }

  function exportCsv() {
    const tutors = getFilteredTutors();
    const lines = [["Tutor", "Curso", "Turma", "Modalidade", "Matrículas", "Alunos únicos", "Status", "URL"]];

    tutors.forEach((tutor) => {
      tutor.classes.forEach((item) => {
        lines.push([
          tutor.name,
          item.course,
          item.className,
          item.modality || "Não identificada",
          item.enrollments,
          item.uniqueStudents,
          item.status,
          item.url === "#" ? "" : item.url
        ]);
      });
    });

    const csv = lines.map((row) => row.map(escapeCsv).join(";")).join("\n");
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

  function populateModalityFilter() {
    const modalities = unique(source.tutors.flatMap((tutor) => tutor.classes.map((item) => item.modality))).sort();
    els.filterModality.insertAdjacentHTML(
      "beforeend",
      modalities.map((item) => `<option value="${item}">${item}</option>`).join("")
    );
  }

  function render() {
    const tutors = getFilteredTutors();
    const data = buildDashboardStats(tutors);
    renderMetrics(data);
    renderLoadChart(data);
    renderModalities(data);
    renderTutorTable(data);
    renderDiagnostics(data);
  }

  function resetFilters() {
    state.search = "";
    state.modality = "";
    state.status = "";
    els.filterSearch.value = "";
    els.filterModality.value = "";
    els.filterStatus.value = "";
    render();
  }

  els.filterSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  els.filterModality.addEventListener("change", (event) => {
    state.modality = event.target.value;
    render();
  });

  els.filterStatus.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });

  els.btnReset.addEventListener("click", resetFilters);
  els.btnExport.addEventListener("click", exportCsv);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-tutor-id]");
    if (trigger) openTutorDetails(trigger.dataset.tutorId);
  });

  populateModalityFilter();
  render();
})();
