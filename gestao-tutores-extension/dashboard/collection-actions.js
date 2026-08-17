(() => {
  "use strict";

  const quickButton = document.querySelector("#btn-quick");
  const fullButton = document.querySelector("#btn-collect");
  const cancelButton = document.querySelector("#btn-cancel");
  const environment = document.querySelector("#environment-select");
  const status = document.querySelector("#status-text");
  const progress = document.querySelector("#collection-progress");
  const progressTitle = document.querySelector("#progress-title");
  const progressCourse = document.querySelector("#progress-course");

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

  function setQuickBusy(busy) {
    quickButton.disabled = busy;
    if (busy) fullButton.disabled = true;
    else if (!document.querySelector("#collection-progress:not(.hidden)")) fullButton.disabled = false;
  }

  async function quickUpdate() {
    setQuickBusy(true);
    progress.classList.remove("hidden");
    progressTitle.textContent = "Atualização rápida";
    progressCourse.textContent = "Validando cache e consultando alterações necessárias...";
    status.className = "";
    status.textContent = "Atualização rápida em andamento.";

    try {
      const tab = await findSelectedMoodleTab();
      const response = await sendMessage(tab.id, { type: "GESTAO_TUTORES_COLLECT", mode: "incremental" });
      if (!response?.ok) {
        if (response?.cancelled) throw new Error("Atualização cancelada. O último snapshot válido foi preservado.");
        throw new Error(response?.error || "Falha na atualização rápida.");
      }
      status.className = "status-ok";
      status.textContent = `Atualização rápida concluída. ${response.snapshot.reusedCourses || 0} curso(s) reutilizados e ${response.snapshot.refreshedCourses || 0} atualizado(s).`;
      setTimeout(() => location.reload(), 600);
    } catch (error) {
      status.className = "status-error";
      status.textContent = error.message;
      progressTitle.textContent = "Atualização rápida interrompida";
      progressCourse.textContent = error.message;
    } finally {
      setQuickBusy(false);
    }
  }

  async function cancelCollection() {
    cancelButton.disabled = true;
    try {
      const tab = await findSelectedMoodleTab();
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

  quickButton.addEventListener("click", () => quickUpdate());
  cancelButton.addEventListener("click", () => cancelCollection());
})();
