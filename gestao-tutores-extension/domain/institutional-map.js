(function (root, factory) {
  const api = factory(root?.GestaoTutoresCore);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresInstitutionalMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";

  if (!Core) throw new Error("GestaoTutoresCore é obrigatório para normalização institucional.");

  const ALLOWED_TARGETS = new Set(["cursoInstitucional", "turma", "unidadeCurricular", "tipoEntidade"]);
  const ALLOWED_SOURCES = new Set(["name", "shortname", "categoryPath", "categoryId"]);

  function safeRegex(pattern, flags) {
    try {
      return new RegExp(pattern, flags || "i");
    } catch {
      return null;
    }
  }

  function sourceValue(course, source) {
    if (source === "categoryPath") return (course.categoryPath || []).join(" > ");
    return String(course[source] || "");
  }

  function applyRule(course, rule) {
    if (!rule || !ALLOWED_TARGETS.has(rule.target) || !ALLOWED_SOURCES.has(rule.source)) return null;
    const value = sourceValue(course, rule.source);
    if (!value) return null;

    if (rule.type === "contains") {
      const needle = Core.normalizeText(rule.pattern);
      if (!needle || !Core.normalizeText(value).includes(needle)) return null;
      return String(rule.value || "").trim() || null;
    }

    if (rule.type === "regex") {
      const regex = safeRegex(rule.pattern, rule.flags || "i");
      if (!regex) return null;
      const match = value.match(regex);
      if (!match) return null;
      const template = String(rule.value || "$1");
      return template.replace(/\$(\d+)/g, (_token, group) => match[Number(group)] ?? "").trim() || null;
    }

    return null;
  }

  function normalizeCourse(course, rules) {
    const result = {
      cursoInstitucional: null,
      turma: null,
      unidadeCurricular: null,
      tipoEntidade: "moodle_course",
      institutionalConfidence: "não_confirmada",
      institutionalEvidence: []
    };

    (rules || []).forEach((rule, index) => {
      const output = applyRule(course, rule);
      if (output === null) return;
      result[rule.target] = output;
      result.institutionalEvidence.push({
        ruleIndex: index,
        target: rule.target,
        source: rule.source,
        sourceValue: sourceValue(course, rule.source),
        result: output
      });
    });

    const filled = [result.cursoInstitucional, result.turma, result.unidadeCurricular].filter(Boolean).length;
    if (filled >= 2) result.institutionalConfidence = "alta";
    else if (filled === 1) result.institutionalConfidence = "média";

    return result;
  }

  function exclusionReason(course, patterns) {
    const haystack = Core.normalizeText([
      course.name,
      course.shortname,
      course.categoryId,
      ...(course.categoryPath || [])
    ].filter(Boolean).join(" "));

    for (const rawPattern of patterns || []) {
      const pattern = Core.normalizeText(rawPattern);
      if (pattern && haystack.includes(pattern)) return String(rawPattern);
    }
    return "";
  }

  return { normalizeCourse, exclusionReason, applyRule };
});
