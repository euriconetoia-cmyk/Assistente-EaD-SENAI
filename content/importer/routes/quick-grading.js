(() => {
  'use strict';
  const quickGrading = globalThis.MAT?.importer?.quickGrading;
  quickGrading?.mount?.();
  quickGrading?.observeDownloads?.();
})();
