"use strict";

const assert = require("node:assert/strict");
const Runtime = require("../collectors/runtime.js");

{
  const run = Runtime.createRunControl("r1");
  const controller = new AbortController();
  Runtime.registerController(run, controller);
  Runtime.cancelRun(run);
  assert.equal(run.cancelled, true);
  assert.equal(controller.signal.aborted, true);
  assert.throws(() => Runtime.assertActive(run), /cancelada/);
}

const previous = {
  host: "ead.fieg.com.br",
  adapterId: "moodle-goias-v1",
  rulesetVersion: 5,
  rulesRevision: "rev-1",
  collectedAt: "2026-08-17T10:00:00.000Z",
  courses: [
    { id: "1", collectionState: "completo", name: "Curso A" },
    { id: "2", collectionState: "parcial", name: "Curso B" }
  ]
};
const now = new Date("2026-08-17T10:10:00.000Z").getTime();
const context = {
  mode: "incremental",
  host: "ead.fieg.com.br",
  adapterId: "moodle-goias-v1",
  rulesetVersion: 5,
  rulesRevision: "rev-1",
  freshnessMinutes: 15,
  now
};

assert.equal(Runtime.canReuseCourse(previous, "1", context), true);
assert.equal(Runtime.canReuseCourse(previous, "2", context), false, "curso parcial não pode ser reutilizado");
assert.equal(Runtime.canReuseCourse(previous, "1", { ...context, mode: "full" }), false);
assert.equal(Runtime.canReuseCourse(previous, "1", { ...context, freshnessMinutes: 5 }), false);
assert.equal(Runtime.canReuseCourse(previous, "1", { ...context, rulesRevision: "rev-2" }), false);
assert.equal(Runtime.canReuseCourse(previous, "1", { ...context, adapterId: "outro" }), false);
assert.equal(Runtime.cachedCourse(previous, "1").dataSource, "cache");

console.log("runtime.test.js: OK");
