(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function round1(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  function summarizeCollection(discoveredCount, results, discovery) {
    const discovered = Math.max(0, Number(discoveredCount || 0));
    const courses = Array.isArray(results) ? results : [];
    const completeCourses = courses.filter((course) => course.collectionState === "completo").length;
    const partialCourses = courses.filter((course) => course.collectionState === "parcial").length;
    const errorCourses = courses.filter((course) => course.collectionState === "erro").length;
    const excludedCourses = courses.filter((course) => course.excluded).length;
    const notAnalyzedCourses = Math.max(0, discovered - courses.length);
    const coverage = discovered ? round1((courses.length / discovered) * 100) : 0;
    const reliability = discovered ? round1((completeCourses / discovered) * 100) : 0;
    const categoryTraversalTruncated = Boolean(discovery?.categoryTraversalTruncated);
    const discoveryComplete = !categoryTraversalTruncated && notAnalyzedCourses === 0;
    const canSupportDefinitiveDecision = discoveryComplete && partialCourses === 0 && errorCourses === 0;

    return {
      completeCourses,
      partialCourses,
      errorCourses,
      excludedCourses,
      notAnalyzedCourses,
      coverage,
      reliability,
      discoveryComplete,
      canSupportDefinitiveDecision
    };
  }

  function courseStateLabel(state) {
    if (state === "completo") return "Completo";
    if (state === "parcial") return "Parcial";
    if (state === "erro") return "Erro";
    return "Não analisado";
  }

  return { summarizeCollection, courseStateLabel };
});
