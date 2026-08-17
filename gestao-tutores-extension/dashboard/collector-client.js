(() => {
  "use strict";

  const CONTENT_FILES = [
    "shared/core.js",
    "shared/defaults.js",
    "shared/quality.js",
    "metrics/workload.js",
    "storage/history.js",
    "collectors/runtime.js",
    "adapters/registry.js",
    "adapters/moodle-base.js",
    "adapters/moodle-goias.js",
    "adapters/moodle-ctm.js",
    "domain/roles.js",
    "domain/institutional-map.js",
    "content/collector.js",
    "content/history-watcher.js",
    "content/launcher.js"
  ];

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function send(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(response);
      });
    });
  }

  async function ping(tabId) {
    const response = await send(tabId, { type: "GESTAO_TUTORES_PING" });
    if (!response?.ok) throw new Error(response?.error || "O coletor não respondeu ao diagnóstico.");
    return response;
  }

  async function inject(tabId) {
    if (!chrome.scripting?.executeScript) {
      throw new Error("A extensão não possui acesso ao mecanismo de reinjeção do coletor.");
    }
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: CONTENT_FILES
    });
  }

  async function ensureReady(tabId) {
    try {
      const diagnostic = await ping(tabId);
      return { injected: false, diagnostic };
    } catch (firstError) {
      await inject(tabId);
      await delay(150);
      try {
        const diagnostic = await ping(tabId);
        return { injected: true, diagnostic };
      } catch (secondError) {
        throw new Error(`Não foi possível ativar o coletor na aba do Moodle. Atualize a aba e tente novamente. Detalhe: ${secondError.message || firstError.message}`);
      }
    }
  }

  async function collect(tabId, mode) {
    const readiness = await ensureReady(tabId);
    const response = await send(tabId, {
      type: "GESTAO_TUTORES_COLLECT",
      mode: mode === "incremental" ? "incremental" : "full"
    });
    return { ...response, collectorDiagnostic: readiness.diagnostic, collectorInjected: readiness.injected };
  }

  async function cancel(tabId) {
    await ensureReady(tabId);
    return send(tabId, { type: "GESTAO_TUTORES_CANCEL" });
  }

  globalThis.GestaoTutoresCollectorClient = {
    ensureReady,
    ping,
    collect,
    cancel
  };
})();
