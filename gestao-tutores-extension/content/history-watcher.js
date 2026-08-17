(() => {
  "use strict";

  const History = globalThis.GestaoTutoresHistory;
  const Defaults = globalThis.GestaoTutoresDefaults;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    Object.entries(changes).forEach(([key, change]) => {
      if (!key.startsWith("gestaoTutoresSnapshot:") || !change.newValue) return;
      Promise.resolve()
        .then(async () => {
          const stored = await chrome.storage.local.get("gestaoTutoresSettings");
          const settings = { ...Defaults.SETTINGS, ...(stored.gestaoTutoresSettings || {}) };
          await History.save(change.newValue, Number(settings.historyRetentionDays), settings.ictWeights);
        })
        .catch((error) => console.error("Gestão de Tutores: falha ao salvar histórico", error));
    });
  });
})();
