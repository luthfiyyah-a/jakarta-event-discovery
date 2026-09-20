import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const fixtures = JSON.parse(await fs.readFile(new URL("../fixtures/event-extraction-results.json", import.meta.url), "utf8"));
const schema = JSON.parse(await fs.readFile(new URL("../contracts/event-extraction-result.schema.json", import.meta.url), "utf8"));

const factualFields = [
  "event_name", "start_date", "end_date", "start_time", "end_time", "format",
  "venue", "city_area", "region", "organizer", "price_text", "registration_url",
  "deadline", "tech_relevant", "jabodetabek_relevant"
];

function populated(value) {
  return value !== null && value !== undefined && value !== "unknown";
}

function validate(result) {
  const errors = [];
  if (result.schema_version !== "1.0.0") errors.push("schema_version");
  if (!result.source_post_id) errors.push("source_post_id");
  if (!["event", "non_event", "ambiguous"].includes(result.classification)) errors.push("classification");
  if (!Array.isArray(result.candidates)) errors.push("candidates");
  if (!Array.isArray(result.warnings)) errors.push("warnings");
  if (result.classification === "non_event" && result.candidates?.length !== 0) errors.push("non_event.candidates");

  for (const [index, candidate] of (result.candidates ?? []).entries()) {
    if (candidate.candidate_index !== index + 1) errors.push(`candidate.${index}.candidate_index`);
    if (!candidate.event_name) errors.push(`candidate.${index}.event_name`);
    if (!["offline", "online", "hybrid", "unknown"].includes(candidate.format)) errors.push(`candidate.${index}.format`);
    if (!["ready", "review_required", "insufficient_details"].includes(candidate.publication_readiness)) errors.push(`candidate.${index}.publication_readiness`);
    if (!Array.isArray(candidate.evidence)) errors.push(`candidate.${index}.evidence`);
    for (const field of factualFields) {
      if (populated(candidate[field]) && !(candidate.evidence ?? []).some((item) => item.field === field)) {
        errors.push(`candidate.${index}.missing_evidence.${field}`);
      }
    }
    if (candidate.publication_readiness === "ready") {
      if (!candidate.start_date) errors.push(`candidate.${index}.ready.start_date`);
      if (candidate.format === "unknown") errors.push(`candidate.${index}.ready.format`);
      if (candidate.format !== "online" && !candidate.venue) errors.push(`candidate.${index}.ready.venue`);
    }
  }
  return errors;
}

test("schema declares EventExtractionResult v1", () => {
  assert.equal(schema.title, "EventExtractionResult v1");
  assert.ok(schema.$defs.eventCandidate);
  assert.ok(schema.$defs.evidence);
});

for (const fixture of fixtures) {
  test(`${fixture.fixture_id} matches extraction contract and evidence rules`, () => {
    const errors = validate(fixture.result);
    assert.equal(errors.length === 0, fixture.expected_valid, errors.join(", "));
  });
}
