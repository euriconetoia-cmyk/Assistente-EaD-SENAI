(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresAdapters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const adapters = new Map();

  function register(host, adapter) {
    if (!host || !adapter || typeof adapter !== "object") {
      throw new Error("Host e adaptador válidos são obrigatórios.");
    }
    if (typeof adapter.discoverCourses !== "function") {
      throw new Error(`Adaptador ${host} não implementa discoverCourses.`);
    }
    if (typeof adapter.extractCourseMetadata !== "function") {
      throw new Error(`Adaptador ${host} não implementa extractCourseMetadata.`);
    }
    if (typeof adapter.extractParticipants !== "function") {
      throw new Error(`Adaptador ${host} não implementa extractParticipants.`);
    }
    adapters.set(host, Object.freeze({ ...adapter, host }));
  }

  function forHost(host) {
    const adapter = adapters.get(host);
    if (!adapter) throw new Error(`Não existe adaptador registrado para ${host}.`);
    return adapter;
  }

  function has(host) {
    return adapters.has(host);
  }

  function list() {
    return [...adapters.keys()];
  }

  return { register, forHost, has, list };
});
