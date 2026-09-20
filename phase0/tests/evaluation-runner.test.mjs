import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { evaluate, validateOutput } from "../evaluation/run-evaluation.mjs";

const gold = JSON.parse(await fs.readFile(new URL("../fixtures/gold-evaluation-set.json", import.meta.url), "utf8"));
const predictions = JSON.parse(await fs.readFile(new URL("../fixtures/event-extraction-results.json", import.meta.url), "utf8"));

test("evaluation fixture outputs are structurally valid", () => {
  for (const row of predictions) assert.deepEqual(validateOutput(row.result), []);
});

test("runner calculates the expected fixture baseline", () => {
  const report = evaluate(gold, predictions);
  assert.equal(report.metrics.posts, 4);
  assert.equal(report.metrics.schema_parse_rate, 1);
  assert.equal(report.metrics.classification_accuracy, 1);
  assert.equal(report.metrics.core_field_coverage, 1);
  assert.equal(report.metrics.core_field_correctness, 1);
  assert.equal(report.metrics.multi_event_recall, 1);
  assert.ok(report.details.every((row) => row.failure_reasons.length === 0));
});
