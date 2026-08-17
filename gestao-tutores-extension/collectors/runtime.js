(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createRunControl(id) {
    return {
      id: id || `run-${Date.now()}`,
      cancelled: false,
      controllers: new Set()
    };
  }

  function registerController(run, controller) {
    if (!run || !controller) return;
    run.controllers.add(controller);
    if (run.cancelled) controller.abort();
  }

  function unregisterController(run, controller) {
    run?.controllers?.delete(controller);
  }

  function cancelRun(run) {
    if (!run) return;
    run.cancelled = true;
    [...run.controllers].forEach((controller) => {
      try { controller.abort(); } catch { /* sem ação */ }
    });
    run.controllers.clear();
  }

  function assertActive(run) {
    if (run?.cancelled) {
      const error = new Error("Coleta cancelada pelo usuário.");
      error.code = "GESTAO_TUTORES_CANCELLED";
      throw error;
    }
  }

  function snapshotAgeMinutes(snapshot, now = Date.now()) {
    const time = new Date(snapshot?.collectedAt || 0).getTime();
    if (!Number.isFinite(time) || time <= 0) return Infinity;
    return Math.max(0, (now - time) / 60000);
  }

  function canReuseCourse(previousSnapshot, courseId, context = {}) {
    if (!previousSnapshot || context.mode !== "incremental") return false;
    if (previousSnapshot.host !== context.host) return false;
    if (previousSnapshot.adapterId !== context.adapterId) return false;
    if (Number(previousSnapshot.rulesetVersion || 0) !== Number(context.rulesetVersion || 0)) return false;
    if (String(previousSnapshot.rulesRevision || "default") !== String(context.rulesRevision || "default")) return false;
    if (snapshotAgeMinutes(previousSnapshot, context.now) > Number(context.freshnessMinutes || 0)) return false;
    const course = (previousSnapshot.courses || []).find((item) => String(item.id) === String(courseId));
    return Boolean(course && course.collectionState === "completo");
  }

  function cachedCourse(previousSnapshot, courseId) {
    const course = (previousSnapshot?.courses || []).find((item) => String(item.id) === String(courseId));
    if (!course) return null;
    return {
      ...course,
      dataSource: "cache",
      cachedFrom: previousSnapshot.collectedAt
    };
  }

  return {
    createRunControl,
    registerController,
    unregisterController,
    cancelRun,
    assertActive,
    snapshotAgeMinutes,
    canReuseCourse,
    cachedCourse
  };
});
