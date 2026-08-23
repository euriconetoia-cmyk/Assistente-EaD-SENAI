'use strict';

(() => {
  const MAT = globalThis.MAT;
  const PORTUGUESE_LANGUAGE = 'pt_br';

  const getPortugueseUrl = (href = location.href) => {
    const url = new URL(href, location.href);
    url.searchParams.set('lang', PORTUGUESE_LANGUAGE);
    return url.href;
  };

  const pageUsesEnglish = (doc = document) => {
    const language = String(doc.documentElement?.lang || '').toLowerCase();
    if (/^en(?:-|_|$)/.test(language)) return true;
    return [...(doc.body?.classList || [])].some((className) => /(?:^|-)lang-en(?:-|$)/i.test(className));
  };

  const hasPortugueseRequest = (href = location.href) => new URL(href, location.href).searchParams.get('lang') === PORTUGUESE_LANGUAGE;

  const requestPortuguese = () => {
    if (!pageUsesEnglish() || hasPortugueseRequest()) return false;
    try {
      // The explicit `lang=pt_br` parameter prevents loops. Include the query
      // so an English page for another course/report is not skipped.
      const key = `mat_portuguese_requested:${location.pathname}${location.search}`;
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
    } catch (_) {
      // The lang parameter itself prevents a redirect loop when session storage is unavailable.
    }
    location.replace(getPortugueseUrl());
    return true;
  };

  MAT.language = { PORTUGUESE_LANGUAGE, getPortugueseUrl, pageUsesEnglish, hasPortugueseRequest, requestPortuguese };
  chrome.storage.local.get(['mat_global_settings'], (data) => {
    if (chrome.runtime.lastError) return;
    if (data?.mat_global_settings?.forcePortuguese === true) requestPortuguese();
  });
})();
