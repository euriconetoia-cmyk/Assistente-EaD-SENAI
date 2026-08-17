(() => {
  "use strict";

  const Core = globalThis.GestaoTutoresCore;
  const Workload = globalThis.GestaoTutoresWorkload;
  const History = globalThis.GestaoTutoresHistory;
  const SUPPORTED_HOSTS = ["ead.fieg.com.br", "ead.senai.br"];
  const MAX_QUALITY_ROWS = 1000;

  const state = {
    host: "",
    snapshot: null,
    model: null,
    history: [],
    settings: { ictWeights: Workload.DEFAULT_WEIGHTS },
    tab: "executive",
    tutorSearch: "",
    tutorModality: "",
    tutorLoad: "",
    courseSearch: "",
    courseModality: "",
    courseTutorStatus: "",
    courseState: "",
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
    courseState: $("#course-state"), courseConfidence: $("#course-confidence"), courseTable: $("#course-table-body"), courseSummary: $("#course-result-summary"),
    qualityMetrics: $("#quality-metrics"), qualityTable: $("#quality-table-body"),
    historyMetrics: $("#history-metrics"), historyTable: $("#history-table-body"), historySummary: $("#history-summary"),
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

  function formatDelta(value, digits = 0) {
    if (value === null || value === undefined) return "Sem comparação";
    const number = Number(value || 0);
    const formatted = number.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
    return `${number > 0 ? "+" : ""}${formatted}`;
  }

  function metricCard(label, value, small) {
    return `<article class="metric-card"><span>${Core.escapeHtml(label)}</span><strong>${Core.escapeHtml(value)}</strong><small>${Core.escapeHtml(small || "")}</small></article>`;
  }

  function normalizeLegacyCourse(course) {
    const collectionState = course.collectionState || (course.status === "Erro de leitura"
      ? "erro"
      : course.paginationComplete === false || course.confidence !== "alta"
        ? "parcial"
        : "completo");
    return {
      ...course,
      collectionState,
      excluded: Boolean(course.excluded),
      cursoInstitucional: course.cursoInstitucional || null,
      turma: course.turma || null,
      unidadeCurricular: course.unidadeCurricular || null,
      institutionalConfidence: course.institutionalConfidence || "não_confirmada"
    };
  }

  function createCourseIssues(course) {
    const issues = [];
    if (course.collectionState === "parcial") issues.push({ severity: "danger", type: "Leitura parcial", detail: "O curso não passou no gate técnico de completude." });
    if (course.collectionState === "erro") issues.push({ severity: "danger", type: "Erro de leitura", detail: (course.warnings || ["Falha não especificada."])[0] });
    if (course.excluded) {
      issues.push({ severity: "info", type: "Excluído da carga gerencial", detail: course.exclusionReason || "Regra de exclusão configurada." });
      return issues;
    }
    const tutors = course.tutors || [];
    if (!tutors.length && course.collectionState !== "erro") issues.push({ severity: "warning", type: "Curso sem tutor identificado", detail: "Nenhum papel configurado como tutor foi encontrado." });
    if (tutors.length > 1) issues.push({ severity: "info", type: "Múltiplos tutores", detail: tutors.map((tutor) => tutor.name).join(", ") });
    if (course.modality === "Não identificada") issues.push({ severity: "info", type: "Modalidade não identificada", detail: "Nome, shortname e categoria não forneceram evidência suficiente." });
    if (course.confidence !== "alta" && course.collectionState !== "erro") issues.push({ severity: "warning", type: `Confiança ${course.confidence || "baixa"}`, detail: "A leitura de participantes precisa de conferência." });
    if (course.paginationComplete === false && course.collectionState !== "erro") issues.push({ severity: "danger", type: "Paginação incompleta", detail: `${course.pagesRead || 0} de ${course.totalPagesDetected || 0} página(s) lida(s).` });
    if (!(course.studentIds || []).length && course.collectionState !== "erro") issues.push({ severity: "warning", type: "Nenhum aluno identificado", detail: "Não há IDs de estudantes válidos no snapshot do curso." });
    (course.warnings || []).forEach((warning) => {
      if (!issues.some((item) => Core.normalizeText(item.detail) === Core.normalizeText(warning))) {
        issues.push({ severity: "info", type: "Aviso do coletor", detail: warning });
      }
    });
    return issues;
  }

  function buildModel(snapshot) {
    const courses = (snapshot.courses || []).map(normalizeLegacyCourse);
    const globalStudents = new Set();
    const tutorMap = new Map();
    const courseIssues = new Map();
    let totalEnrollments = 0;

    courses.forEach((course) => {
      const studentIds = Core.unique(course.studentIds || []);
      if (!course.excluded && course.collectionState !== "erro") {
        studentIds.forEach((id) => globalStudents.add(id));
        totalEnrollments += Number(course.enrollmentCount ?? studentIds.length);
      }
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
            courses: []
          });
        }
        const entry = tutorMap.get(key);
        entry.roles = Core.unique([...(entry.roles || []), ...(tutor.roles || [])]);
        entry.mixedManagement = Boolean(entry.mixedManagement || tutor.mixedManagement);
        if (!entry.email && tutor.email) entry.email = tutor.email;
        entry.courses.push(course);
      });
    });

    const tutors = [...tutorMap.values()];
    const profiles = Workload.buildProfiles(tutors, state.settings.ictWeights);
    const profileMap = new Map(profiles.map((profile) => [profile.tutorId, profile]));
    const loadStats = Core.distributionStats(profiles.map((profile) => profile.raw.uniqueStudents));
    const allIssues = courses.flatMap((course) => (courseIssues.get(course.id) || []).map((issue) => ({ course, ...issue })));

    return {
      courses,
      tutors,
      profiles,
      profileMap,
      loadStats,
      courseIssues,
      allIssues,
      totalEnrollments,
      totalUniqueStudents: globalStudents.size
    };
  }

  function tutorProfile(tutor) {
    return state.model?.profileMap.get(tutor.id) || {
      raw: Workload.rawMetrics(tutor), quantitative: { score: 0, components: {} }, complexity: { score: 0, components: {} }, ict: 0
    };
  }

  function globalIndicators() {
    const model = state.model;
    const snapshot = state.snapshot || {};
    const processed = Number(snapshot.processedCourses || model?.courses.length || 0);
    const discovered = Number(snapshot.discoveredCourses || processed);
    const formal = snapshot.quality || {};
    const complete = Number(formal.completeCourses ?? model.courses.filter((course) => course.collectionState === "completo").length);
    const partial = Number(formal.partialCourses ?? model.courses.filter((course) => course.collectionState === "parcial").length);
    const errors = Number(formal.errorCourses ?? model.courses.filter((course) => course.collectionState === "erro").length);
    const notAnalyzed = Number(formal.notAnalyzedCourses ?? Math.max(0, discovered - processed));
    const excluded = model.courses.filter((course) => course.excluded).length;
    const gerencial = model.courses.filter((course) => !course.excluded && course.collectionState !== "erro");
    const withTutor = gerencial.filter((course) => (course.tutors || []).length > 0).length;
    const withModality = gerencial.filter((course) => course.modality && course.modality !== "Não identificada").length;
    const mapped = gerencial.filter((course) => course.institutionalConfidence && course.institutionalConfidence !== "não_confirmada").length;
    return {
      processed, discovered, complete, partial, errors, notAnalyzed, excluded,
      coverage: Number(formal.coverage ?? Core.percent(processed, discovered)),
      reliability: Number(formal.reliability ?? Core.percent(complete, discovered)),
      discoveryComplete: formal.discoveryComplete ?? (!snapshot.categoryTraversalTruncated && notAnalyzed === 0),
      canSupportDefinitiveDecision: formal.canSupportDefinitiveDecision ?? (!snapshot.categoryTraversalTruncated && notAnalyzed === 0 && partial === 0 && errors === 0),
      gerencialCount: gerencial.length,
      withTutor,
      tutorCoverage: Core.percent(withTutor, gerencial.length),
      withModality,
      modalityCoverage: Core.percent(withModality, gerencial.length),
      mapped,
      mappedCoverage: Core.percent(mapped, gerencial.length)
    };
  }

  function qualityCounts() {
    const courses = state.model?.courses || [];
    const indicators = globalIndicators();
    const gerencial = courses.filter((course) => !course.excluded && course.collectionState !== "erro");
    return {
      complete: indicators.complete,
      partial: indicators.partial,
      errors: indicators.errors,
      notAnalyzed: indicators.notAnalyzed,
      excluded: indicators.excluded,
      noTutor: gerencial.filter((course) => !(course.tutors || []).length).length,
      multipleTutors: gerencial.filter((course) => (course.tutors || []).length > 1).length,
      unknownModality: gerencial.filter((course) => course.modality === "Não identificada").length,
      lowConfidence: gerencial.filter((course) => course.confidence !== "alta").length,
      incompletePagination: gerencial.filter((course) => course.paginationComplete === false).length,
      noStudents: gerencial.filter((course) => !(course.studentIds || []).length).length,
      mixedManagementTutors: (state.model?.tutors || []).filter((tutor) => tutor.mixedManagement).length
    };
  }

  function renderGlobalMetrics() {
    const indicators = globalIndicators();
    els.metrics.innerHTML = [
      metricCard("Tutores identificados", formatNumber(state.model.tutors.length), "Vínculos reconhecidos"),
      metricCard("Cursos Moodle", `${formatNumber(indicators.processed)} / ${formatNumber(indicators.discovered)}`, "Processados / descobertos"),
      metricCard("Cursos gerenciais", formatNumber(indicators.gerencialCount), `${indicators.excluded} excluído(s)`),
      metricCard("Alunos únicos", formatNumber(state.model.totalUniqueStudents), "No escopo gerencial"),
      metricCard("Cobertura", `${formatDecimal(indicators.coverage)}%`, "Cursos processados"),
      metricCard("Confiabilidade técnica", `${formatDecimal(indicators.reliability)}%`, `${indicators.complete} curso(s) completos`),
      metricCard("Cursos com tutor", `${indicators.tutorCoverage}%`, `${indicators.withTutor} curso(s)`),
      metricCard("Modalidade identificada", `${indicators.modalityCoverage}%`, `${indicators.withModality} curso(s)`)
    ].join("");
  }

  function renderBaseHealth() {
    const indicators = globalIndicators();
    const quality = qualityCounts();
    let tone = "good";
    let title = "Base tecnicamente completa para análise";
    let text = "Todos os cursos descobertos foram processados sem estados parciais ou erros técnicos. Pendências institucionais continuam visíveis na área de qualidade.";

    if (!indicators.canSupportDefinitiveDecision) {
      tone = "danger";
      title = "Base não apta para decisão definitiva";
      text = `${quality.partial} curso(s) parcial(is), ${quality.errors} com erro e ${quality.notAnalyzed} não analisado(s). Cobertura ${formatDecimal(indicators.coverage)}% e confiabilidade técnica ${formatDecimal(indicators.reliability)}%.`;
    } else if (quality.noTutor > 0 || quality.lowConfidence > 0 || indicators.modalityCoverage < 80) {
      tone = "warning";
      title = "Coleta completa, com pendências institucionais";
      text = "O gate técnico de completude foi aprovado, porém existem lacunas de papéis, modalidade ou classificação que precisam de validação antes de redistribuição de carga.";
    }

    els.baseHealth.innerHTML = `<div class="health-card health-${tone}"><strong>${Core.escapeHtml(title)}</strong><p>${Core.escapeHtml(text)}</p><small>ICT e carga são indicadores analíticos configuráveis, não normas institucionais.</small></div>`;
  }

  function renderPriorityActions() {
    const indicators = globalIndicators();
    const quality = qualityCounts();
    const critical = state.model.profiles.filter((profile) => Core.classifyLoad(profile.raw.uniqueStudents, state.model.loadStats) === "Crítica").length;
    const actions = [];
    if (!indicators.discoveryComplete) actions.push(["danger", "Completar descoberta", "A travessia de categorias foi limitada ou existem cursos ainda não analisados."]);
    if (quality.notAnalyzed) actions.push(["danger", "Processar cursos pendentes", `${quality.notAnalyzed} curso(s) descoberto(s) ainda não foram analisados.`]);
    if (quality.partial) actions.push(["danger", "Resolver leituras parciais", `${quality.partial} curso(s) não passaram no gate de completude.`]);
    if (quality.errors) actions.push(["danger", "Corrigir erros de coleta", `${quality.errors} curso(s) apresentaram erro técnico.`]);
    if (quality.noTutor) actions.push(["warning", "Revisar cursos sem tutor", `${quality.noTutor} curso(s) gerenciais não possuem tutor reconhecido.`]);
    if (quality.unknownModality) actions.push(["info", "Classificar modalidades", `${quality.unknownModality} curso(s) permanecem sem modalidade identificada.`]);
    if (indicators.mappedCoverage < 80) actions.push(["info", "Validar Curso, Turma e UC", `${indicators.mappedCoverage}% do escopo gerencial possui alguma classificação institucional confirmada.`]);
    if (quality.mixedManagementTutors) actions.push(["info", "Validar papéis mistos", `${quality.mixedManagementTutors} tutor(es) também possuem papel de gestão.`]);
    if (critical) actions.push(["warning", "Analisar concentração de carga", `${critical} tutor(es) aparecem como outlier na distribuição de alunos completos elegíveis.`]);

    els.priorityActions.innerHTML = actions.length
      ? actions.map(([tone, title, text]) => `<article class="priority priority-${tone}"><strong>${Core.escapeHtml(title)}</strong><span>${Core.escapeHtml(text)}</span></article>`).join("")
      : '<p class="empty">Nenhuma ação prioritária identificada.</p>';
  }

  function renderWorkload() {
    const profiles = state.model.profiles;
    const ictValues = profiles.map((profile) => profile.ict);
    const ictStats = Core.distributionStats(ictValues);
    const critical = profiles.filter((profile) => Core.classifyLoad(profile.raw.uniqueStudents, state.model.loadStats) === "Crítica").length;
    els.workloadMetrics.innerHTML = [
      metricCard("Mediana alunos", formatNumber(Math.round(state.model.loadStats.median)), "Cursos completos elegíveis"),
      metricCard("ICT médio", formatDecimal(ictStats.average), "Escala analítica 0 a 100"),
      metricCard("ICT máximo", formatDecimal(ictStats.max), "Maior índice do recorte"),
      metricCard("Carga crítica", formatNumber(critical), "Outliers de alunos únicos"),
      metricCard("Estrutura mapeada", `${globalIndicators().mappedCoverage}%`, "Curso, turma ou UC")
    ].join("");
  }

  function loadBadge(label) {
    return `<span class="load-badge load-${Core.normalizeText(label).replace(/\s/g, "-")}">${Core.escapeHtml(label)}</span>`;
  }

  function renderLoadChart() {
    const ranked = state.model.tutors.map((tutor) => ({ tutor, profile: tutorProfile(tutor) })).sort((a, b) => b.profile.ict - a.profile.ict);
    els.loadChart.innerHTML = ranked.length
      ? ranked.slice(0, 20).map(({ tutor, profile }) => `<button class="bar-row" type="button" data-tutor-id="${Core.escapeHtml(tutor.id)}"><span class="bar-label">${Core.escapeHtml(tutor.name)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(3, profile.ict)}%"></span></span><strong>${formatDecimal(profile.ict)}</strong><span>${Core.escapeHtml(Workload.classifyIct(profile.ict))}</span></button>`).join("")
      : '<p class="empty">Nenhum tutor identificado.</p>';
  }

  function renderModalities() {
    const relevant = state.model.courses.filter((course) => !course.excluded && course.collectionState !== "erro");
    const counts = relevant.reduce((acc, course) => {
      const key = course.modality || "Não identificada";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const total = Math.max(relevant.length, 1);
    els.modalitySummary.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([modality, count]) => `<div class="modality-item"><div><strong>${Core.escapeHtml(modality)}</strong><span>${formatNumber(count)} curso(s)</span></div><strong>${Core.percent(count, total)}%</strong></div>`).join("") || '<p class="empty">Sem dados.</p>';
  }

  function availableModalities() {
    return Core.unique((state.model?.courses || []).map((course) => course.modality).filter(Boolean)).sort();
  }

  function populateFilter(select, values, current) {
    select.innerHTML = '<option value="">Todas</option>' + values.map((value) => `<option value="${Core.escapeHtml(value)}">${Core.escapeHtml(value)}</option>`).join("");
    select.value = values.includes(current) ? current : "";
  }

  function filteredTutors() {
    const query = Core.normalizeText(state.tutorSearch);
    return state.model.tutors.filter((tutor) => {
      const profile = tutorProfile(tutor);
      const modalities = Core.unique(tutor.courses.map((course) => course.modality));
      const haystack = Core.normalizeText([tutor.name, tutor.email, ...(tutor.roles || []), ...tutor.courses.flatMap((course) => [course.name, course.shortname, course.cursoInstitucional, course.turma, course.unidadeCurricular, course.modality])].join(" "));
      const comparative = Core.classifyLoad(profile.raw.uniqueStudents, state.model.loadStats);
      return (!query || haystack.includes(query))
        && (!state.tutorModality || modalities.includes(state.tutorModality))
        && (!state.tutorLoad || comparative === state.tutorLoad);
    });
  }

  function renderTutorTable() {
    const tutors = filteredTutors();
    els.tutorTable.innerHTML = tutors.length ? tutors.map((tutor) => {
      const profile = tutorProfile(tutor);
      const comparative = Core.classifyLoad(profile.raw.uniqueStudents, state.model.loadStats);
      const management = tutor.mixedManagement ? '<span class="flag">Papel misto de gestão</span>' : "";
      return `<tr><td><strong>${Core.escapeHtml(tutor.name)}</strong>${tutor.email ? `<br><small>${Core.escapeHtml(tutor.email)}</small>` : ""}${management}</td><td>${Core.escapeHtml((tutor.roles || []).join(", ") || "Não identificado")}</td><td>${profile.raw.moodleCourses}</td><td>${formatNumber(profile.raw.enrollments)}</td><td>${formatNumber(profile.raw.uniqueStudents)}</td><td>${formatDecimal(profile.quantitative.score)}</td><td>${formatDecimal(profile.complexity.score)}</td><td><strong>${formatDecimal(profile.ict)}</strong><br><small>${Core.escapeHtml(Workload.classifyIct(profile.ict))}</small></td><td>${loadBadge(comparative)}</td><td><button type="button" class="link-button" data-tutor-id="${Core.escapeHtml(tutor.id)}">Detalhes</button></td></tr>`;
    }).join("") : '<tr><td colspan="10" class="empty-cell">Nenhum tutor encontrado para o recorte atual.</td></tr>';
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
      const haystack = Core.normalizeText([course.name, course.shortname, course.cursoInstitucional, course.turma, course.unidadeCurricular, course.modality, course.collectionState, ...(course.categoryPath || []), ...(course.tutors || []).flatMap((tutor) => [tutor.name, ...(tutor.roles || [])])].join(" "));
      return (!query || haystack.includes(query))
        && (!state.courseModality || course.modality === state.courseModality)
        && (!state.courseTutorStatus || courseTutorStatus(course) === state.courseTutorStatus)
        && (!state.courseState || course.collectionState === state.courseState)
        && (!state.courseConfidence || course.confidence === state.courseConfidence);
    });
  }

  function renderCourseTable() {
    const courses = filteredCourses();
    els.courseTable.innerHTML = courses.length ? courses.map((course) => {
      const tutors = (course.tutors || []).map((tutor) => tutor.name).join(", ") || "Sem tutor identificado";
      const issues = state.model.courseIssues.get(course.id) || [];
      const scope = course.excluded ? `Excluído: ${course.exclusionReason || "regra configurada"}` : "Gerencial";
      return `<tr><td><strong>${Core.escapeHtml(course.name)}</strong>${course.shortname ? `<br><small>${Core.escapeHtml(course.shortname)}</small>` : ""}</td><td>${Core.escapeHtml(course.cursoInstitucional || "Não confirmado")}</td><td>${Core.escapeHtml(course.turma || "Não confirmada")}</td><td>${Core.escapeHtml(course.unidadeCurricular || "Não confirmada")}</td><td>${Core.escapeHtml(tutors)}</td><td>${formatNumber(course.enrollmentCount || 0)}</td><td>${Core.escapeHtml(course.modality || "Não identificada")}</td><td>${Core.escapeHtml(scope)}</td><td>${Core.escapeHtml(course.collectionState)}</td><td>${Core.escapeHtml(course.confidence || "baixa")}</td><td>${issues.length}</td><td><a class="link-button" href="${Core.escapeHtml(course.url)}" target="_blank" rel="noopener">Abrir Moodle</a></td></tr>`;
    }).join("") : '<tr><td colspan="12" class="empty-cell">Nenhum curso encontrado para o recorte atual.</td></tr>';
    els.courseSummary.textContent = `${courses.length} de ${state.model.courses.length} curso(s) Moodle no recorte atual.`;
  }

  function renderQuality() {
    const quality = qualityCounts();
    els.qualityMetrics.innerHTML = [
      metricCard("Cursos completos", formatNumber(quality.complete), "Gate técnico aprovado"),
      metricCard("Cursos parciais", formatNumber(quality.partial), "Bloqueiam decisão definitiva"),
      metricCard("Erros", formatNumber(quality.errors), "Falhas técnicas"),
      metricCard("Não analisados", formatNumber(quality.notAnalyzed), "Descobertos sem processamento"),
      metricCard("Excluídos", formatNumber(quality.excluded), "Fora da carga gerencial"),
      metricCard("Sem tutor", formatNumber(quality.noTutor), "Pendência institucional"),
      metricCard("Modalidade desconhecida", formatNumber(quality.unknownModality), "Cursos gerenciais"),
      metricCard("Confiança abaixo de alta", formatNumber(quality.lowConfidence), "Leitura aproximada")
    ].join("");

    const severityOrder = { danger: 0, warning: 1, info: 2 };
    const issues = [...state.model.allIssues].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) || a.course.name.localeCompare(b.course.name));
    const shown = issues.slice(0, MAX_QUALITY_ROWS);
    els.qualityTable.innerHTML = shown.length ? shown.map((item) => `<tr><td><strong>${Core.escapeHtml(item.course.name)}</strong></td><td><span class="severity severity-${item.severity}">${Core.escapeHtml(item.severity)}</span></td><td>${Core.escapeHtml(item.type)}</td><td>${Core.escapeHtml(item.detail)}</td><td><a class="link-button" href="${Core.escapeHtml(item.course.url)}" target="_blank" rel="noopener">Abrir</a></td></tr>`).join("") + (issues.length > shown.length ? `<tr><td colspan="5" class="empty-cell">Exibindo ${shown.length} de ${issues.length} ocorrências para preservar desempenho. A exportação de qualidade contém todas.</td></tr>` : "") : '<tr><td colspan="5" class="empty-cell">Nenhum problema identificado.</td></tr>';
  }

  function latestHistoryPair() {
    const history = [...state.history].sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));
    return { latest: history.at(-1) || null, previous: history.at(-2) || null, history };
  }

  function renderHistory() {
    const { latest, previous, history } = latestHistoryPair();
    if (!latest) {
      els.historyMetrics.innerHTML = "";
      els.historyTable.innerHTML = '<tr><td colspan="8" class="empty-cell">Ainda não há histórico disponível.</td></tr>';
      els.historySummary.textContent = "O histórico será criado automaticamente após as coletas.";
      return;
    }

    const first = history[0];
    els.historyMetrics.innerHTML = [
      metricCard("Snapshots", formatNumber(history.length), "Dentro da retenção local"),
      metricCard("Período", `${formatDate(first.collectedAt)} a ${formatDate(latest.collectedAt)}`, "Histórico local"),
      metricCard("Alunos atuais", formatNumber(latest.global.uniqueStudents), "Cursos completos elegíveis"),
      metricCard("Cursos atuais", formatNumber(latest.global.eligibleCourses), "Escopo gerencial completo"),
      metricCard("Confiabilidade", `${formatDecimal(latest.quality?.reliability || 0)}%`, "Última coleta")
    ].join("");

    const previousMap = new Map((previous?.tutors || []).map((tutor) => [tutor.id, tutor]));
    els.historyTable.innerHTML = (latest.tutors || []).length ? latest.tutors.map((tutor) => {
      const old = previousMap.get(tutor.id);
      return `<tr><td><strong>${Core.escapeHtml(tutor.name)}</strong></td><td>${formatNumber(tutor.uniqueStudents)}</td><td>${formatDelta(old ? tutor.uniqueStudents - old.uniqueStudents : null)}</td><td>${formatNumber(tutor.moodleCourses)}</td><td>${formatDelta(old ? tutor.moodleCourses - old.moodleCourses : null)}</td><td>${formatDecimal(tutor.ict)}</td><td>${formatDelta(old ? tutor.ict - old.ict : null, 1)}</td><td>${formatDate(latest.collectedAt)}</td></tr>`;
    }).join("") : '<tr><td colspan="8" class="empty-cell">A última coleta não possui tutores elegíveis para histórico.</td></tr>';
    els.historySummary.textContent = previous ? `Comparação entre ${formatDate(previous.collectedAt)} e ${formatDate(latest.collectedAt)}.` : "Ainda existe apenas um snapshot. As variações aparecerão após a próxima coleta.";
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
    renderHistory();
  }

  async function refreshHistory(host, currentSnapshot) {
    const storedHistory = await History.load(host);
    let history = storedHistory;
    if (currentSnapshot) {
      const currentEntry = History.buildHistoryEntry(currentSnapshot, state.settings.ictWeights);
      history = History.upsertHistory(history, currentEntry);
    }
    state.history = history;
    renderHistory();
  }

  function showSnapshot(snapshot) {
    state.snapshot = snapshot;
    state.host = snapshot.host;
    state.model = buildModel(snapshot);
    els.environment.value = snapshot.host;
    const indicators = globalIndicators();
    els.status.className = indicators.canSupportDefinitiveDecision ? "status-ok" : "status-error";
    els.status.textContent = `${snapshot.environment || snapshot.host} | ${formatDate(snapshot.collectedAt)} | ${snapshot.processedCourses || 0}/${snapshot.discoveredCourses || 0} cursos | confiabilidade ${formatDecimal(indicators.reliability)}%`;
    renderAll();
    refreshHistory(snapshot.host, snapshot).catch(console.error);
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
      const response = await sendMessageToTab(tab.id, { type: "GESTAO_TUTORES_COLLECT", mode: "full" });
      if (!response?.ok) throw new Error(response?.error || "Falha não identificada na coleta.");
      await refreshEnvironmentOptions(response.snapshot.host);
      showSnapshot(response.snapshot);
      els.progressBar.style.width = "100%";
      els.progressCounter.textContent = "Concluído";
      const quality = response.snapshot.quality || {};
      els.progressCourse.textContent = `Coleta concluída em ${Math.round((response.snapshot.durationMs || 0) / 1000)} s. Completos: ${quality.completeCourses || 0}, parciais: ${quality.partialCourses || 0}, erros: ${quality.errorCourses || 0}.`;
      setTimeout(() => els.progress.classList.add("hidden"), 2200);
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
      state.history = await History.load(host);
      els.status.className = "";
      els.status.textContent = `Ainda não há coleta salva para ${host}.`;
      els.metrics.innerHTML = "";
      renderHistory();
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
    const profile = tutorProfile(tutor);
    const comparative = Core.classifyLoad(profile.raw.uniqueStudents, state.model.loadStats);
    els.dialogTitle.textContent = tutor.name;
    const components = Object.entries(profile.quantitative.components || {}).map(([key, item]) => `${key}: ${formatDecimal(item.normalized)} (${item.weight}%)`).concat(Object.entries(profile.complexity.components || {}).map(([key, item]) => `${key}: ${formatDecimal(item.normalized)} (${item.weight}%)`)).join("; ");
    els.dialogContent.innerHTML = `<section class="dialog-metrics">${metricCard("Cursos completos", profile.raw.moodleCourses, "Elegíveis para carga")}${metricCard("Alunos únicos", formatNumber(profile.raw.uniqueStudents), "Deduplicados")}${metricCard("Carga quantitativa", formatDecimal(profile.quantitative.score), "0 a 100")}${metricCard("Complexidade", formatDecimal(profile.complexity.score), "0 a 100")}${metricCard("ICT", formatDecimal(profile.ict), Workload.classifyIct(profile.ict))}</section>${tutor.mixedManagement ? '<p class="notice warning">Este tutor também possui papel de gestão. Valide o vínculo antes de redistribuir carga.</p>' : ""}<p class="notice">Papéis: ${Core.escapeHtml((tutor.roles || []).join(", ") || "Não identificados")} | Carga comparativa: ${Core.escapeHtml(comparative)}.</p><p class="notice">Composição do ICT: ${Core.escapeHtml(components || "Sem dimensões suficientes para cálculo.")}</p><div class="table-wrap"><table><thead><tr><th>Curso Moodle</th><th>Curso institucional</th><th>Turma</th><th>UC</th><th>Estado</th><th>Vínculos</th><th></th></tr></thead><tbody>${tutor.courses.map((course) => `<tr><td><strong>${Core.escapeHtml(course.name)}</strong></td><td>${Core.escapeHtml(course.cursoInstitucional || "Não confirmado")}</td><td>${Core.escapeHtml(course.turma || "Não confirmada")}</td><td>${Core.escapeHtml(course.unidadeCurricular || "Não confirmada")}</td><td>${Core.escapeHtml(course.excluded ? "Excluído" : course.collectionState)}</td><td>${formatNumber(course.enrollmentCount || 0)}</td><td><a class="link-button" href="${Core.escapeHtml(course.url)}" target="_blank" rel="noopener">Abrir Moodle</a></td></tr>`).join("")}</tbody></table></div>`;
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
    const rows = [["Tutor", "Email", "Papeis", "Cursos completos", "Vinculos", "Alunos unicos", "Carga quantitativa", "Complexidade", "ICT", "Classe ICT", "Carga comparativa", "Papel misto de gestao"]];
    filteredTutors().forEach((tutor) => {
      const profile = tutorProfile(tutor);
      rows.push([tutor.name, tutor.email, (tutor.roles || []).join(", "), profile.raw.moodleCourses, profile.raw.enrollments, profile.raw.uniqueStudents, profile.quantitative.score, profile.complexity.score, profile.ict, Workload.classifyIct(profile.ict), Core.classifyLoad(profile.raw.uniqueStudents, state.model.loadStats), tutor.mixedManagement ? "Sim" : "Não"]);
    });
    downloadCsv(`gestao-tutores-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportCourses() {
    const rows = [["ID Moodle", "Curso Moodle", "Shortname", "Curso institucional", "Turma", "UC", "Confianca institucional", "Categoria", "Modalidade", "Tutores", "Vinculos", "Escopo", "Motivo exclusao", "Estado", "Confianca leitura", "Adaptador", "Alertas", "URL"]];
    filteredCourses().forEach((course) => rows.push([course.id, course.name, course.shortname, course.cursoInstitucional || "", course.turma || "", course.unidadeCurricular || "", course.institutionalConfidence || "", (course.categoryPath || []).join(" > "), course.modality, (course.tutors || []).map((tutor) => tutor.name).join(", "), course.enrollmentCount || 0, course.excluded ? "Excluído" : "Gerencial", course.exclusionReason || "", course.collectionState, course.confidence, course.adapterId || state.snapshot?.adapterId || "", (state.model.courseIssues.get(course.id) || []).length, course.url]));
    downloadCsv(`cursos-moodle-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportQuality() {
    const indicators = globalIndicators();
    const rows = [["Resumo", "Valor"], ["Cursos descobertos", indicators.discovered], ["Cursos processados", indicators.processed], ["Cursos completos", indicators.complete], ["Cursos parciais", indicators.partial], ["Erros", indicators.errors], ["Não analisados", indicators.notAnalyzed], ["Excluídos", indicators.excluded], ["Cobertura %", indicators.coverage], ["Confiabilidade %", indicators.reliability], [], ["Curso Moodle", "Severidade", "Problema", "Detalhe", "URL"]];
    state.model.allIssues.forEach((item) => rows.push([item.course.name, item.severity, item.type, item.detail, item.course.url]));
    downloadCsv(`qualidade-dados-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function exportHistory() {
    const rows = [["Coleta", "Host", "Tutor", "Alunos unicos", "Vinculos", "Cursos Moodle", "Cursos institucionais", "Turmas", "UCs", "Modalidades", "Carga quantitativa", "Complexidade", "ICT", "Classe ICT", "Confiabilidade %"]];
    state.history.forEach((entry) => (entry.tutors || []).forEach((tutor) => rows.push([entry.collectedAt, entry.host, tutor.name, tutor.uniqueStudents, tutor.enrollments, tutor.moodleCourses, tutor.institutionalCourses, tutor.classes, tutor.curriculumUnits, tutor.modalities, tutor.quantitativeScore, tutor.complexityScore, tutor.ict, tutor.ictClass, entry.quality?.reliability || 0])));
    downloadCsv(`historico-carga-${state.host}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
    els.progressCourse.textContent = `${progress.course || "Processando..."}${progress.state ? ` | ${progress.state}` : ""}`;
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
  els.courseState.addEventListener("change", (event) => { state.courseState = event.target.value; renderCourseTable(); });
  els.courseConfidence.addEventListener("change", (event) => { state.courseConfidence = event.target.value; renderCourseTable(); });
  $("#btn-reset-courses").addEventListener("click", () => { state.courseSearch = ""; state.courseModality = ""; state.courseTutorStatus = ""; state.courseState = ""; state.courseConfidence = ""; els.courseSearch.value = ""; els.courseModality.value = ""; els.courseTutorStatus.value = ""; els.courseState.value = ""; els.courseConfidence.value = ""; renderCourseTable(); });
  $("#btn-export-courses").addEventListener("click", exportCourses);
  $("#btn-export-quality").addEventListener("click", exportQuality);
  $("#btn-export-history").addEventListener("click", exportHistory);

  (async function init() {
    try {
      const stored = await chrome.storage.local.get("gestaoTutoresSettings");
      state.settings = { ictWeights: stored.gestaoTutoresSettings?.ictWeights || Workload.DEFAULT_WEIGHTS };
      await refreshEnvironmentOptions();
      await loadSnapshot(state.host);
    } catch (error) {
      els.status.className = "status-error";
      els.status.textContent = `Não foi possível inicializar a dashboard: ${error.message}`;
    }
  })();
})();
