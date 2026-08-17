(() => {
  "use strict";

  const Core = globalThis.GestaoTutoresCore;
  const Defaults = globalThis.GestaoTutoresDefaults;
  const SUPPORTED_HOSTS = new Set(Defaults.SUPPORTED_HOSTS);

  function getCourseId(url) {
    try {
      return new URL(url, location.origin).searchParams.get("id");
    } catch {
      return null;
    }
  }

  function getCategoryId(url) {
    try {
      return new URL(url, location.origin).searchParams.get("categoryid");
    } catch {
      return null;
    }
  }

  function getUserId(url) {
    try {
      const parsed = new URL(url, location.origin);
      if (!parsed.pathname.includes("/user/")) return null;
      return parsed.searchParams.get("id");
    } catch {
      return null;
    }
  }

  async function getSettings() {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    return { ...Defaults.SETTINGS, ...(stored.gestaoTutoresSettings || {}) };
  }

  async function fetchDocument(url) {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ao acessar ${url}`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function collectCourseLinksFromDocument(doc, baseUrl) {
    return Core.uniqueBy(
      [...doc.querySelectorAll('a[href*="/course/view.php"]')]
        .map((anchor) => {
          const href = new URL(anchor.getAttribute("href"), baseUrl).href;
          const id = getCourseId(href);
          if (!id) return null;
          return {
            id,
            url: href,
            discoveredName: anchor.textContent.trim() || `Curso ${id}`
          };
        })
        .filter(Boolean),
      (item) => item.id
    );
  }

  function collectCategoryLinksFromDocument(doc, baseUrl) {
    return Core.uniqueBy(
      [...doc.querySelectorAll('a[href*="/course/index.php"]')]
        .map((anchor) => {
          const href = new URL(anchor.getAttribute("href"), baseUrl).href;
          const id = getCategoryId(href);
          return id ? { id, url: href } : null;
        })
        .filter(Boolean),
      (item) => item.id
    );
  }

  async function discoverCourses(settings) {
    const courseMap = new Map();
    const categoryQueue = [];
    const queuedCategories = new Set();
    const visitedCategories = new Set();

    function absorb(doc, baseUrl) {
      collectCourseLinksFromDocument(doc, baseUrl).forEach((course) => {
        if (!courseMap.has(course.id)) courseMap.set(course.id, course);
      });
      collectCategoryLinksFromDocument(doc, baseUrl).forEach((category) => {
        if (!queuedCategories.has(category.id) && !visitedCategories.has(category.id)) {
          queuedCategories.add(category.id);
          categoryQueue.push(category);
        }
      });
    }

    absorb(document, location.href);

    const currentCourseId = getCourseId(location.href);
    if (currentCourseId && !courseMap.has(currentCourseId)) {
      courseMap.set(currentCourseId, {
        id: currentCourseId,
        url: `${location.origin}/course/view.php?id=${encodeURIComponent(currentCourseId)}`,
        discoveredName: document.querySelector("h1")?.textContent.trim() || `Curso ${currentCourseId}`
      });
    }

    for (const path of ["/my/", "/course/index.php"]) {
      try {
        const url = `${location.origin}${path}`;
        absorb(await fetchDocument(url), url);
      } catch (error) {
        console.warn(`Gestão de Tutores: não foi possível ler ${path}`, error);
      }
    }

    let categoryPagesRead = 0;
    while (categoryQueue.length && categoryPagesRead < settings.maxCategoryPages) {
      const category = categoryQueue.shift();
      queuedCategories.delete(category.id);
      if (visitedCategories.has(category.id)) continue;
      visitedCategories.add(category.id);
      categoryPagesRead += 1;
      try {
        absorb(await fetchDocument(category.url), category.url);
      } catch (error) {
        console.warn(`Gestão de Tutores: falha na categoria ${category.id}`, error);
      }
    }

    return {
      courses: [...courseMap.values()],
      categoryPagesRead,
      categoryTraversalTruncated: categoryQueue.length > 0
    };
  }

  function extractCourseName(doc, fallback) {
    const candidates = [
      doc.querySelector(".page-header-headings h1")?.textContent,
      doc.querySelector("h1")?.textContent,
      doc.querySelector('meta[property="og:title"]')?.content,
      fallback
    ];
    return candidates.find((item) => String(item || "").trim())?.trim() || "Curso sem nome";
  }

  function extractBreadcrumb(doc) {
    return [...doc.querySelectorAll('nav[aria-label*="breadcrumb" i] a, .breadcrumb a')]
      .map((anchor) => anchor.textContent.trim())
      .filter(Boolean);
  }

  function extractCategoryId(doc) {
    const links = [...doc.querySelectorAll('nav[aria-label*="breadcrumb" i] a[href*="categoryid="], .breadcrumb a[href*="categoryid="]')];
    for (let index = links.length - 1; index >= 0; index -= 1) {
      const id = getCategoryId(links[index].href);
      if (id) return id;
    }
    return "";
  }

  function extractShortname(doc, courseRef, courseName) {
    const candidates = [
      doc.querySelector("[data-course-shortname]")?.getAttribute("data-course-shortname"),
      doc.querySelector(".course-shortname")?.textContent,
      courseRef.discoveredName
    ].map((item) => String(item || "").trim()).filter(Boolean);
    return candidates.find((item) => Core.normalizeText(item) !== Core.normalizeText(courseName)) || "";
  }

  function findHeaderIndex(headers, aliases) {
    const normalizedAliases = aliases.map(Core.normalizeText);
    return headers.findIndex((header) => normalizedAliases.some((alias) => header === alias || header.includes(alias)));
  }

  function findParticipantsTable(doc) {
    const tables = [...doc.querySelectorAll("table")];
    const scored = tables.map((table) => {
      const headers = [...table.querySelectorAll("thead th, tr:first-child th")].map((th) => Core.normalizeText(th.textContent));
      const profileLinks = table.querySelectorAll('a[href*="/user/view.php"], a[href*="/user/profile.php"]').length;
      let score = profileLinks ? 4 : 0;
      if (findHeaderIndex(headers, ["papel", "papeis", "papéis", "role", "roles", "função", "funcoes", "funções"]) >= 0) score += 4;
      if (findHeaderIndex(headers, ["nome", "name", "usuario", "usuário"]) >= 0) score += 2;
      if (findHeaderIndex(headers, ["email", "e-mail"]) >= 0) score += 1;
      return { table, score };
    }).sort((a, b) => b.score - a.score);
    return scored[0]?.score ? scored[0].table : null;
  }

  function parseParticipantsPage(doc, settings, courseId) {
    const table = findParticipantsTable(doc);
    if (!table) {
      return {
        tutors: [],
        studentIds: [],
        participantCount: 0,
        confidence: "baixa",
        hasExplicitRoles: false,
        warnings: ["Tabela de participantes não identificada."]
      };
    }

    const headerCells = [...table.querySelectorAll("thead th")];
    const fallbackHeaders = headerCells.length ? headerCells : [...table.querySelectorAll("tr:first-child th")];
    const headers = fallbackHeaders.map((th) => Core.normalizeText(th.textContent));
    const roleIndex = findHeaderIndex(headers, ["papel", "papeis", "papéis", "role", "roles", "função", "funcao", "funções", "funcoes"]);
    const emailIndex = findHeaderIndex(headers, ["email", "e-mail"]);
    const hasExplicitRoles = roleIndex >= 0;
    const rows = [...table.querySelectorAll("tbody tr")];
    const tutors = [];
    const studentIds = [];
    let participantCount = 0;
    let unclassifiedCount = 0;

    rows.forEach((row, index) => {
      const cells = [...row.querySelectorAll("td")];
      const profileLink = row.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]');
      if (!profileLink) return;
      participantCount += 1;

      const moodleUserId = getUserId(profileLink.href) || `${courseId}-row-${index}`;
      const id = `${location.host}:${moodleUserId}`;
      const name = profileLink.textContent.trim() || `Participante ${index + 1}`;
      const roleText = hasExplicitRoles && cells[roleIndex]
        ? cells[roleIndex].textContent.trim()
        : row.querySelector("[data-region*='role'], .roles, .role")?.textContent.trim() || row.textContent.trim();
      const roleLabels = Core.splitRoleLabels(roleText);
      const email = emailIndex >= 0 && cells[emailIndex]
        ? cells[emailIndex].textContent.trim()
        : row.querySelector('a[href^="mailto:"]')?.textContent.trim() || "";

      const isTutor = Core.roleMatches(roleLabels, settings.tutorRolePatterns);
      const isManagement = Core.roleMatches(roleLabels, settings.managementRolePatterns);
      const isStudentExplicit = Core.roleMatches(roleLabels, settings.studentRolePatterns);
      const isStaff = Core.roleMatches(roleLabels, settings.staffRolePatterns);
      const isStudent = isStudentExplicit || (!hasExplicitRoles && !isTutor && !isStaff && Boolean(roleText));

      if (isTutor) {
        tutors.push({
          id,
          moodleUserId,
          name,
          email,
          roles: roleLabels,
          mixedManagement: isManagement
        });
      } else if (isStudent) {
        studentIds.push(id);
      } else if (hasExplicitRoles && !isStaff && roleText) {
        unclassifiedCount += 1;
      }
    });

    const warnings = [];
    if (!hasExplicitRoles) warnings.push("Coluna de papéis não identificada. A classificação de estudantes foi aproximada.");
    if (unclassifiedCount) warnings.push(`${unclassifiedCount} participante(s) possuem papel não reconhecido e não foram presumidos como estudantes.`);
    if (!tutors.length) warnings.push("Nenhum tutor foi identificado pelos padrões configurados.");

    return {
      tutors: Core.uniqueBy(tutors, (item) => item.id),
      studentIds: Core.unique(studentIds),
      participantCount,
      confidence: hasExplicitRoles && !unclassifiedCount ? "alta" : "média",
      hasExplicitRoles,
      warnings
    };
  }

  function getMaxPageIndex(doc, baseUrl) {
    let max = 0;
    [...doc.querySelectorAll('a[href*="page="]')].forEach((anchor) => {
      try {
        const parsed = new URL(anchor.getAttribute("href"), baseUrl);
        if (!parsed.pathname.includes("/user/index.php")) return;
        const page = Number(parsed.searchParams.get("page"));
        if (Number.isInteger(page) && page > max) max = page;
      } catch {
        return undefined;
      }
    });
    return max;
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

  async function collectParticipants(courseId, settings) {
    const baseUrl = `${location.origin}/user/index.php?id=${encodeURIComponent(courseId)}&perpage=5000`;
    const firstDoc = await fetchDocument(baseUrl);
    const maxPageIndex = getMaxPageIndex(firstDoc, baseUrl);
    const pageLimit = Math.max(1, Number(settings.maxPagesPerCourse || 1));
    const lastPageToRead = Math.min(maxPageIndex, pageLimit - 1);
    const tutorMap = new Map();
    const studentSet = new Set();
    const warnings = [];
    let participantCount = 0;
    let confidence = "alta";
    let pagesRead = 0;

    async function absorb(doc) {
      const parsed = parseParticipantsPage(doc, settings, courseId);
      mergeTutors(tutorMap, parsed.tutors);
      parsed.studentIds.forEach((id) => studentSet.add(id));
      participantCount += parsed.participantCount;
      warnings.push(...parsed.warnings);
      if (parsed.confidence !== "alta") confidence = parsed.confidence;
      pagesRead += 1;
    }

    await absorb(firstDoc);
    for (let page = 1; page <= lastPageToRead; page += 1) {
      const pageUrl = `${baseUrl}&page=${page}`;
      try {
        await absorb(await fetchDocument(pageUrl));
      } catch (error) {
        confidence = "média";
        warnings.push(`Falha ao ler a página ${page + 1} de participantes: ${error.message}`);
      }
    }

    const paginationComplete = maxPageIndex <= lastPageToRead;
    if (!paginationComplete) {
      confidence = "média";
      warnings.push(`Paginação incompleta: ${pagesRead} de ${maxPageIndex + 1} página(s) foram lidas.`);
    }

    return {
      url: baseUrl,
      tutors: [...tutorMap.values()],
      studentIds: [...studentSet],
      participantCount,
      pagesRead,
      totalPagesDetected: maxPageIndex + 1,
      paginationComplete,
      confidence,
      warnings: Core.unique(warnings)
    };
  }

  async function collectCourse(courseRef, settings) {
    const startedAt = performance.now();
    const courseUrl = `${location.origin}/course/view.php?id=${encodeURIComponent(courseRef.id)}`;
    try {
      const courseDoc = await fetchDocument(courseUrl);
      const courseName = extractCourseName(courseDoc, courseRef.discoveredName);
      const categoryPath = extractBreadcrumb(courseDoc);
      const shortname = extractShortname(courseDoc, courseRef, courseName);
      const participants = await collectParticipants(courseRef.id, settings);

      return {
        id: courseRef.id,
        entityType: "moodle_course",
        name: courseName,
        shortname,
        categoryId: extractCategoryId(courseDoc),
        categoryPath,
        modality: Core.inferModality({ name: courseName, shortname, categoryPath }, settings.modalityRules),
        status: "Não identificado",
        url: courseUrl,
        participantsUrl: participants.url,
        tutors: participants.tutors,
        studentIds: participants.studentIds,
        enrollmentCount: participants.studentIds.length,
        participantCount: participants.participantCount,
        pagesRead: participants.pagesRead,
        totalPagesDetected: participants.totalPagesDetected,
        paginationComplete: participants.paginationComplete,
        confidence: participants.confidence,
        warnings: participants.warnings,
        durationMs: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      return {
        id: courseRef.id,
        entityType: "moodle_course",
        name: courseRef.discoveredName || `Curso ${courseRef.id}`,
        shortname: "",
        categoryId: "",
        categoryPath: [],
        modality: "Não identificada",
        status: "Erro de leitura",
        url: courseUrl,
        participantsUrl: "",
        tutors: [],
        studentIds: [],
        enrollmentCount: 0,
        participantCount: 0,
        pagesRead: 0,
        totalPagesDetected: 0,
        paginationComplete: false,
        confidence: "baixa",
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
        results[index] = await worker(items[index], index);
        completed += 1;
        chrome.runtime.sendMessage({
          type: "GESTAO_TUTORES_PROGRESS",
          progress: {
            current: completed,
            total: items.length,
            course: results[index]?.name || items[index]?.discoveredName || `Curso ${index + 1}`
          }
        }).catch(() => undefined);
      }
    }

    const workers = Array.from({ length: Math.max(1, Math.min(Number(concurrency || 1), items.length || 1)) }, runWorker);
    await Promise.all(workers);
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

  async function collectAll() {
    if (!SUPPORTED_HOSTS.has(location.host)) throw new Error("Ambiente Moodle não suportado por esta versão.");

    const startedAt = performance.now();
    const settings = await getSettings();
    const discovery = await discoverCourses(settings);
    const discovered = discovery.courses;
    const coursesToProcess = discovered.slice(0, Number(settings.maxCourses || Defaults.SETTINGS.maxCourses));
    const results = await collectWithConcurrency(
      coursesToProcess,
      settings.courseConcurrency,
      (course) => collectCourse(course, settings)
    );

    const snapshot = {
      schemaVersion: 2,
      environment: location.host === "ead.fieg.com.br" ? "Moodle Goiás" : "Moodle CTM GO",
      host: location.host,
      origin: location.origin,
      collectedAt: new Date().toISOString(),
      sourceUrl: location.href,
      discoveredCourses: discovered.length,
      processedCourses: results.length,
      truncated: discovered.length > results.length,
      categoryPagesRead: discovery.categoryPagesRead,
      categoryTraversalTruncated: discovery.categoryTraversalTruncated,
      settings: {
        maxCourses: settings.maxCourses,
        maxCategoryPages: settings.maxCategoryPages,
        maxPagesPerCourse: settings.maxPagesPerCourse,
        courseConcurrency: settings.courseConcurrency
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
