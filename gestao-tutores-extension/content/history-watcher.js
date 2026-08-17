(() => {
  "use strict";

  const History = globalThis.GestaoTutoresHistory;
  const Defaults = globalThis.GestaoTutoresDefaults;

  async function persist(snapshot) {
    const stored = await chrome.storage.local.get("gestaoTutoresSettings");
    const settings = { ...Defaults.SETTINGS, ...(stored.gestaoTutoresSettings || {}) };
    await History.save(snapshot, Number(settings.historyRetentionDays), settings.ictWeights);
  }

  async function persistWithLock(snapshot) {
    const lockName = `gestao-tutores-history:${snapshot.host}`;
    if (navigator.locks?.request) {
      await navigator.locks.request(lockName, () => persist(snapshot));
      return;
    }
    await persist(snapshot);
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    Object.entries(changes).forEach(([key, change]) => {
      const snapshot = change.newValue;
      if (!key.startsWith("gestaoTutoresSnapshot:") || !snapshot) return;
      if (snapshot.host !== location.host) return;
      if (snapshot.sourceUrl && snapshot.sourceUrl !== location.href) return;
      persistWithLock(snapshot).catch((error) => console.error("Gestão de Tutores: falha ao salvar histórico", error));
    });
  });
})();
