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
    "content/collector-health.js",
    "content/history-watcher.js",
    "content/launcher.js"
  ];

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    if (!response?.ok) throw new Error(response?.error || "O diagnóstico do coletor não respondeu.");
    if (!response.dependenciesReady || !response.adapterRegistered) {
      throw new Error("Os módulos de coleta do Moodle não foram inicializados completamente.");
    }
    return response;
  }

  async function waitForTabComplete(tabId, timeoutMs = 25000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const tab = await chrome.tabs.get(tabId);
      if (tab?.status === "complete") {
        await delay(500);
        return tab;
      }
      await delay(200);
    }
    throw new Error("A página do Moodle demorou demais para recarregar.");
  }

  async function reloadAndWait(tabId) {
    await chrome.tabs.reload(tabId);
    return waitForTabComplete(tabId);
  }

  async function inject(tabId) {
    if (!chrome.scripting?.executeScript) {
      throw new Error("O navegador não disponibilizou a reinjeção automática do coletor.");
    }
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: CONTENT_FILES
    });
    await delay(250);
  }

  async function ensureReady(tabId) {
    try {
      return { recovery: "none", diagnostic: await ping(tabId) };
    } catch (_firstError) {
      try {
        await reloadAndWait(tabId);
        return { recovery: "reload", diagnostic: await ping(tabId) };
      } catch (_reloadError) {
        await inject(tabId);
        try {
          return { recovery: "injection", diagnostic: await ping(tabId) };
        } catch (finalError) {
          throw new Error(`Não foi possível ativar o coletor na aba do Moodle. Detalhe: ${finalError.message}`);
        }
      }
    }
  }

  async function collect(tabId, mode) {
    const ready = await ensureReady(tabId);
    let response = await send(tabId, {
      type: "GESTAO_TUTORES_COLLECT",
      mode: mode === "incremental" ? "incremental" : "full"
    });

    if (response === undefined) {
      await reloadAndWait(tabId);
      await ping(tabId);
      response = await send(tabId, {
        type: "GESTAO_TUTORES_COLLECT",
        mode: mode === "incremental" ? "incremental" : "full"
      });
    }

    if (!response) {
      throw new Error("O Moodle está conectado, mas o módulo de coleta não respondeu. Recarregue a extensão e tente novamente.");
    }
    if (response.ok && Number(response.snapshot?.discoveredCourses || 0) === 0) {
      return {
        ok: false,
        error: "O coletor foi ativado, mas nenhum curso Moodle foi descoberto. Abra uma página com acesso aos cursos e tente Reconstruir base novamente.",
        diagnostic: ready.diagnostic
      };
    }
    return { ...response, collectorRecovery: ready.recovery, collectorDiagnostic: ready.diagnostic };
  }

  async function cancel(tabId) {
    await ensureReady(tabId);
    return send(tabId, { type: "GESTAO_TUTORES_CANCEL" });
  }

  globalThis.GestaoTutoresCollectorClient = { ensureReady, ping, collect, cancel };
})();
