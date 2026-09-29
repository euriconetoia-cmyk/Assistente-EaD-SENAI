(() => {
  "use strict";

  const SUPPORTED_HOSTS = new Set(["ead.senai.br", "ead.fieg.com.br"]);
  const DEFAULT_SETTINGS = {
    maxCourses: 80,
    tutorRolePatterns: ["tutor", "professor tutor", "docente tutor", "tutor ead", "instrutor"],
    studentRolePatterns: ["estudante", "aluno", "student", "aprendiz"],
    staffRolePatterns: ["administrador", "manager", "coordenador", "coordenação", "professor", "teacher", "docente", "instrutor", "monitor", "tutor"]
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniqueBy(items, keyFn) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      if (key && !map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  }

  function textMatchesAny(text, patterns) {
    const normalized = normalizeText(text);
    return patterns.some((pattern) => normalized.includes(normalizeText(pattern)));
  }

  function getCourseId(url) {
    try {
      return new URL(url, location.origin).searchParams.get("id");
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
    return { ...DEFAULT_SETTINGS, ...(stored.gestaoTutoresSettings || {}) };
  }

  async function fetchDocument(url) {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: { "X-Requested-With": "GestaoTutoresExtension" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao acessar ${url}`);
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function collectCourseLinksFromDocument(doc, baseUrl) {
    const links = [...doc.querySelectorAll('a[href*="/course/view.php"]')]
      .map((anchor) => {
        const href = new URL(anchor.getAttribute("href"), baseUrl).href;
        const id = getCourseId(href);
        const name = anchor.textContent.trim();
        return id ? { id, url: href, name } : null;
      })
      .filter(Boolean);

    return uniqueBy(links, (item) => item.id);
  }

  async function discoverCourses() {
    const currentLinks = collectCourseLinksFromDocument(document, location.href);
    const sources = [...currentLinks];

    const currentCourseId = getCourseId(location.href);
    if (currentCourseId) {
      sources.push({
        id: currentCourseId,
        url: `${location.origin}/course/view.php?id=${currentCourseId}`,
        name: document.querySelector("h1")?.textContent.trim() || `Curso ${currentCourseId}`
      });
    }

    for (const path of ["/my/", "/course/index.php"]) {
      try {
        const doc = await fetchDocument(`${location.origin}${path}`);
        sources.push(...collectCourseLinksFromDocument(doc, `${location.origin}${path}`));
      } catch (error) {
        console.warn(`Não foi possível ler ${path}`, error);
      }
    }

    return uniqueBy(sources, (item) => item.id);
  }

  function extractCourseName(doc, fallback) {
    const candidates = [
      doc.querySelector("h1")?.textContent,
      doc.querySelector(".page-header-headings h1")?.textContent,
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

  function inferModality(courseName, breadcrumb) {
    const source = normalizeText(`${breadcrumb.join(" ")} ${courseName}`);
    const rules = [
      ["Aprendizagem", ["aprendizagem", "aprendiz industrial"]],
      ["Técnico", ["tecnico", "técnico"]],
      ["Qualificação", ["qualificacao", "qualificação", "qualificacao profissional"]],
      ["Aperfeiçoamento", ["aperfeicoamento", "aperfeiçoamento"]],
      ["Pós-graduação", ["pos-graduacao", "pós-graduação", "pos graduacao", "mba", "especializacao", "especialização"]],
      ["EJA", ["eja", "educacao de jovens e adultos", "educação de jovens e adultos"]]
    ];

    for (const [label, terms] of rules) {
      if (terms.some((term) => source.includes(normalizeText(term)))) return label;
    }
    return "Não identificada";
  }

  function findHeaderIndex(headers, patterns) {
    return headers.findIndex((header) => patterns.some((pattern) => header.includes(pattern)));
  }

  function parseParticipants(doc, settings, courseId) {
    const table = doc.querySelector("table");
    if (!table) {
      return {
        tutors: [],
        students: [],
        participantCount: 0,
        confidence: "baixa",
        warnings: ["Tabela de participantes não identificada."]
      };
    }

    const headers = [...table.querySelectorAll("thead th")].map((th) => normalizeText(th.textContent));
    const roleIndex = findHeaderIndex(headers, ["papel", "role", "função", "funcao"]);
    const emailIndex = findHeaderIndex(headers, ["email", "e-mail"]);
    const rows = [...table.querySelectorAll("tbody tr")];
    const users = [];
    let hasExplicitRoles = roleIndex >= 0;

    rows.forEach((row, index) => {
      const cells = [...row.querySelectorAll("td")];
      const profileLink = row.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]');
      if (!profileLink) return;

      const userId = getUserId(profileLink.href) || `${courseId}-row-${index}`;
      const name = profileLink.textContent.trim() || row.querySelector("[data-userid]")?.textContent.trim() || `Participante ${index + 1}`;
      const roleText = roleIndex >= 0 && cells[roleIndex] ? cells[roleIndex].textContent.trim() : row.textContent.trim();
      const email = emailIndex >= 0 && cells[emailIndex]
        ? cells[emailIndex].textContent.trim()
        : row.querySelector('a[href^="mailto:"]')?.textContent.trim() || "";

      const isTutor = textMatchesAny(roleText, settings.tutorRolePatterns);
      const isStudentExplicit = textMatchesAny(roleText, settings.studentRolePatterns);
      const isStaff = textMatchesAny(roleText, settings.staffRolePatterns);
      const isStudent = isStudentExplicit || (!hasExplicitRoles && !isStaff);

      users.push({
        id: `${location.host}:${userId}`,
        moodleUserId: userId,
        name,
        email,
        roleText,
        isTutor,
        isStudent
      });
    });

    const tutors = uniqueBy(users.filter((user) => user.isTutor), (user) => user.id);
    const students = uniqueBy(users.filter((user) => user.isStudent && !user.isTutor), (user) => user.id);
    const warnings = [];

    if (!hasExplicitRoles) {
      warnings.push("Coluna de papéis não identificada. A classificação de estudantes foi aproximada.");
    }
    if (doc.querySelector('a[href*="page="]')) {
      warnings.push("A página de participantes possui paginação. Confira se todos os registros foram carregados.");
    }
    if (!tutors.length) {
      warnings.push("Nenhum tutor foi identificado pelos padrões configurados.");
    }

    return {
      tutors,
      students,
      participantCount: users.length,
      confidence: hasExplicitRoles ? "alta" : "média",
      warnings
    };
  }

  async function collectCourse(courseRef, settings) {
    const startedAt = performance.now();
    const courseUrl = `${location.origin}/course/view.php?id=${encodeURIComponent(courseRef.id)}`;
    const participantsUrl = `${location.origin}/user/index.php?id=${encodeURIComponent(courseRef.id)}&perpage=5000`;
    const warnings = [];

    try {
      const [courseDoc, participantDoc] = await Promise.all([
        fetchDocument(courseUrl),
        fetchDocument(participantsUrl)
      ]);

      const courseName = extractCourseName(courseDoc, courseRef.name);
      const breadcrumb = extractBreadcrumb(courseDoc);
      const parsed = parseParticipants(participantDoc, settings, courseRef.id);
      warnings.push(...parsed.warnings);

      return {
        id: courseRef.id,
        name: courseName,
        className: courseName,
        categoryPath: breadcrumb,
        modality: inferModality(courseName, breadcrumb),
        status: "Não identificado",
        url: courseUrl,
        participantsUrl,
        tutors: parsed.tutors,
        students: parsed.students,
        participantCount: parsed.participantCount,
        confidence: parsed.confidence,
        warnings,
        durationMs: Math.round(performance.now() - startedAt)
      };
    } catch (error) {
      return {
        id: courseRef.id,
        name: courseRef.name || `Curso ${courseRef.id}`,
        className: courseRef.name || `Curso ${courseRef.id}`,
        categoryPath: [],
        modality: "Não identificada",
        status: "Erro de leitura",
        url: courseUrl,
        participantsUrl,
        tutors: [],
        students: [],
        participantCount: 0,
        confidence: "baixa",
        warnings: [error.message],
        durationMs: Math.round(performance.now() - startedAt)
      };
    }
  }

  async function collectAll() {
    if (!SUPPORTED_HOSTS.has(location.host)) {
      throw new Error("Ambiente Moodle não suportado por esta versão.");
    }

    const startedAt = performance.now();
    const settings = await getSettings();
    const discovered = await discoverCourses();
    const courses = discovered.slice(0, settings.maxCourses);
    const results = [];

    for (let index = 0; index < courses.length; index += 1) {
      const course = await collectCourse(courses[index], settings);
      results.push(course);
      chrome.runtime.sendMessage({
        type: "GESTAO_TUTORES_PROGRESS",
        progress: {
          current: index + 1,
          total: courses.length,
          course: course.name
        }
      }).catch(() => undefined);
    }

    const snapshot = {
      schemaVersion: 1,
      environment: location.host === "ead.fieg.com.br" ? "Moodle Goiás" : "Moodle CTM GO",
      host: location.host,
      origin: location.origin,
      collectedAt: new Date().toISOString(),
      sourceUrl: location.href,
      discoveredCourses: discovered.length,
      processedCourses: results.length,
      truncated: discovered.length > results.length,
      settings,
      courses: results,
      durationMs: Math.round(performance.now() - startedAt)
    };

    await chrome.storage.local.set({
      gestaoTutoresSnapshot: snapshot,
      gestaoTutoresLastOrigin: location.origin
    });

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
