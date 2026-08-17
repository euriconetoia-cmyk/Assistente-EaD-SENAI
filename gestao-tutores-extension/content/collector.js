(() => {
  "use strict";

  const Core = globalThis.GestaoTutoresCore;
  const Defaults = globalThis.GestaoTutoresDefaults;
  const Quality = globalThis.GestaoTutoresQuality;
  const Runtime = globalThis.GestaoTutoresRuntime;
  const Adapters = globalThis.GestaoTutoresAdapters;
  const Roles = globalThis.GestaoTutoresRoles;
  const Institutional = globalThis.GestaoTutoresInstitutionalMap;
  const SUPPORTED_HOSTS = new Set(Defaults.SUPPORTED_HOSTS);
  let activeRun = null;

  async function getSettings() {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    return { ...Defaults.SETTINGS, ...(stored.gestaoTutoresSettings || {}) };
  }

  async function getPreviousSnapshot() {
    const key = `gestaoTutoresSnapshot:${location.host}`;
    const stored = await chrome.storage.local.get(key);
    return stored[key] || null;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchDocument(url, settings, run) {
    const timeoutMs = Math.max(3000, Number(settings.requestTimeoutMs || Defaults.SETTINGS.requestTimeoutMs));
    const retries = Math.max(0, Number(settings.requestRetries ?? Defaults.SETTINGS.requestRetries));
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      Runtime.assertActive(run);
      const controller = new AbortController();
      Runtime.registerController(run, controller);
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal
        });
        Runtime.assertActive(run);
        if (!response.ok) throw new Error(`HTTP ${response.status} ao acessar ${url}`);
        const html = await response.text();
        Runtime.assertActive(run);
        return new DOMParser().parseFromString(html, "text/html");
      } catch (error) {
        Runtime.assertActive(run);
        lastError = error?.name === "AbortError"
          ? new Error(`Tempo limite excedido ao acessar ${url}`)
          : error;
        if (attempt < retries) {
          await delay(250 * (attempt + 1));
          Runtime.assertActive(run);
        }
      } finally {
        clearTimeout(timer);
        Runtime.unregisterController(run, controller);
      }
    }

    throw lastError || new Error(`Falha ao acessar ${url}`);
  }

  function mergePeople(targetMap, people) {
    (people || []).forEach((person) => {
      if (!targetMap.has(person.id)) {
        targetMap.set(person.id, { ...person, roles: [...(person.roles || [])] });
        return;
      }
      const current = targetMap.get(person.id);
      current.roles = Core.unique([...(current.roles || []), ...(person.roles || [])]);
      current.mixedManagement = Boolean(current.mixedManagement || person.mixedManagement);
      current.mixedTutorMonitor = Boolean(current.mixedTutorMonitor || person.mixedTutorMonitor);
      if (!current.email && person.email) current.email = person.email;
    });
  }

  async function collectParticipants(courseId, settings, adapter, run) {
    const baseUrl = `${location.origin}/user/index.php?id=${encodeURIComponent(courseId)}&perpage=5000`;
    const tutorMap = new Map();
    const monitorMap = new Map();
    const studentSet = new Set();
    const participantSet = new Set();
    const warnings = [];
    let pagesRead = 0;
    let failedPages = 0;
    let confidence = "alta";
    let unclassifiedCount = 0;

    const firstDoc = await fetchDocument(baseUrl, settings, run);
    const maxPageIndex = adapter.getMaxParticipantPageIndex(firstDoc, baseUrl);
    const totalPagesDetected = maxPageIndex + 1;
    const pageLimit = Math.max(1, Number(settings.maxPagesPerCourse || 1));
    const lastPageToRead = Math.min(maxPageIndex, pageLimit - 1);

    function absorb(doc, pageNumber) {
      Runtime.assertActive(run);
      const extracted = adapter.extractParticipants(doc, {
        courseId,
        origin: location.origin,
        host: location.host,
        pageNumber
      });
      const parsed = Roles.classifyRows(extracted, settings);
      mergePeople(tutorMap, parsed.tutors);
      mergePeople(monitorMap, parsed.monitors);
      parsed.studentIds.forEach((id) => studentSet.add(id));
      parsed.participantIds.forEach((id) => participantSet.add(id));
      warnings.push(...parsed.warnings);
      unclassifiedCount += parsed.unclassifiedCount;
      pagesRead += 1;
      if (parsed.confidence === "baixa") confidence = "baixa";
      else if (parsed.confidence === "média" && confidence === "alta") confidence = "média";
    }

    absorb(firstDoc, 1);
    for (let page = 1; page <= lastPageToRead; page += 1) {
      Runtime.assertActive(run);
      try {
        const pageUrl = `${baseUrl}&page=${page}`;
        absorb(await fetchDocument(pageUrl, settings, run), page + 1);
      } catch (error) {
        Runtime.assertActive(run);
        failedPages += 1;
        confidence = "baixa";
        warnings.push(`Falha ao ler a página ${page + 1} de participantes: ${error.message}`);
      }
    }

    const paginationComplete = maxPageIndex <= lastPageToRead && failedPages === 0;
    if (!paginationComplete) {
      warnings.push(`Paginação incompleta: ${pagesRead} de ${totalPagesDetected} página(s) foram lidas com sucesso.`);
    }

    const collectionState = paginationComplete && confidence === "alta" ? "completo" : "parcial";

    return {
      url: baseUrl,
      tutors: [...tutorMap.values()],
      monitors: [...monitorMap.values()],
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
    return { ...institutional, excluded: Boolean(exclusionReason), exclusionReason };
  }

  async function collectCourse(courseRef, settings, adapter, run) {
    const startedAt = performance.now();
    const courseUrl = `${location.origin}/course/view.php?id=${encodeURIComponent(courseRef.id)}`;

    try {
      Runtime.assertActive(run);
      const courseDoc = await fetchDocument(courseUrl, settings, run);
      const metadata = adapter.extractCourseMetadata(courseDoc, courseRef, location.origin);
      const participants = await collectParticipants(courseRef.id, settings, adapter, run);
      const modality = Core.inferModality({
        name: metadata.name,
        shortname: metadata.shortname,
        categoryPath: metadata.categoryPath
      }, settings.modalityRules);
      const institutional = enrichInstitutional({
        id: courseRef.id,
        name: metadata.name,
        shortname: metadata.shortname,
        categoryId: metadata.categoryId,
        categoryPath: metadata.categoryPath
      }, settings);

      return {
        id: courseRef.id,
        entityType: institutional.tipoEntidade || "moodle_course",
        collectionState: participants.collectionState,
        dataSource: "moodle",
        courseCollectedAt: new Date().toISOString(),
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
        monitors: participants.monitors,
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
      Runtime.assertActive(run);
      return {
        id: courseRef.id,
        entityType: "moodle_course",
        collectionState: "erro",
        dataSource: "moodle",
        courseCollectedAt: new Date().toISOString(),
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
        monitors: [],
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

  async function collectWithConcurrency(items, concurrency, worker, run) {
    const results = new Array(items.length);
    let cursor = 0;
    let completed = 0;

    async function runWorker() {
      while (true) {
        Runtime.assertActive(run);
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        try {
          results[index] = await worker(items[index], index);
        } catch (error) {
          Runtime.assertActive(run);
          results[index] = {
            id: items[index]?.id || `item-${index}`,
            entityType: "moodle_course",
            collectionState: "erro",
            dataSource: "moodle",
            name: items[index]?.discoveredName || `Curso ${index + 1}`,
            tutors: [],
            monitors: [],
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
            state: results[index]?.dataSource === "cache" ? "cache" : results[index]?.collectionState || "nao_analisado"
          }
        }).catch(() => undefined);
      }
    }

    const count = Math.max(1, Math.min(Number(concurrency || 1), items.length || 1));
    await Promise.all(Array.from({ length: count }, runWorker));
    return results;
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

  async function collectAll(mode, run) {
    if (!SUPPORTED_HOSTS.has(location.host) || !Adapters.has(location.host)) {
      throw new Error("Ambiente Moodle não suportado ou adaptador não registrado.");
    }

    const startedAt = performance.now();
    const settings = await getSettings();
    const adapter = Adapters.forHost(location.host);
    const previousSnapshot = await getPreviousSnapshot();
    const rulesRevision = settings.rulesRevision || "default";
    Runtime.assertActive(run);

    const discovery = await adapter.discoverCourses({
      currentDocument: document,
      currentUrl: location.href,
      origin: location.origin,
      settings,
      fetchDocument: (url) => fetchDocument(url, settings, run)
    });
    Runtime.assertActive(run);

    const discovered = discovery.courses;
    if (!discovered.length) {
      const detail = (discovery.warnings || []).join(" | ") || "Nenhum link de curso foi encontrado nas fontes consultadas.";
      throw new Error(`O coletor está ativo, mas nenhum curso Moodle foi descoberto. ${detail}`);
    }

    const coursesToProcess = discovered.slice(0, Number(settings.maxCourses || Defaults.SETTINGS.maxCourses));
    const reuseContext = {
      mode,
      host: location.host,
      adapterId: adapter.id,
      rulesetVersion: Defaults.RULESET_VERSION,
      rulesRevision,
      freshnessMinutes: Number(settings.incrementalFreshnessMinutes || Defaults.SETTINGS.incrementalFreshnessMinutes)
    };

    const results = await collectWithConcurrency(
      coursesToProcess,
      settings.courseConcurrency,
      async (course) => {
        Runtime.assertActive(run);
        if (Runtime.canReuseCourse(previousSnapshot, course.id, reuseContext)) {
          return Runtime.cachedCourse(previousSnapshot, course.id);
        }
        return collectCourse(course, settings, adapter, run);
      },
      run
    );
    Runtime.assertActive(run);

    const quality = Quality.summarizeCollection(discovered.length, results, discovery);
    const reusedCourses = results.filter((course) => course?.dataSource === "cache").length;
    const refreshedCourses = results.length - reusedCourses;
    const snapshot = {
      schemaVersion: 6,
      rulesetVersion: Defaults.RULESET_VERSION,
      rulesRevision,
      extensionVersion: chrome.runtime.getManifest().version,
      adapterId: adapter.id,
      environment: adapter.environmentName,
      host: location.host,
      origin: location.origin,
      collectedAt: new Date().toISOString(),
      sourceUrl: location.href,
      collectionMode: mode,
      discoveredCourses: discovered.length,
      processedCourses: results.length,
      reusedCourses,
      refreshedCourses,
      truncated: discovered.length > results.length,
      categoryPagesRead: discovery.categoryPagesRead,
      categoryTraversalTruncated: discovery.categoryTraversalTruncated,
      discoveryWarnings: discovery.warnings || [],
      quality,
      rules: {
        tutorRoleCount: (settings.tutorRolePatterns || []).length,
        monitorRoleCount: (settings.monitorRolePatterns || []).length,
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
        requestRetries: settings.requestRetries,
        incrementalFreshnessMinutes: settings.incrementalFreshnessMinutes
      },
      courses: results,
      durationMs: Math.round(performance.now() - startedAt)
    };

    Runtime.assertActive(run);
    await saveSnapshot(snapshot);
    return snapshot;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GESTAO_TUTORES_PING") {
      const adapterRegistered = Boolean(Adapters?.has?.(location.host));
      sendResponse({
        ok: Boolean(SUPPORTED_HOSTS.has(location.host) && adapterRegistered),
        host: location.host,
        supported: SUPPORTED_HOSTS.has(location.host),
        adapterRegistered,
        adapterId: adapterRegistered ? Adapters.forHost(location.host).id : null,
        version: chrome.runtime.getManifest().version
      });
      return false;
    }

    if (message?.type === "GESTAO_TUTORES_CANCEL") {
      if (activeRun) Runtime.cancelRun(activeRun);
      sendResponse({ ok: true, cancelled: Boolean(activeRun) });
      return false;
    }

    if (message?.type !== "GESTAO_TUTORES_COLLECT") return false;
    if (activeRun && !activeRun.cancelled) {
      sendResponse({ ok: false, error: "Já existe uma coleta em andamento. Cancele ou aguarde a conclusão." });
      return false;
    }

    const mode = message.mode === "incremental" ? "incremental" : "full";
    const run = Runtime.createRunControl(`gestao-tutores-${Date.now()}`);
    activeRun = run;

    collectAll(mode, run)
      .then((snapshot) => sendResponse({ ok: true, snapshot }))
      .catch((error) => {
        if (error?.code === "GESTAO_TUTORES_CANCELLED" || run.cancelled) {
          sendResponse({ ok: false, cancelled: true, error: "Coleta cancelada pelo usuário. O último snapshot válido foi preservado." });
          return;
        }
        sendResponse({ ok: false, error: error.message });
      })
      .finally(() => {
        if (activeRun === run) activeRun = null;
      });

    return true;
  });
})();
