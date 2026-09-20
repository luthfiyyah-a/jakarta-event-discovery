import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { compareRetrievalRuns } from "../retrieval/compare-retrieval-runs.mjs";

const fixtures = JSON.parse(await fs.readFile(new URL("../fixtures/raw-post-results.json", import.meta.url), "utf8"));
const completeCarousel = fixtures.find((fixture) => fixture.fixture_id === "apify-carousel-complete").result;

function clone(value) {
  return structuredClone(value);
}

test("repeat retrieval ignores timestamps and temporary source URLs", () => {
  const repeated = clone(completeCarousel);
  repeated.retrieved_at = "2026-09-21T02:00:00Z";
  for (const item of repeated.raw_post.media) {
    item.source_url = `https://example.invalid/refreshed/${item.position}`;
  }

  const comparison = compareRetrievalRuns(completeCarousel, repeated);

  assert.equal(comparison.stable, true);
  assert.deepEqual(comparison.differences, []);
  assert.deepEqual(comparison.warnings, []);
});

test("repeat retrieval detects a changed provider external ID", () => {
  const repeated = clone(completeCarousel);
  repeated.raw_post.provider_external_id = "different-id";

  const comparison = compareRetrievalRuns(completeCarousel, repeated);

  assert.equal(comparison.stable, false);
  assert.ok(comparison.differences.some((item) => item.code === "PROVIDER_EXTERNAL_ID_CHANGED"));
});

test("repeat retrieval detects missing carousel media", () => {
  const repeated = clone(completeCarousel);
  repeated.raw_post.media.pop();

  const comparison = compareRetrievalRuns(completeCarousel, repeated);

  assert.equal(comparison.stable, false);
  assert.ok(comparison.differences.some((item) => item.code === "MEDIA_COUNT_CHANGED"));
});

test("repeat retrieval detects media-order drift", () => {
  const repeated = clone(completeCarousel);
  [repeated.raw_post.media[0], repeated.raw_post.media[1]] = [
    repeated.raw_post.media[1],
    repeated.raw_post.media[0],
  ];

  const comparison = compareRetrievalRuns(completeCarousel, repeated);

  assert.equal(comparison.stable, false);
  assert.ok(comparison.differences.some((item) => item.code === "MEDIA_POSITION_CHANGED"));
  assert.ok(comparison.differences.some((item) => item.code === "MEDIA_CHECKSUM_CHANGED"));
});

test("repeat retrieval reports when media identity cannot be compared by checksum", () => {
  const imageFixture = fixtures.find((fixture) => fixture.fixture_id === "apify-image-success").result;

  const comparison = compareRetrievalRuns(imageFixture, clone(imageFixture));

  assert.equal(comparison.stable, true);
  assert.deepEqual(comparison.warnings, [
    { code: "MEDIA_CHECKSUM_UNAVAILABLE", path: "raw_post.media[0].checksum_sha256" },
  ]);
});

test("repeat retrieval detects a transition from incomplete to success", () => {
  const incomplete = fixtures.find((fixture) => fixture.fixture_id === "apify-carousel-incomplete").result;
  const resolved = clone(incomplete);
  resolved.status = "success";
  resolved.raw_post.media = [clone(completeCarousel.raw_post.media[0])];
  delete resolved.failure;

  const comparison = compareRetrievalRuns(incomplete, resolved);

  assert.equal(comparison.stable, false);
  assert.ok(comparison.differences.some((item) => item.code === "STATUS_CHANGED"));
  assert.ok(comparison.differences.some((item) => item.code === "MEDIA_COUNT_CHANGED"));
  assert.ok(comparison.differences.some((item) => item.code === "FAILURE_CODE_CHANGED"));
  assert.ok(comparison.differences.some((item) => item.code === "FAILURE_RETRYABILITY_CHANGED"));
});

test("comparison rejects missing retrieval results", () => {
  assert.throws(() => compareRetrievalRuns(null, completeCarousel), /first must be a RawPostResult object/);
  assert.throws(() => compareRetrievalRuns(completeCarousel, null), /second must be a RawPostResult object/);
});
