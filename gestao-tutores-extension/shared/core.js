(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GestaoTutoresCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function unique(values) {
    return [...new Set((values || []).filter((value) => value !== null && value !== undefined && value !== ""))];
  }

  function uniqueBy(items, keyFn) {
    const map = new Map();
    (items || []).forEach((item) => {
      const key = keyFn(item);
      if (key !== null && key !== undefined && key !== "" && !map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  }

  function splitRoleLabels(value) {
    return unique(String(value || "")
      .split(/[\n,;|•]+/)
      .map((item) => item.trim())
      .filter(Boolean));
  }

  function matchesAny(value, patterns) {
    const normalized = normalizeText(value);
    return (patterns || []).some((pattern) => {
      const normalizedPattern = normalizeText(pattern);
      return normalizedPattern && normalized.includes(normalizedPattern);
    });
  }

  function roleMatches(roleLabels, patterns) {
    const labels = (roleLabels || []).map(normalizeText);
    const normalizedPatterns = (patterns || []).map(normalizeText).filter(Boolean);
    return labels.some((label) => normalizedPatterns.some((pattern) => label === pattern || label.includes(pattern)));
  }

  function quantile(values, q) {
    const sorted = (values || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    if (sorted.length === 1) return sorted[0];
    const position = (sorted.length - 1) * q;
    const base = Math.floor(position);
    const rest = position - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  }

  function distributionStats(values) {
    const clean = (values || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!clean.length) {
      return { count: 0, min: 0, max: 0, average: 0, q1: 0, median: 0, q3: 0, iqr: 0, upperFence: 0 };
    }
    const sum = clean.reduce((acc, value) => acc + value, 0);
    const q1 = quantile(clean, 0.25);
    const median = quantile(clean, 0.5);
    const q3 = quantile(clean, 0.75);
    const iqr = q3 - q1;
    return {
      count: clean.length,
      min: clean[0],
      max: clean[clean.length - 1],
      average: sum / clean.length,
      q1,
      median,
      q3,
      iqr,
      upperFence: q3 + 1.5 * iqr
    };
  }

  function classifyLoad(value, stats) {
    const number = Number(value || 0);
    const reference = stats || distributionStats([]);
    if (!reference.count) return "Sem referência";

    if (reference.count < 4) {
      const baseline = reference.median || reference.average || 1;
      const ratio = number / baseline;
      if (ratio >= 1.75) return "Crítica";
      if (ratio >= 1.25) return "Alta";
      if (ratio <= 0.75) return "Baixa";
      return "Regular";
    }

    if (number > reference.upperFence && number > reference.q3) return "Crítica";
    if (number > reference.q3) return "Alta";
    if (number <= reference.q1 && reference.q1 !== reference.q3) return "Baixa";
    return "Regular";
  }

  function inferModality(course, rules) {
    const source = normalizeText([
      course?.name,
      course?.shortname,
      ...(course?.categoryPath || [])
    ].filter(Boolean).join(" "));

    for (const rule of rules || []) {
      if ((rule.terms || []).some((term) => source.includes(normalizeText(term)))) return rule.label;
    }
    return "Não identificada";
  }

  function percent(part, total) {
    return total ? Math.round((Number(part || 0) / Number(total)) * 100) : 0;
  }

  function csvEscape(value) {
    if (typeof value === "number") return String(value);
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
    if (/[;"\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    normalizeText,
    unique,
    uniqueBy,
    splitRoleLabels,
    matchesAny,
    roleMatches,
    quantile,
    distributionStats,
    classifyLoad,
    inferModality,
    percent,
    csvEscape,
    escapeHtml
  };
});
