(() => {
  "use strict";

  const Client = globalThis.GestaoTutoresCollectorClient;
  const environment = document.querySelector("#environment-select");
  const quickButton = document.querySelector("#btn-quick");
  const fullButton = document.querySelector("#btn-collect");
  const cancelButton = document.querySelector("#btn-cancel");
  const status = document.querySelector("#status-text");
  const progress = document.querySelector("#collection-progress");
  const progressTitle = document.querySelector("#progress-title");
  const progressCounter = document.querySelector("#progress-counter");
  const progressBar = document.querySelector("#progress-bar");
  const progressCourse = document.querySelector("#progress-course");
  let busy = false;

  async function findSelectedMoodleTab() {
    const host = environment?.value;
    if (!host) throw new Error("Selecione o ambiente Moodle antes da coleta.");
    const tabs = await chrome.tabs.query({ url: [`https://${host}/*`] });
    if (!tabs.length) throw new Error(`Nenhuma aba aberta de ${host}. Abra o Moodle autenticado e tente novamente.`);
    return [...tabs].sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }

  function setBusy(value) {
    busy = value;
    quickButton.disabled = value;
    fullButton.disabled = value;
    cancelButton.disabled = false;
  }

  function showStage(title, text, percent = 4) {
    progress.classList.remove("hidden");
    progressTitle.textContent = title;
    progressCounter.textContent = percent < 100 ? "Em andamento" : "Concluído";
    progressBar.style.width = `${percent}%`;
    progressCourse.textContent = text;
  }

  async function run(mode) {
    if (busy) return;
    setBusy(true);
    status.className = "";
    status.textContent = "Conectando ao Moodle...";
    showStage(mode === "incremental" ? "Atualização rápida" : "Reconstruindo base", "Verificando a aba do Moodle e ativando o coletor...", 4);

    try {
      const tab = await findSelectedMoodleTab();
      const response = await Client.collect(tab.id, mode);
      if (!response?.ok) {
        if (response?.cancelled) throw new Error("Coleta cancelada. O último snapshot válido foi preservado.");
        throw new Error(response?.error || "A coleta não retornou dados.");
      }

      const snapshot = response.snapshot;
      status.className = "status-ok";
      status.textContent = `${snapshot.environment || snapshot.host}: ${snapshot.processedCourses || 0}/${snapshot.discoveredCourses || 0} cursos processados.`;
      showStage(
        "Coleta concluída",
        `${snapshot.discoveredCourses || 0} curso(s) descoberto(s), ${snapshot.processedCourses || 0} processado(s). Recuperação do coletor: ${response.collectorRecovery || "none"}.`,
        100
      );
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      status.className = "status-error";
      status.textContent = error.message;
      showStage("Falha na coleta", error.message, 4);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    try {
      const tab = await findSelectedMoodleTab();
      const response = await Client.cancel(tab.id);
      status.className = "";
      status.textContent = response?.cancelled
        ? "Cancelamento solicitado. O último snapshot válido será preservado."
        : "Não havia coleta em andamento.";
    } catch (error) {
      status.className = "status-error";
      status.textContent = `Falha ao cancelar: ${error.message}`;
    }
  }

  quickButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    run("incremental");
  }, true);

  fullButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    run("full");
  }, true);

  cancelButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    cancel();
  }, true);
})();
