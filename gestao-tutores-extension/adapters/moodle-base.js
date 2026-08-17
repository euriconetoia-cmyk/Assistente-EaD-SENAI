(function (root, factory) {
  const api = factory(root?.GestaoTutoresCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresMoodleBase = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  if (!Core) throw new Error("GestaoTutoresCore é obrigatório para os adaptadores Moodle.");

  function createAdapter(config) {
    const cfg = {
      id: config.id,
      environmentName: config.environmentName,
      sourcePaths: config.sourcePaths || ["/my/", "/course/index.php"],
      courseLinkSelector: config.courseLinkSelector || 'a[href*="/course/view.php"]',
      categoryLinkSelector: config.categoryLinkSelector || 'a[href*="/course/index.php"]',
      breadcrumbSelector: config.breadcrumbSelector || 'nav[aria-label*="breadcrumb" i] a, .breadcrumb a',
      participantTableSelectors: config.participantTableSelectors || ["table"],
      profileLinkSelectors: config.profileLinkSelectors || ['a[href*="/user/view.php"]', 'a[href*="/user/profile.php"]'],
      roleAliases: config.roleAliases || ["papel", "papeis", "papéis", "role", "roles", "função", "funcao", "funções", "funcoes"],
      nameAliases: config.nameAliases || ["nome", "name", "usuario", "usuário"],
      emailAliases: config.emailAliases || ["email", "e-mail"],
      roleFallbackSelectors: config.roleFallbackSelectors || ["[data-region*='role']", ".roles", ".role"],
      shortnameSelectors: config.shortnameSelectors || ["[data-course-shortname]", ".course-shortname"],
      courseTitleSelectors: config.courseTitleSelectors || [".page-header-headings h1", "h1"]
    };

    function parseUrl(url, origin) {
      try {
        return new URL(url, origin);
      } catch {
        return null;
      }
    }

    function getCourseId(url, origin) {
      return parseUrl(url, origin)?.searchParams.get("id") || null;
    }

    function getCategoryId(url, origin) {
      return parseUrl(url, origin)?.searchParams.get("categoryid") || null;
    }

    function getUserId(url, origin) {
      const parsed = parseUrl(url, origin);
      if (!parsed || !parsed.pathname.includes("/user/")) return null;
      return parsed.searchParams.get("id");
    }

    function findHeaderIndex(headers, aliases) {
      const normalizedAliases = aliases.map(Core.normalizeText);
      return headers.findIndex((header) => normalizedAliases.some((alias) => header === alias || header.includes(alias)));
    }

    function collectCourseLinks(doc, baseUrl) {
      return Core.uniqueBy(
        [...doc.querySelectorAll(cfg.courseLinkSelector)].map((anchor) => {
          const href = parseUrl(anchor.getAttribute("href"), baseUrl)?.href;
          const id = href ? getCourseId(href, baseUrl) : null;
          return id ? { id, url: href, discoveredName: anchor.textContent.trim() || `Curso ${id}` } : null;
        }).filter(Boolean),
        (item) => item.id
      );
    }

    function collectCategoryLinks(doc, baseUrl) {
      return Core.uniqueBy(
        [...doc.querySelectorAll(cfg.categoryLinkSelector)].map((anchor) => {
          const href = parseUrl(anchor.getAttribute("href"), baseUrl)?.href;
          const id = href ? getCategoryId(href, baseUrl) : null;
          return id ? { id, url: href } : null;
        }).filter(Boolean),
        (item) => item.id
      );
    }

    async function discoverCourses(context) {
      const { currentDocument, currentUrl, origin, fetchDocument, settings } = context;
      const courseMap = new Map();
      const categoryQueue = [];
      const queuedCategories = new Set();
      const visitedCategories = new Set();
      const warnings = [];

      function absorb(doc, baseUrl) {
        collectCourseLinks(doc, baseUrl).forEach((course) => {
          if (!courseMap.has(course.id)) courseMap.set(course.id, course);
        });
        collectCategoryLinks(doc, baseUrl).forEach((category) => {
          if (!queuedCategories.has(category.id) && !visitedCategories.has(category.id)) {
            queuedCategories.add(category.id);
            categoryQueue.push(category);
          }
        });
      }

      absorb(currentDocument, currentUrl);
      const currentCourseId = getCourseId(currentUrl, origin);
      if (currentCourseId && !courseMap.has(currentCourseId)) {
        courseMap.set(currentCourseId, {
          id: currentCourseId,
          url: `${origin}/course/view.php?id=${encodeURIComponent(currentCourseId)}`,
          discoveredName: currentDocument.querySelector("h1")?.textContent.trim() || `Curso ${currentCourseId}`
        });
      }

      for (const path of cfg.sourcePaths) {
        const url = `${origin}${path}`;
        try {
          absorb(await fetchDocument(url), url);
        } catch (error) {
          warnings.push(`Falha ao ler fonte ${path}: ${error.message}`);
        }
      }

      let categoryPagesRead = 0;
      while (categoryQueue.length && categoryPagesRead < Number(settings.maxCategoryPages || 0)) {
        const category = categoryQueue.shift();
        queuedCategories.delete(category.id);
        if (visitedCategories.has(category.id)) continue;
        visitedCategories.add(category.id);
        categoryPagesRead += 1;
        try {
          absorb(await fetchDocument(category.url), category.url);
        } catch (error) {
          warnings.push(`Falha ao ler categoria ${category.id}: ${error.message}`);
        }
      }

      return {
        courses: [...courseMap.values()],
        categoryPagesRead,
        categoryTraversalTruncated: categoryQueue.length > 0,
        warnings: Core.unique(warnings),
        adapterId: cfg.id
      };
    }

    function extractBreadcrumb(doc) {
      return [...doc.querySelectorAll(cfg.breadcrumbSelector)]
        .map((anchor) => anchor.textContent.trim())
        .filter(Boolean);
    }

    function extractCategoryId(doc, origin) {
      const links = [...doc.querySelectorAll(cfg.breadcrumbSelector)].filter((anchor) => String(anchor.getAttribute("href") || "").includes("categoryid="));
      for (let index = links.length - 1; index >= 0; index -= 1) {
        const id = getCategoryId(links[index].href, origin);
        if (id) return id;
      }
      return "";
    }

    function extractCourseMetadata(doc, courseRef, origin) {
      const titleCandidates = cfg.courseTitleSelectors
        .map((selector) => doc.querySelector(selector)?.textContent)
        .concat(doc.querySelector('meta[property="og:title"]')?.content, courseRef.discoveredName)
        .map((item) => String(item || "").trim())
        .filter(Boolean);
      const name = titleCandidates[0] || "Curso sem nome";
      const categoryPath = extractBreadcrumb(doc);
      const shortnameCandidates = cfg.shortnameSelectors.map((selector) => {
        const element = doc.querySelector(selector);
        return element?.getAttribute?.("data-course-shortname") || element?.textContent || "";
      }).concat(courseRef.discoveredName).map((item) => String(item || "").trim()).filter(Boolean);
      const shortname = shortnameCandidates.find((item) => Core.normalizeText(item) !== Core.normalizeText(name)) || "";

      return {
        name,
        shortname,
        categoryId: extractCategoryId(doc, origin),
        categoryPath,
        adapterId: cfg.id
      };
    }

    function chooseParticipantsTable(doc) {
      const tables = cfg.participantTableSelectors.flatMap((selector) => [...doc.querySelectorAll(selector)]);
      const uniqueTables = Core.uniqueBy(tables, (table) => table);
      const scored = uniqueTables.map((table) => {
        const headers = [...table.querySelectorAll("thead th, tr:first-child th")].map((th) => Core.normalizeText(th.textContent));
        const profileLinks = cfg.profileLinkSelectors.reduce((sum, selector) => sum + table.querySelectorAll(selector).length, 0);
        let score = profileLinks ? 4 : 0;
        if (findHeaderIndex(headers, cfg.roleAliases) >= 0) score += 4;
        if (findHeaderIndex(headers, cfg.nameAliases) >= 0) score += 2;
        if (findHeaderIndex(headers, cfg.emailAliases) >= 0) score += 1;
        return { table, score };
      }).sort((a, b) => b.score - a.score);
      return scored[0]?.score ? scored[0].table : null;
    }

    function extractParticipants(doc, context) {
      const { courseId, origin, host } = context;
      const technicalHost = host || parseUrl(origin, origin)?.host || "moodle";
      const table = chooseParticipantsTable(doc);
      if (!table) {
        return {
          rows: [],
          hasExplicitRoles: false,
          confidence: "baixa",
          warnings: ["Tabela de participantes não identificada."],
          adapterId: cfg.id
        };
      }

      const headerCells = [...table.querySelectorAll("thead th")];
      const fallbackHeaders = headerCells.length ? headerCells : [...table.querySelectorAll("tr:first-child th")];
      const headers = fallbackHeaders.map((th) => Core.normalizeText(th.textContent));
      const roleIndex = findHeaderIndex(headers, cfg.roleAliases);
      const emailIndex = findHeaderIndex(headers, cfg.emailAliases);
      const hasExplicitRoles = roleIndex >= 0;
      const rows = [];

      [...table.querySelectorAll("tbody tr")].forEach((row, index) => {
        const cells = [...row.querySelectorAll("td")];
        const profileLink = cfg.profileLinkSelectors.map((selector) => row.querySelector(selector)).find(Boolean);
        if (!profileLink) return;
        const moodleUserId = getUserId(profileLink.href, origin) || `${courseId}-row-${index}`;
        const roleFallback = cfg.roleFallbackSelectors.map((selector) => row.querySelector(selector)?.textContent.trim()).find(Boolean);
        const roleText = hasExplicitRoles && cells[roleIndex] ? cells[roleIndex].textContent.trim() : roleFallback || row.textContent.trim();
        const email = emailIndex >= 0 && cells[emailIndex]
          ? cells[emailIndex].textContent.trim()
          : row.querySelector('a[href^="mailto:"]')?.textContent.trim() || "";
        rows.push({
          moodleUserId,
          id: `${technicalHost}:${moodleUserId}`,
          name: profileLink.textContent.trim() || `Participante ${index + 1}`,
          email,
          roleText
        });
      });

      return {
        rows,
        hasExplicitRoles,
        confidence: hasExplicitRoles ? "alta" : "média",
        warnings: hasExplicitRoles ? [] : ["Coluna de papéis não identificada. A classificação de estudantes será aproximada."],
        adapterId: cfg.id
      };
    }

    function getMaxParticipantPageIndex(doc, baseUrl) {
      let max = 0;
      [...doc.querySelectorAll('a[href*="page="]')].forEach((anchor) => {
        const parsed = parseUrl(anchor.getAttribute("href"), baseUrl);
        if (!parsed || !parsed.pathname.includes("/user/index.php")) return;
        const page = Number(parsed.searchParams.get("page"));
        if (Number.isInteger(page) && page > max) max = page;
      });
      return max;
    }

    return {
      id: cfg.id,
      environmentName: cfg.environmentName,
      discoverCourses,
      extractCourseMetadata,
      extractParticipants,
      getMaxParticipantPageIndex,
      getCourseId,
      getCategoryId,
      getUserId
    };
  }

  return { createAdapter };
});
