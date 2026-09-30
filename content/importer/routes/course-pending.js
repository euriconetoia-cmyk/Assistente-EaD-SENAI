(() => {
  'use strict';
  const coursePending = globalThis.MAT?.importer?.coursePending;
  coursePending?.mountSummary?.();
  globalThis.MAT?.importerRoutes?.readSettings?.((settings) => {
    if (settings.enableAutomaticCourseScan === true) coursePending.observe?.();
  });
})();
