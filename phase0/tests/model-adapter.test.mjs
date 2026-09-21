import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  ModelAdapterInvocationError,
  buildExtractionInput,
  redactSensitive,
  runModelAdapter,
} from "../evaluation/model-adapter.mjs";

const rawFixtures = JSON.parse(await fs.readFile(new URL("../fixtures/raw-post-results.json", import.meta.url), "utf8"));
const extractionFixtures = JSON.parse(await fs.readFile(new URL("../fixtures/event-extraction-results.json", import.meta.url), "utf8"));
const completeCarousel = rawFixtures.find((fixture) => fixture.fixture_id === "apify-carousel-complete").result;
const incompleteCarousel = rawFixtures.find((fixture) => fixture.fixture_id === "apify-carousel-incomplete").result;
const extractionResult = extractionFixtures.find((fixture) => fixture.fixture_id === "real-carousel-teaser-incomplete").result;

test("buildExtractionInput preserves ordered media and excludes provider payload", () => {
  const input = buildExtractionInput(completeCarousel);

  assert.equal(input.source_post_id, completeCarousel.raw_post.provider_external_id);
  assert.equal(input.media.length, 11);
  assert.deepEqual(input.media.map((item) => item.position), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(input.media[0].input_uri, completeCarousel.raw_post.media[0].storage_uri);
  assert.equal("provider_raw_payload" in input, false);
});

test("buildExtractionInput rejects incomplete retrievals", () => {
  assert.throws(
    () => buildExtractionInput(incompleteCarousel),
    /only a successful, complete retrieval can become extraction input/,
  );
});

test("buildExtractionInput rejects unordered media", () => {
  const unordered = structuredClone(completeCarousel);
  unordered.raw_post.media[0].position = 2;

  assert.throws(() => buildExtractionInput(unordered), /raw_post.media must be ordered from position 1/);
});

test("runModelAdapter records provider, model, duration, usage, and reported cost", async () => {
  const input = buildExtractionInput(completeCarousel);
  const observedInputs = [];
  const times = [100, 145];
  const adapter = {
    provider: "fixture-provider",
    model: "fixture-model-v1",
    async invoke(receivedInput) {
      observedInputs.push(receivedInput);
      return {
        result: extractionResult,
        usage: { input_tokens: 1200, output_tokens: 300, total_tokens: 1500 },
        reported_cost: { currency: "IDR", amount: 25 },
      };
    },
  };

  const record = await runModelAdapter({
    adapter,
    input,
    clock: {
      now: () => new Date("2026-09-21T03:00:00Z"),
      monotonic: () => times.shift(),
    },
  });

  assert.deepEqual(observedInputs, [input]);
  assert.equal(record.provider, "fixture-provider");
  assert.equal(record.model, "fixture-model-v1");
  assert.equal(record.duration_ms, 45);
  assert.deepEqual(record.usage, { input_tokens: 1200, output_tokens: 300, total_tokens: 1500 });
  assert.deepEqual(record.reported_cost, { currency: "IDR", amount: 25 });
  assert.equal(record.result, extractionResult);
  assert.deepEqual(record.warnings, []);
  assert.equal("input" in record, false);
});

test("runModelAdapter marks missing usage and cost", async () => {
  const record = await runModelAdapter({
    adapter: {
      provider: "fixture-provider",
      model: "fixture-model-v1",
      async invoke() {
        return { result: extractionResult };
      },
    },
    input: buildExtractionInput(completeCarousel),
  });

  assert.equal(record.usage, null);
  assert.equal(record.reported_cost, null);
  assert.deepEqual(record.warnings, ["USAGE_UNAVAILABLE", "REPORTED_COST_UNAVAILABLE"]);
});

test("runModelAdapter preserves adapter warnings", async () => {
  const record = await runModelAdapter({
    adapter: {
      provider: "fixture-provider",
      model: "fixture-model-v1",
      async invoke() {
        return { result: extractionResult, warnings: ["MODEL_OUTPUT_RETRY"] };
      },
    },
    input: buildExtractionInput(completeCarousel),
  });

  assert.deepEqual(record.warnings, ["MODEL_OUTPUT_RETRY", "USAGE_UNAVAILABLE", "REPORTED_COST_UNAVAILABLE"]);
});

test("redactSensitive redacts credential keys and inline tokens without mutation", () => {
  const original = {
    authorization: "Bearer testtoken123",
    nested: {
      api_key: "sk-fake1234567890",
      message: "request failed with apify_api_fake1234567890",
      safe: "keep me",
    },
  };

  const redacted = redactSensitive(original);

  assert.deepEqual(redacted, {
    authorization: "[REDACTED]",
    nested: {
      api_key: "[REDACTED]",
      message: "request failed with [REDACTED]",
      safe: "keep me",
    },
  });
  assert.equal(original.authorization, "Bearer testtoken123");
});

test("runModelAdapter exposes only redacted invocation errors", async () => {
  const adapter = {
    provider: "fixture-provider",
    model: "fixture-model-v1",
    async invoke() {
      const error = new Error("request rejected for Bearer testtoken123");
      error.details = { access_token: "sk-fake1234567890", status: 401 };
      throw error;
    },
  };

  await assert.rejects(
    runModelAdapter({ adapter, input: buildExtractionInput(completeCarousel) }),
    (error) => {
      assert.ok(error instanceof ModelAdapterInvocationError);
      assert.equal(error.message, "request rejected for Bearer [REDACTED]");
      assert.deepEqual(error.details, { access_token: "[REDACTED]", status: 401 });
      return true;
    },
  );
});
