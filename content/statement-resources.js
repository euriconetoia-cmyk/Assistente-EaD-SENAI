'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;
  const MAX_STATEMENT_BYTES = 25 * 1024 * 1024;

  const statementTitle = (value) => {
    let name = U.normalizeText(value || '').replace(/[_–—-]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (let count = 0; count < 3; count += 1) {
      const next = name.replace(/^(?:envio\s+(?:da|do|de)?\s*|enunciado\s+(?:da|do|de)?\s*|atividade\s+(?:da|do|de)?\s*)/, '').trim();
      if (next === name) break;
      name = next;
    }
    return name.replace(/\s+(?:enunciado|orientacoes|instrucoes|atividade)$/, '').trim();
  };

  const matchingResources = (sections, assignment) => {
    const target = statementTitle(assignment?.name);
    if (!target) return [];
    const sectionId = String(assignment.sectionId || '');
    const sectionName = U.normalizeText(assignment.sectionName || '');
    if (!sectionId && !sectionName) return [];
    const byId = sectionId ? (sections || []).filter((section) => String(section.id) === sectionId) : [];
    const byName = sectionName ? (sections || []).filter((section) => U.normalizeText(section.name) === sectionName) : [];
    const scoped = byId.length ? byId : byName.length === 1 ? byName : [];
    const matches = [];
    for (const section of scoped) {
      for (const activity of section.activities || []) {
        if (activity.moduleType !== 'resource' || statementTitle(activity.name) !== target || !activity.cmid || !activity.url) continue;
        let url;
        try { url = new URL(activity.url, location.origin); } catch { continue; }
        if (url.origin !== location.origin || url.pathname !== '/mod/resource/view.php' || Number(url.searchParams.get('id')) !== Number(activity.cmid)) continue;
        matches.push({ cmid: Number(activity.cmid), name: activity.name, url: url.href, section: section.name });
      }
    }
    return matches.slice(0, 3);
  };

  const safeFileName = (name) => String(name || 'enunciado_sap')
    .replace(/[\\/\x00-\x1f:*?"<>|]/g, '_').trim().slice(0, 110) || 'enunciado_sap';

  const resourceFileName = (response, fallback) => {
    const disposition = response.headers?.get('content-disposition') || '';
    const encoded = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1]?.trim().replace(/^"|"$/g, '');
    const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1]?.trim();
    let name = encoded || plain || '';
    try { name = decodeURIComponent(name); } catch { /* Preserve the original header. */ }
    if (!name) {
      try { name = decodeURIComponent(new URL(response.url).pathname.split('/').pop() || ''); } catch { name = ''; }
    }
    if (!name || /^(?:view\.php|pluginfile\.php)$/i.test(name)) {
      const mime = response.headers?.get('content-type') || '';
      const ext = /pdf/i.test(mime) ? '.pdf' : /wordprocessingml/i.test(mime) ? '.docx' : /msword/i.test(mime) ? '.doc' : '';
      name = `${fallback}${ext}`;
    }
    return safeFileName(name);
  };

  const fetchStatementResource = async (resource) => {
    const base = new URL(resource.url);
    if (!U.isAllowedMoodleUrl(base.href) || base.origin !== location.origin) throw new Error('Recurso SAP fora do Moodle atual.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      let requestUrl = base.href;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(requestUrl, { credentials: 'include', cache: 'no-store', redirect: 'follow', signal: controller.signal });
        const finalUrl = new URL(response.url);
        if (!response.ok || finalUrl.origin !== base.origin || finalUrl.protocol !== 'https:' || /\/login\//i.test(finalUrl.pathname)) throw new Error('Recurso SAP indisponível, sessão expirada ou redirecionamento não autorizado.');
        const contentLength = Number(response.headers?.get('content-length'));
        if (Number.isFinite(contentLength) && contentLength > MAX_STATEMENT_BYTES) throw new Error('Recurso SAP excede o limite de 25 MB.');
        const mime = response.headers?.get('content-type') || '';
        if (/text\/html/i.test(mime)) {
          if (attempt) throw new Error('O Moodle devolveu HTML em vez do arquivo SAP.');
          const html = await response.text();
          if (html.length > 2 * 1024 * 1024) throw new Error('Página do recurso SAP maior que o permitido.');
          if (/name=["']username["']/i.test(html) && /name=["']password["']/i.test(html)) throw new Error('Sessão do Moodle expirada.');
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const links = [...doc.querySelectorAll('a[href], iframe[src], embed[src], object[data]')];
          const fileLink = links.map((node) => node.getAttribute('href') || node.getAttribute('src') || node.getAttribute('data'))
            .map((href) => { try { return new URL(href, response.url); } catch { return null; } })
            .find((url) => url && url.origin === base.origin && (
              /\/pluginfile\.php\/\d+\/mod_resource\/content\//i.test(url.pathname)
              || url.pathname === '/mod/resource/view.php' && Number(url.searchParams.get('id')) === resource.cmid && url.searchParams.get('redirect') === '1'
            ));
          if (!fileLink) throw new Error('O arquivo SAP não apareceu na página do recurso. Confira manualmente no Moodle.');
          requestUrl = fileLink.href;
          continue;
        }
        if (/\/mod\/resource\/view\.php/i.test(finalUrl.pathname) && !/attachment|pdf|image|word|octet-stream/i.test(`${mime} ${response.headers?.get('content-disposition') || ''}`)) throw new Error('A página do recurso não forneceu um arquivo identificável.');
        const chunks = [];
        let length = 0;
        if (response.body?.getReader) {
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              length += value.length;
              if (length > MAX_STATEMENT_BYTES) throw new Error('Recurso SAP excede o limite de 25 MB.');
              chunks.push(value);
            }
          } finally { reader.releaseLock(); }
        } else {
          const bytes = new Uint8Array(await response.arrayBuffer());
          length = bytes.length;
          if (length > MAX_STATEMENT_BYTES) throw new Error('Recurso SAP excede o limite de 25 MB.');
          chunks.push(bytes);
        }
        if (!length) throw new Error('Arquivo SAP vazio.');
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        return { name: resourceFileName(response, `SAP_${resource.cmid}`), bytes, url: response.url, source: resource.url };
      }
      throw new Error('Arquivo SAP não encontrado.');
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Tempo limite ao baixar o recurso SAP.');
      throw error;
    } finally { clearTimeout(timer); }
  };

  MAT.statementResources = { statementTitle, matchingResources, fetchStatementResource };
})();
