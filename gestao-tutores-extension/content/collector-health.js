(() => {
  "use strict";

  if (globalThis.__GESTAO_TUTORES_HEALTH_V041__) return;
  globalThis.__GESTAO_TUTORES_HEALTH_V041__ = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GESTAO_TUTORES_PING") return false;

    const adapters = globalThis.GestaoTutoresAdapters;
    const dependencies = {
      core: Boolean(globalThis.GestaoTutoresCore),
      defaults: Boolean(globalThis.GestaoTutoresDefaults),
      quality: Boolean(globalThis.GestaoTutoresQuality),
      runtime: Boolean(globalThis.GestaoTutoresRuntime),
      adapters: Boolean(adapters),
      roles: Boolean(globalThis.GestaoTutoresRoles),
      institutional: Boolean(globalThis.GestaoTutoresInstitutionalMap)
    };

    sendResponse({
      ok: true,
      host: location.host,
      href: location.href,
      extensionVersion: chrome.runtime.getManifest().version,
      adapterRegistered: Boolean(adapters?.has?.(location.host)),
      dependencies,
      dependenciesReady: Object.values(dependencies).every(Boolean)
    });
    return false;
  });
})();
