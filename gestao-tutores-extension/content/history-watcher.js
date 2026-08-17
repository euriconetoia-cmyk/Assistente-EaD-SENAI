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
          const retention = Number(stored.gestaoTutoresSettings?.historyRetentionDays || Defaults.SETTINGS.historyRetentionDays);
          await History.save(change.newValue, retention);
        })
        .catch((error) => console.error("Gestão de Tutores: falha ao salvar histórico", error));
    });
  });
})();
