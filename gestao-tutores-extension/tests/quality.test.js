"use strict";

const assert = require("node:assert/strict");
const Quality = require("../shared/quality.js");

{
  const summary = Quality.summarizeCollection(3, [
    { collectionState: "completo" },
    { collectionState: "completo" },
    { collectionState: "completo", excluded: true }
  ], { categoryTraversalTruncated: false });
  assert.equal(summary.coverage, 100);
  assert.equal(summary.reliability, 100);
  assert.equal(summary.excludedCourses, 1);
  assert.equal(summary.canSupportDefinitiveDecision, true);
}

{
  const summary = Quality.summarizeCollection(3, [
    { collectionState: "completo" },
    { collectionState: "parcial" }
  ], { categoryTraversalTruncated: false });
  assert.equal(summary.coverage, 66.7);
  assert.equal(summary.reliability, 33.3);
  assert.equal(summary.notAnalyzedCourses, 1);
  assert.equal(summary.canSupportDefinitiveDecision, false);
}

{
  const summary = Quality.summarizeCollection(1, [
    { collectionState: "completo" }
  ], { categoryTraversalTruncated: true });
  assert.equal(summary.discoveryComplete, false);
  assert.equal(summary.canSupportDefinitiveDecision, false);
}

{
  const summary = Quality.summarizeCollection(2, [
    { collectionState: "completo" },
    { collectionState: "erro" }
  ], { categoryTraversalTruncated: false });
  assert.equal(summary.errorCourses, 1);
  assert.equal(summary.canSupportDefinitiveDecision, false);
}

assert.equal(Quality.courseStateLabel("completo"), "Completo");
assert.equal(Quality.courseStateLabel("qualquer"), "Não analisado");
console.log("quality.test.js: OK");
