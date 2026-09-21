import assert from "node:assert/strict";
import test from "node:test";
import {
  approvedQwenModel,
  buildQwenRequest,
  createQwenAdapter,
  mediaInputToUrl,
  normalizeQwenBaseUrl,
  QwenAdapterError,
} from "../evaluation/qwen-adapter.mjs";

const prompt = "Read every image and return JSON only using EventExtractionResult v1.";
const input = {
  source_post_id: "post-123",
  permalink: "https://www.instagram.com/p/example/",
  caption: "Example caption",
  media_completeness: "complete",
  media: [
    { position: 1, media_type: "image", input_uri: "C:/local/slide-01.jpg" },
    { position: 2, media_type: "image", input_uri: "https://assets.example/slide-02.png" },
  ],
};
const validResult = {
  schema_version: "1.0.0",
  source_post_id: "post-123",
  classification: "non_event",
  candidates: [],
  warnings: [],
};

function jsonResponse(content, usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }], usage }),
  };
}

test("Singapore base URL validation accepts approved endpoint shapes", () => {
  assert.equal(
    normalizeQwenBaseUrl("https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/"),
    "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
  );
  assert.equal(
    normalizeQwenBaseUrl("https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  );
  assert.throws(
    () => normalizeQwenBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1"),
    /Singapore endpoint/,
  );
});

test("local image input becomes a Base64 data URL without a dependency", async () => {
  const seenPaths = [];
  const url = await mediaInputToUrl("C:/local/slide-01.jpg", async (filename) => {
    seenPaths.push(filename);
    return Buffer.from("image-bytes");
  });

  assert.equal(seenPaths.length, 1);
  assert.equal(url, `data:image/jpeg;base64,${Buffer.from("image-bytes").toString("base64")}`);
});

test("request preserves media order and pins JSON non-thinking mode", async () => {
  const request = await buildQwenRequest({
    input,
    prompt,
    readFile: async () => Buffer.from("first-image"),
  });

  assert.equal(request.model, approvedQwenModel);
  assert.deepEqual(request.response_format, { type: "json_object" });
  assert.equal(request.enable_thinking, false);
  assert.equal(request.stream, false);
  assert.deepEqual(
    request.messages[1].content.filter((part) => part.type === "text" && part.text.startsWith("media_index"))
      .map((part) => part.text),
    ["media_index: 1", "media_index: 2"],
  );
  assert.match(request.messages[1].content[2].image_url.url, /^data:image\/jpeg;base64,/);
  assert.equal(request.messages[1].content[4].image_url.url, "https://assets.example/slide-02.png");
});

test("adapter parses output and reports token usage without exposing its API key", async () => {
  const calls = [];
  const adapter = createQwenAdapter({
    apiKey: "sk-test-secret-value",
    baseUrl: "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    prompt,
    readFile: async () => Buffer.from("first-image"),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse(JSON.stringify(validResult));
    },
  });

  const response = await adapter.invoke(input);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/chat/completions"), true);
  assert.equal(JSON.parse(calls[0].options.body).model, approvedQwenModel);
  assert.deepEqual(response.result, validResult);
  assert.deepEqual(response.usage, { input_tokens: 10, output_tokens: 5, total_tokens: 15 });
  assert.deepEqual(response.warnings, []);
  assert.equal(JSON.stringify(response).includes("sk-test-secret-value"), false);
});

test("adapter retries invalid JSON once and accumulates both attempts usage", async () => {
  let calls = 0;
  const adapter = createQwenAdapter({
    apiKey: "sk-test-secret-value",
    baseUrl: "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    prompt,
    readFile: async () => Buffer.from("first-image"),
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? jsonResponse("not-json") : jsonResponse(JSON.stringify(validResult));
    },
  });

  const response = await adapter.invoke(input);

  assert.equal(calls, 2);
  assert.deepEqual(response.usage, { input_tokens: 20, output_tokens: 10, total_tokens: 30 });
  assert.deepEqual(response.warnings, ["MODEL_OUTPUT_RETRY"]);
});

test("adapter leaves usage unavailable when the provider omits it", async () => {
  const adapter = createQwenAdapter({
    apiKey: "sk-test-secret-value",
    baseUrl: "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    prompt,
    readFile: async () => Buffer.from("first-image"),
    fetchImpl: async () => jsonResponse(JSON.stringify(validResult), null),
  });

  const response = await adapter.invoke(input);

  assert.equal(response.usage, null);
});

test("adapter rejects model-output identity drift after the one retry", async () => {
  const wrongResult = { ...validResult, source_post_id: "wrong-post" };
  const adapter = createQwenAdapter({
    apiKey: "sk-test-secret-value",
    baseUrl: "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    prompt,
    readFile: async () => Buffer.from("first-image"),
    fetchImpl: async () => jsonResponse(JSON.stringify(wrongResult)),
  });

  await assert.rejects(
    adapter.invoke(input),
    (error) => error instanceof QwenAdapterError
      && error.code === "INVALID_MODEL_OUTPUT"
      && error.details.validation_errors.includes("source_post_id_mismatch"),
  );
});

test("adapter rejects video input before any provider request", async () => {
  let called = false;
  const adapter = createQwenAdapter({
    apiKey: "sk-test-secret-value",
    baseUrl: "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    prompt,
    fetchImpl: async () => {
      called = true;
      return jsonResponse(JSON.stringify(validResult));
    },
  });
  const videoInput = { ...input, media: [{ position: 1, media_type: "video", input_uri: "https://assets.example/video.mp4" }] };

  await assert.rejects(adapter.invoke(videoInput), (error) => error.code === "VIDEO_OUT_OF_SCOPE");
  assert.equal(called, false);
});
