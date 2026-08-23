'use strict';

(() => {
  const MAT = globalThis.MAT;

  const normalizeText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const cleanText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  const cleanStudentName = (value = '') => {
    const text = cleanText(value);
    // Moodle can prepend a two-letter avatar initial to a title-cased name in cached DOM text.
    const match = text.match(/^([A-ZÀ-Ý]{2})([A-ZÀ-Ý][a-zà-ÿ'-]+)\s+([A-ZÀ-Ý])/);
    if (!match) return text;
    const initials = normalizeText(match[1]);
    const nameInitials = `${normalizeText(match[2][0])}${normalizeText(match[3])}`;
    return initials === nameInitials ? text.slice(match[1].length) : text;
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const absoluteUrl = (value, base = location.href) => {
    try { return new URL(value, base).href; } catch { return ''; }
  };

  const MOODLE_HOSTS = new Set(['ead.fieg.com.br', 'ead.senai.br']);

  const isAllowedMoodleUrl = (value, base = location.href) => {
    try {
      const url = new URL(value, base);
      // location.hostname and mock.local are included only for local parser fixtures.
      // In production, this content script can run exclusively on an approved host.
      const localFixture = location.protocol === 'about:' && url.hostname === 'mock.local';
      return url.protocol === 'https:' && (MOODLE_HOSTS.has(url.hostname) || url.hostname === location.hostname || localFixture);
    } catch {
      return false;
    }
  };

  const isAllowedNavigationUrl = (value, base = location.href) => {
    if (isAllowedMoodleUrl(value, base)) return true;
    try {
      const url = new URL(value, base);
      return url.protocol === 'https:' && url.hostname === 'wa.me';
    } catch {
      return false;
    }
  };

  const getQueryNumber = (url, key) => {
    try {
      const raw = new URL(url, location.href).searchParams.get(key);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch { return null; }
  };

  const parseCourseId = (doc = document) => {
    const pathname = location.pathname.replace(/\/+/g, '/');
    const fromUrl = getQueryNumber(location.href, 'id')
      || getQueryNumber(location.href, 'courseid')
      || getQueryNumber(location.href, 'course');
    // Only `course/view` routes own an `id` that is necessarily a course ID.
    // Other /course routes may use ids for categories, sections or editing forms.
    const directCourseRoute = /^\/course\/(?:view(?:\.php)?(?:\/|$)|\d+(?:\/|$))/i.test(pathname);
    if (directCourseRoute && fromUrl) return fromUrl;

    // Também aceita instalações que usam URLs amigáveis, por exemplo:
    // /course/34410, /course/view/34410 ou /course/view.php/34410.
    const pathMatch = pathname.match(/\/course\/(?:view(?:\.php)?\/)?(\d+)(?:\/|$)/i);
    if (pathMatch && Number(pathMatch[1]) > 0) return Number(pathMatch[1]);

    const bodyClasses = Array.from(doc.body?.classList || []);
    for (const className of bodyClasses) {
      const match = className.match(/^course-(\d+)$/);
      if (match && Number(match[1]) > 0) return Number(match[1]);
    }

    const dataCourseId = Number(
      doc.body?.dataset?.courseid
      || doc.documentElement?.dataset?.courseid
      || doc.querySelector('[data-courseid]')?.getAttribute('data-courseid')
      || 0
    );
    if (dataCourseId > 0) return dataCourseId;

    const canonical = doc.querySelector('link[rel="canonical"][href*="/course/"]')?.href;
    if (canonical) {
      const canonicalId = getQueryNumber(canonical, 'id')
        || Number(new URL(canonical, location.href).pathname.match(/\/course\/(?:view(?:\.php)?\/)?(\d+)(?:\/|$)/i)?.[1] || 0);
      if (canonicalId > 0) return canonicalId;
    }

    const canUseContextLink = /\/(?:mod|grade|report|user)\//i.test(location.pathname)
      || /\/(?:course)\/(?:completion|management|edit|view)/i.test(location.pathname);
    const contextLink = canUseContextLink ? doc.querySelector('a[href*="/course/view.php?id="]') : null;
    return contextLink ? getQueryNumber(contextLink.href, 'id') : null;
  };

  const isCourseRoute = () => {
    const pathname = (location.pathname || '/').replace(/\/+/g, '/');
    if (!/^\/course(?:\/|$)/i.test(pathname)) return false;

    const viewPathMatch = pathname.match(/^\/course\/(?:view(?:\.php)?(?:\/|$)|\d+(?:\/|$))/i);
    if (!viewPathMatch) return false;

    const fromUrl = getQueryNumber(location.href, 'id')
      || getQueryNumber(location.href, 'courseid')
      || getQueryNumber(location.href, 'course');
    if (fromUrl) return true;

    const pathMatch = pathname.match(/^\/course\/(?:view(?:\.php)?\/)?(\d+)(?:\/|$)/i);
    return Boolean(pathMatch && Number(pathMatch[1]) > 0);
  };

  const isMoodleEditing = (doc = document) => {
    try {
      const edit = new URL(location.href).searchParams.get('edit');
      if (edit === 'on' || edit === '1' || edit === 'true') return true;
    } catch (_) { /* Fall through to DOM markers. */ }
    const bodyClasses = Array.from(doc.body?.classList || []);
    if (bodyClasses.some((className) => /(?:^|[-_])editing(?:$|[-_])|editmode/i.test(className))) return true;
    return Boolean(doc.querySelector?.('[data-editing="true"], .editing .section, .course-content.editing'));
  };

  const isMoodleAuthoringPage = (doc = document) => {
    const pathname = String(location.pathname || '').replace(/\/+$/, '');
    return isMoodleEditing(doc)
      || /\/course\/(?:modedit|edit)\.php$/i.test(pathname)
      || /\/mod\/[^/]+\/(?:modform|edit)\.php$/i.test(pathname);
  };

  const parseNumber = (value) => {
    if (value === null || value === undefined) return null;
    const raw = cleanText(value);
    if (!raw || !/\d/.test(raw)) return null;
    const text = raw
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    if (!text || !/\d/.test(text)) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  };

  const parseGrade = (value) => {
    const raw = cleanText(value);
    const normalized = normalizeText(raw);
    if (!raw || /^(?:-|—|–|n\/?a)$/i.test(raw)) return null;
    if (/sem nota|nenhuma nota|nao avaliado|not graded|no grade|ungraded|escolha|select/.test(normalized)) return null;
    const number = parseNumber(raw);
    if (number === null || number === -1) return null;
    return number;
  };

  const parseDate = (value) => {
    if (!value) return null;
    const text = cleanText(value);

    const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (iso) {
      const [, y, m, d, hh = '23', mm = '59'] = iso;
      const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const br = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})(?:\s+(?:às\s*)?(\d{1,2}):(\d{2}))?/i);
    if (br) {
      const [, d, m, y, hh = '23', mm = '59'] = br;
      const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const months = {
      janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
      julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const long = normalizeText(text).match(/\b(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(20\d{2})(?:.*?(\d{1,2}):(\d{2}))?/i)
      || normalizeText(text).match(/\b([a-z]+)\s+(\d{1,2}),?\s+(20\d{2})(?:.*?(\d{1,2}):(\d{2}))?/i);
    if (long) {
      let day; let monthName; let year; let hh = '23'; let mm = '59';
      if (/^\d/.test(long[1])) [day, monthName, year, hh = '23', mm = '59'] = long.slice(1);
      else [monthName, day, year, hh = '23', mm = '59'] = long.slice(1);
      const month = months[monthName];
      if (month !== undefined) {
        const date = new Date(Number(year), month, Number(day), Number(hh), Number(mm));
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }
    return null;
  };

  const extractDates = (value = '') => {
    const text = cleanText(value);
    const matches = [];
    const patterns = [
      /\b20\d{2}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2})?\b/g,
      /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2}(?:\s+(?:às\s*)?\d{1,2}:\d{2})?\b/gi,
      /\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+20\d{2}(?:.*?\d{1,2}:\d{2})?/gi,
      /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+20\d{2}(?:.*?\d{1,2}:\d{2})?/gi
    ];
    patterns.forEach((pattern) => {
      for (const match of text.matchAll(pattern)) {
        const date = parseDate(match[0]);
        if (date && !Number.isNaN(date.getTime())) matches.push({ text: match[0], date, index: match.index || 0 });
      }
    });
    return uniqueBy(matches.sort((a, b) => a.index - b.index), (item) => item.date.toISOString().slice(0, 10));
  };

  const localIso = (date) => {
    const pad = (value, size = 2) => String(value).padStart(size, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  };

  const parseDateRange = (value = '') => {
    const dates = extractDates(value);
    if (!dates.length) return { start: null, end: null, dates: [], complete: false };
    if (dates.length === 1) {
      const normalized = normalizeText(value);
      const only = dates[0].date;
      const asIso = localIso(only);
      if (/termino|término|fim|encerra|encerramento|ate|até|end date|until|due/.test(normalized)) {
        return { start: null, end: asIso, dates: dates.map((item) => item.text), complete: false };
      }
      if (/inicio|início|comeca|começa|start date|from/.test(normalized)) {
        return { start: asIso, end: null, dates: dates.map((item) => item.text), complete: false };
      }
      return { start: null, end: null, dates: dates.map((item) => item.text), complete: false };
    }
    const sorted = dates.map((item) => item.date).sort((a, b) => a - b);
    const start = new Date(sorted[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(sorted[sorted.length - 1]);
    end.setHours(23, 59, 59, 999);
    return { start: localIso(start), end: localIso(end), dates: dates.map((item) => item.text), complete: true };
  };

  const parseRelativeDays = (value) => {
    const text = normalizeText(value);
    if (!text) return null;
    if (/nunca|never/.test(text)) return 9999;
    if (/agora|now|segundo|second|minuto|minute|hora|hour/.test(text) && !/dia|day|semana|week|mes|month|ano|year/.test(text)) return 0;

    const matchers = [
      { re: /(\d+)\s*(?:ano|anos|year|years)/, multiplier: 365 },
      { re: /(\d+)\s*(?:mes|meses|month|months)/, multiplier: 30 },
      { re: /(\d+)\s*(?:semana|semanas|week|weeks)/, multiplier: 7 },
      { re: /(\d+)\s*(?:dia|dias|day|days)/, multiplier: 1 }
    ];
    let total = 0;
    let found = false;
    for (const item of matchers) {
      const match = text.match(item.re);
      if (match) {
        total += Number(match[1]) * item.multiplier;
        found = true;
      }
    }
    return found ? total : null;
  };

  const daysUntil = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return Math.ceil((date.getTime() - Date.now()) / 86400000);
  };

  const formatDate = (value, includeTime = false) => {
    if (!value) return 'Não identificado';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não identificado';
    return new Intl.DateTimeFormat('pt-BR', includeTime
      ? { dateStyle: 'short', timeStyle: 'short' }
      : { dateStyle: 'short' }).format(date);
  };

  const formatRelativeDays = (days) => {
    if (days === null || days === undefined) return 'Não identificado';
    if (days >= 9999) return 'Nunca acessou';
    if (days === 0) return 'Acesso hoje';
    if (days === 1) return 'Há 1 dia';
    return `Há ${days} dias`;
  };

  const uniqueBy = (items, keyFn) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = keyFn(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const mapWithConcurrency = async (items, limit, worker, onProgress) => {
    const results = new Array(items.length);
    let nextIndex = 0;
    let completed = 0;
    const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        try {
          results[index] = await worker(items[index], index);
        } catch (error) {
          results[index] = { error: error?.message || String(error), item: items[index] };
        } finally {
          completed += 1;
          onProgress?.(completed, items.length, items[index]);
        }
      }
    });
    await Promise.all(runners);
    return results;
  };

  const hash = (input = '') => {
    let value = 2166136261;
    for (const char of String(input)) {
      value ^= char.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return (value >>> 0).toString(36);
  };

  const downloadBlob = (content, filename, type = 'application/json;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.documentElement.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  MAT.utils = {
    normalizeText,
    cleanText,
    cleanStudentName,
    escapeHtml,
    absoluteUrl,
    isAllowedMoodleUrl,
    isAllowedNavigationUrl,
    getQueryNumber,
    parseCourseId,
    isCourseRoute,
    isMoodleEditing,
    isMoodleAuthoringPage,
    parseNumber,
    parseGrade,
    parseDate,
    extractDates,
    parseDateRange,
    parseRelativeDays,
    daysUntil,
    formatDate,
    formatRelativeDays,
    uniqueBy,
    sleep,
    mapWithConcurrency,
    hash,
    downloadBlob
  };
})();
