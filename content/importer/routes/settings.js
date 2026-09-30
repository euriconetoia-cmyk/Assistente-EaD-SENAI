(() => {
  'use strict';
  globalThis.MAT = globalThis.MAT || {};
  globalThis.MAT.importerRoutes = globalThis.MAT.importerRoutes || {};
  globalThis.MAT.importerRoutes.readSettings = (callback) => {
    chrome.storage.local.get(['mat_global_settings'], (data) => {
      if (chrome.runtime.lastError) return;
      const settings = globalThis.MAT?.storage?.normalizeSettings(data?.mat_global_settings || {}) || data?.mat_global_settings || {};
      callback(settings);
    });
  };
})();
