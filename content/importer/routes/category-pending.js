(() => {
  'use strict';
  const categoryPending = globalThis.MAT?.importer?.categoryPending;
  categoryPending?.mountSummary?.();
  globalThis.MAT?.importerRoutes?.readSettings?.((settings) => {
    if (settings.enableAutomaticCategoryScan === true) categoryPending.observe?.();
  });
})();
