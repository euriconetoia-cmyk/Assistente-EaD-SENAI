(() => {
  'use strict';
  globalThis.MAT = globalThis.MAT || {};
  globalThis.MAT.importerState = globalThis.MAT.importerState || {};
  globalThis.MAT.importerState.coursePending = { results: new Map(), inFlight: new Map(), scanTimer: null };
})();
