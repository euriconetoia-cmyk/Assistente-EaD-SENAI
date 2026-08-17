(() => {
  "use strict";

  const quickButton = document.querySelector("#btn-quick");
  const fullButton = document.querySelector("#btn-collect");
  const cancelButton = document.querySelector("#btn-cancel");
  const environment = document.querySelector("#environment-select");
  const status = document.querySelector("#status-text");
  const progress = document.querySelector("#collection-progress");
  const progressTitle = document.querySelector("#progress-title");
  const progressCounter = document.querySelector("#progress-counter");
  const progressBar = document.querySelector("#progress-bar");
  const progressCourse = document.querySelector("#progress-course");

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

  function loadSupplementalDashboard() {
    if (document.querySelector('script[data-gestao-monitor-view]')) return;
    const script = document.createElement("script");
    script.dataset.gestaoMonitorView = "true";
    script.src = chrome.runtime.getURL("dashboard/monitor-view.js");
    document.head.appendChild(script);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function findSelectedMoodleTab() {
    const host = environment?.value;
    if (!host) throw new Error("Selecione um ambiente Moodle.");
    const tabs = await chrome.tabs.query({ url: [`https://${host}/*`] });
    if (!tabs.length) throw new Error("Nenhuma aba autenticada do Moodle selecionado está aberta.");
    return [...tabs].sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }

  function sendMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(response);
      });
    });
  }

  async function ping(tabId) {
    const response = await sendMessage(tabId, { type: "GESTAO_TUTORES_PING" });
    if (!response?.ok) throw new Error(response?.error || "O coletor não respondeu ao diagnóstico.");
    return response;
  }

  async function injectCollector(tabId) {
    if (!chrome.scripting?.executeScript) throw new Error("Permissão de reinjeção do coletor indisponível.");
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: CONTENT_FILES
    });
  }

  async function ensureReady(tabId) {
    try {
      return { injected: false, diagnostic: await ping(tabId) };
    } catch {
      progressCourse.textContent = "Ativando o coletor na aba do Moodle...";
      await injectCollector(tabId);
      await delay(200);
      return { injected: true, diagnostic: await ping(tabId) };
    }
  }

  function setBusy(busy) {
    quickButton.disabled = busy;
    fullButton.disabled = busy;
    cancelButton.disabled = false;
  }

  function beginProgress(title, text) {
    progress.classList.remove("hidden");
    progressTitle.textContent = title;
    progressCounter.textContent = "Preparando";
    progressBar.style.width = "2%";
    progressCourse.textContent = text;
    status.className = "";
    status.textContent = `${title} em andamento.`;
  }

  async function runCollection(mode) {
    const isQuick = mode === "incremental";
    setBusy(true);
    beginProgress(isQuick ? "Atualização rápida" : "Reconstruindo base", "Verificando a aba do Moodle e ativando o coletor...");

    try {
      const tab = await findSelectedMoodleTab();
      const readiness = await ensureReady(tab.id);
      progressCourse.textContent = `Coletor ativo: ${readiness.diagnostic.adapterId || readiness.diagnostic.host}. Iniciando descoberta de cursos...`;
      const response = await sendMessage(tab.id, { type: "GESTAO_TUTORES_COLLECT", mode });
      if (!response?.ok) {
        if (response?.cancelled) throw new Error("Coleta cancelada. O último snapshot válido foi preservado.");
        throw new Error(response?.error || "Falha na coleta.");
      }

      const snapshot = response.snapshot;
      status.className = "status-ok";
      status.textContent = isQuick
        ? `Atualização rápida concluída. ${snapshot.reusedCourses || 0} curso(s) reutilizados e ${snapshot.refreshedCourses || 0} atualizado(s).`
        : `Reconstrução concluída. ${snapshot.processedCourses || 0} de ${snapshot.discoveredCourses || 0} curso(s) processados.`;
      progressBar.style.width = "100%";
      progressCounter.textContent = "Concluído";
      progressCourse.textContent = `Completos: ${snapshot.quality?.completeCourses || 0}, parciais: ${snapshot.quality?.partialCourses || 0}, erros: ${snapshot.quality?.errorCourses || 0}.`;
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      status.className = "status-error";
      status.textContent = error.message;
      progressTitle.textContent = "Falha na coleta";
      progressCourse.textContent = error.message;
    } finally {
      setBusy(false);
    }
  }

  async function cancelCollection() {
    cancelButton.disabled = true;
    try {
      const tab = await findSelectedMoodleTab();
      await ensureReady(tab.id);
      const response = await sendMessage(tab.id, { type: "GESTAO_TUTORES_CANCEL" });
      status.className = "";
      status.textContent = response?.cancelled
        ? "Cancelamento solicitado. O último snapshot válido será preservado."
        : "Não havia coleta em andamento neste ambiente.";
    } catch (error) {
      status.className = "status-error";
      status.textContent = `Não foi possível cancelar: ${error.message}`;
    } finally {
      cancelButton.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("#btn-quick, #btn-collect, #btn-cancel");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.id === "btn-cancel") cancelCollection();
    else if (button.id === "btn-quick") runCollection("incremental");
    else runCollection("full");
  }, true);

  loadSupplementalDashboard();
})();
