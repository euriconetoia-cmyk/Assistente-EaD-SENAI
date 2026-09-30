(() => {
  'use strict';
  globalThis.MAT = globalThis.MAT || {};
  globalThis.MAT.importerState = globalThis.MAT.importerState || {};
  globalThis.MAT.importerState.myCourses = {
    courses: [],
    results: new Map(),
    running: false,
    completedAt: null,
    inventoryPartial: false,
  };
})();
