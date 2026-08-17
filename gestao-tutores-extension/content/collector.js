(() => {
  "use strict";

  const Core = globalThis.GestaoTutoresCore;
  const Defaults = globalThis.GestaoTutoresDefaults;
  const Adapters = globalThis.GestaoTutoresAdapters;
  const Roles = globalThis.GestaoTutoresRoles;
  const Institutional = globalThis.GestaoTutoresInstitutionalMap;
  const SUPPORTED_HOSTS = new Set(Defaults.SUPPORTED_HOSTS);

  async function getSettings() {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    return { ...Defaults.SETTINGS, ...(stored.gestaoTutoresSettings || {}) };
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchDocument(url, settings) {
    const timeoutMs = Math.max(3000, Number(settings.requestTimeoutMs || Defaults.SETTINGS.requestTimeoutMs));
    const retries = Math.max(0, Number(settings.requestRetries ?? Defaults.SETTINGS.requestRetries));
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} ao acessar ${url}`);
        const html = await response.text();
        return new DOMParser().parseFromString(html, "text/html");
      } catch (error) {
        lastError = error?.name === "AbortError"
          ? new Error(`Tempo limite excedido ao acessar ${url}`)
          : error;
        if (attempt < retries) await delay(250 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new Error(`Falha ao acessar ${url}`);
  }

  function mergeTutors(targetMap, tutors) {
    tutors.forEach((tutor) => {
      if (!targetMap.has(tutor.id)) {
        targetMap.set(tutor.id, { ...tutor, roles: [...(tutor.roles || [])] });
        return;
      }
      const current = targetMap.get(tutor.id);
      current.roles = Core.unique([...(current.roles || []), ...(tutor.roles || [])]);
      current.mixedManagement = Boolean(current.mixedManagement || tutor.mixedManagement);
      if (!current.email && tutor.email) current.email = tutor.email;
    });
  }

  async function collectParticipants(courseId, settings, adapter) {
    const baseUrl = `${location.origin}/user/index.php?id=${encodeURIComponent(courseId)}&perpage=5000`;
    const tutorMap = new Map();
    const studentSet = new Set();
    const participantSet = new Set();
    const warnings = [];
    let pagesRead = 0;
    let failedPages = 0;
    let confidence = "alta";
    let unclassifiedCount = 0;

    const firstDoc = await fetchDocument(baseUrl, settings);
    const maxPageIndex = adapter.getMaxParticipantPageIndex(firstDoc, baseUrl);
    const totalPagesDetected = maxPageIndex + 1;
    const pageLimit = Math.max(1, Number(settings.maxPagesPerCourse || 1));
    const lastPageToRead = Math.min(maxPageIndex, pageLimit - 1);

    async function absorb(doc, pageNumber) {
      const extracted = adapter.extractParticipants(doc, {
        courseId,
        origin: location.origin,
        host: location.host,
        pageNumber
      });
      const parsed = Roles.classifyRows(extracted, settings);
      mergeTutors(tutorMap, parsed.tutors);
      parsed.studentIds.forEach((id) => studentSet.add(id));
      parsed.participantIds.forEach((id) => participantSet.add(id));
      warnings.push(...parsed.warnings);
      unclassifiedCount += parsed.unclassifiedCount;
      pagesRead += 1;
      if (parsed.confidence === "baixa") confidence = "baixa";
      else if (parsed.confidence === "média" && confidence === "alta") confidence = "média";
    }

    await absorb(firstDoc, 1);
    for (let page = 1; page <= lastPageToRead; page += 1) {
      try {
        const pageUrl = `${baseUrl}&page=${page}`;
        await absorb(await fetchDocument(pageUrl, settings), page + 1);
      } catch (error) {
        failedPages += 1;
        confidence = "baixa";
        warnings.push(`Falha ao ler a página ${page + 1} de participantes: ${error.message}`);
      }
    }

    const paginationComplete = maxPageIndex <= lastPageToRead && failedPages === 0;
    if (!paginationComplete) {
      warnings.push(`Paginação incompleta: ${pagesRead} de ${totalPagesDetected} página(s) foram lidas com sucesso.`);
    }

    const collectionState = paginationComplete && confidence === "alta"
      ? "completo"
      : "parcial";

    return {
      url: baseUrl,
      tutors: [...tutorMap.values()],
      studentIds: [...studentSet],
      participantCount: participantSet.size,
      pagesRead,
      failedPages,
      totalPagesDetected,
      paginationComplete,
      confidence,
      unclassifiedCount,
      collectionState,
      warnings: Core.unique(warnings)
    };
  }

  function enrichInstitutional(baseCourse, settings) {
    const institutional = Institutional.normalizeCourse(baseCourse, settings.institutionalRules || []);
    const exclusionReason = Institutional.exclusionReason(baseCourse, settings.exclusionPatterns || []);
    return {
      ...institutional,
      excluded: Boolean(exclusionReason),
      exclusionReason
    };
  }

  async function collectCourse(courseRef, settings, adapter) {
    const startedAt = performance.now();
    const courseUrl = `${location.origin}/course/view.php?id=${encodeURIComponent(courseRef.id)}`;

    try {
      const courseDoc = await fetchDocument(courseUrl, settings);
      const metadata = adapter.extractCourseMetadata(courseDoc, courseRef, location.origin);
      const participants = await collectParticipants(courseRef.id, settings, adapter);
      const modality = Core.inferModality({
        name: metadata.name,
        shortname: metadata.shortname,
        categoryPath: metadata.categoryPath
      }, settings.modalityRules);
      const baseCourse = {
        id: courseRef.id,
        name: metadata.name,
        shortname: metadata.shortname,
        categoryId: metadata.categoryId,
        categoryPath: metadata.categoryPath
      };
      const institutional = enrichInstitutional(baseCourse, settings);

      return {
        id: courseRef.id,
        entityType: institutional.tipoEntidade || "moodle_course",
        collectionState: participants.collectionState,
        adapterId: adapter.id,
        name: metadata.name,
        shortname: metadata.shortname,
        categoryId: metadata.categoryId,
        categoryPath: metadata.categoryPath,
        cursoInstitucional: institutional.cursoInstitucional,
        turma: institutional.turma,
        unidadeCurricular: institutional.unidadeCurricular,
        institutionalConfidence: institutional.institutionalConfidence,
        institutionalEvidence: institutional.institutionalEvidence,
        excluded: institutional.excluded,
        exclusionReason: institutional.exclusionReason,
        modality,
        status: participants.collectionState === "completo" ? "Leitura completa" : "Leitura parcial",
        url: courseUrl,
        participantsUrl: participants.url,
        tutors: participants.tutors,
        studentIds: participants.studentIds,
        enrollmentCount: participants.studentIds.length,
        participantCount: participants.participantCount,
        pagesRead: participants.pagesRead,
        failedPages: participants.failedPages,
        totalPagesDetected: participants.totalPagesDetected,
        paginationComplete: participants.paginationComplete,
        confidence: participants.confidence,
        unclassifiedCount: participants.unclassifiedCount,
        warnings: participants.warnings,
        durationMs: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      return {
        id: courseRef.id,
        entityType: "moodle_course",
        collectionState: "erro",
        adapterId: adapter.id,
        name: courseRef.discoveredName || `Curso ${courseRef.id}`,
        shortname: "",
        categoryId: "",
        categoryPath: [],
        cursoInstitucional: null,
        turma: null,
        unidadeCurricular: null,
        institutionalConfidence: "não_confirmada",
        institutionalEvidence: [],
        excluded: false,
        exclusionReason: "",
        modality: "Não identificada",
        status: "Erro de leitura",
        url: courseUrl,
        participantsUrl: "",
        tutors: [],
        studentIds: [],
        enrollmentCount: 0,
        participantCount: 0,
        pagesRead: 0,
        failedPages: 0,
        totalPagesDetected: 0,
        paginationComplete: false,
        confidence: "baixa",
        unclassifiedCount: 0,
        warnings: [error.message],
        durationMs: Math.round(performance.now() - startedAt)
      };
    }
  }

  async function collectWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    let completed = 0;

    async function runWorker() {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        try {
          results[index] = await worker(items[index], index);
        } catch (error) {
          results[index] = {
            id: items[index]?.id || `item-${index}`,
            entityType: "moodle_course",
            collectionState: "erro",
            name: items[index]?.discoveredName || `Curso ${index + 1}`,
            tutors: [],
            studentIds: [],
            enrollmentCount: 0,
            confidence: "baixa",
            excluded: false,
            warnings: [error.message]
          };
        }
        completed += 1;
        chrome.runtime.sendMessage({
          type: "GESTAO_TUTORES_PROGRESS",
          progress: {
            current: completed,
            total: items.length,
            course: results[index]?.name || items[index]?.discoveredName || `Curso ${index + 1}`,
            state: results[index]?.collectionState || "nao_analisado"
          }
        }).catch(() => undefined);
      }
    }

    const count = Math.max(1, Math.min(Number(concurrency || 1), items.length || 1));
    await Promise.all(Array.from({ length: count }, runWorker));
    return results;
  }

  function summarizeCollection(discoveredCount, results, discovery) {
    const completeCourses = results.filter((course) => course.collectionState === "completo").length;
    const partialCourses = results.filter((course) => course.collectionState === "parcial").length;
    const errorCourses = results.filter((course) => course.collectionState === "erro").length;
    const excludedCourses = results.filter((course) => course.excluded).length;
    const notAnalyzedCourses = Math.max(0, discoveredCount - results.length);
    const coverage = discoveredCount ? Math.round((results.length / discoveredCount) * 1000) / 10 : 0;
    const reliability = discoveredCount ? Math.round((completeCourses / discoveredCount) * 1000) / 10 : 0;

    return {
      completeCourses,
      partialCourses,
      errorCourses,
      excludedCourses,
      notAnalyzedCourses,
      coverage,
      reliability,
      discoveryComplete: !discovery.categoryTraversalTruncated && notAnalyzedCourses === 0,
      canSupportDefinitiveDecision: !discovery.categoryTraversalTruncated && notAnalyzedCourses === 0 && partialCourses === 0 && errorCourses === 0
    };
  }

  async function saveSnapshot(snapshot) {
    const snapshotKey = `gestaoTutoresSnapshot:${location.host}`;
    const stored = await chrome.storage.local.get("gestaoTutoresHosts");
    const hosts = Core.unique([...(stored.gestaoTutoresHosts || []), location.host]);
    await chrome.storage.local.set({
      [snapshotKey]: snapshot,
      gestaoTutoresHosts: hosts,
      gestaoTutoresLastHost: location.host
    });
  }

  async function collectAll() {
    if (!SUPPORTED_HOSTS.has(location.host) || !Adapters.has(location.host)) {
      throw new Error("Ambiente Moodle não suportado ou adaptador não registrado.");
    }

    const startedAt = performance.now();
    const settings = await getSettings();
    const adapter = Adapters.forHost(location.host);
    const discovery = await adapter.discoverCourses({
      currentDocument: document,
      currentUrl: location.href,
      origin: location.origin,
      settings,
      fetchDocument: (url) => fetchDocument(url, settings)
    });
    const discovered = discovery.courses;
    const coursesToProcess = discovered.slice(0, Number(settings.maxCourses || Defaults.SETTINGS.maxCourses));
    const results = await collectWithConcurrency(
      coursesToProcess,
      settings.courseConcurrency,
      (course) => collectCourse(course, settings, adapter)
    );
    const quality = summarizeCollection(discovered.length, results, discovery);

    const snapshot = {
      schemaVersion: 4,
      rulesetVersion: Defaults.RULESET_VERSION,
      extensionVersion: chrome.runtime.getManifest().version,
      adapterId: adapter.id,
      environment: adapter.environmentName,
      host: location.host,
      origin: location.origin,
      collectedAt: new Date().toISOString(),
      sourceUrl: location.href,
      discoveredCourses: discovered.length,
      processedCourses: results.length,
      truncated: discovered.length > results.length,
      categoryPagesRead: discovery.categoryPagesRead,
      categoryTraversalTruncated: discovery.categoryTraversalTruncated,
      discoveryWarnings: discovery.warnings || [],
      quality,
      rules: {
        modalityRuleCount: (settings.modalityRules || []).length,
        institutionalRuleCount: (settings.institutionalRules || []).length,
        exclusionPatternCount: (settings.exclusionPatterns || []).length
      },
      settings: {
        maxCourses: settings.maxCourses,
        maxCategoryPages: settings.maxCategoryPages,
        maxPagesPerCourse: settings.maxPagesPerCourse,
        courseConcurrency: settings.courseConcurrency,
        requestTimeoutMs: settings.requestTimeoutMs,
        requestRetries: settings.requestRetries
      },
      courses: results,
      durationMs: Math.round(performance.now() - startedAt)
    };

    await saveSnapshot(snapshot);
    return snapshot;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GESTAO_TUTORES_COLLECT") return false;
    collectAll()
      .then((snapshot) => sendResponse({ ok: true, snapshot }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
})();
