import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateOutput } from "./run-evaluation.mjs";

export const approvedQwenModel = "qwen3-vl-flash-2026-01-22";
const maximumOutputAttempts = 2;

export class QwenAdapterError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "QwenAdapterError";
    this.code = code;
    this.details = details;
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

export function normalizeQwenBaseUrl(value) {
  assertNonEmptyString(value, "baseUrl");
  const url = new URL(value);
  const singaporeHost = url.hostname === "dashscope-intl.aliyuncs.com"
    || url.hostname.endsWith(".ap-southeast-1.maas.aliyuncs.com");
  if (url.protocol !== "https:" || !singaporeHost) {
    throw new TypeError("baseUrl must use an HTTPS Alibaba Cloud Model Studio Singapore endpoint");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError("baseUrl must not contain credentials, query parameters, or fragments");
  }
  const pathname = url.pathname.replace(/\/$/, "");
  if (pathname !== "/compatible-mode/v1") {
    throw new TypeError("baseUrl path must be /compatible-mode/v1");
  }
  return `${url.origin}${pathname}`;
}

function mimeTypeFor(filename) {
  const extension = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  throw new QwenAdapterError("UNSUPPORTED_LOCAL_MEDIA", `Unsupported local image extension: ${extension || "missing"}`);
}

export async function mediaInputToUrl(inputUri, readFile = fs.readFile) {
  assertNonEmptyString(inputUri, "media input_uri");
  if (inputUri.startsWith("https://") || inputUri.startsWith("data:image/")) return inputUri;
  if (inputUri.startsWith("http://")) {
    throw new QwenAdapterError("INSECURE_MEDIA_URI", "Remote media input must use HTTPS");
  }

  const filename = inputUri.startsWith("file:") ? fileURLToPath(inputUri) : path.resolve(inputUri);
  const bytes = await readFile(filename);
  return `data:${mimeTypeFor(filename)};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function buildQwenRequest({ input, prompt, model = approvedQwenModel, readFile = fs.readFile }) {
  if (model !== approvedQwenModel) {
    throw new TypeError(`Only the approved Phase 0 model ${approvedQwenModel} may be used`);
  }
  assertNonEmptyString(prompt, "prompt");
  if (!/json/i.test(prompt)) throw new TypeError("prompt must mention JSON for JSON Object mode");
  assertNonEmptyString(input?.source_post_id, "input.source_post_id");
  if (input.media_completeness !== "complete") {
    throw new TypeError("Qwen input media must be complete");
  }
  if (!Array.isArray(input.media) || input.media.length === 0) {
    throw new TypeError("input.media must contain at least one item");
  }

  const userContent = [{
    type: "text",
    text: [
      `source_post_id: ${input.source_post_id}`,
      `permalink: ${input.permalink}`,
      `caption: ${input.caption ?? ""}`,
      "media_completeness: complete",
      "Inspect every ordered media item below and return JSON only.",
    ].join("\n"),
  }];

  for (const [index, media] of input.media.entries()) {
    if (media.position !== index + 1) throw new TypeError("input.media positions must be contiguous from 1");
    if (media.media_type !== "image") {
      throw new QwenAdapterError("VIDEO_OUT_OF_SCOPE", `Media position ${media.position} is outside the image-only Qwen baseline`);
    }
    userContent.push({ type: "text", text: `media_index: ${media.position}` });
    userContent.push({
      type: "image_url",
      image_url: { url: await mediaInputToUrl(media.input_uri, readFile) },
    });
  }

  return {
    model,
    messages: [
      { role: "system", content: [{ type: "text", text: prompt }] },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    enable_thinking: false,
    stream: false,
  };
}

function normalizeUsage(usage) {
  if (!usage) return null;
  return {
    input_tokens: Number(usage?.prompt_tokens ?? 0),
    output_tokens: Number(usage?.completion_tokens ?? 0),
    total_tokens: Number(usage?.total_tokens ?? 0),
  };
}

function addUsage(total, current) {
  if (!current) return total;
  if (!total) return current;
  return {
    input_tokens: total.input_tokens + current.input_tokens,
    output_tokens: total.output_tokens + current.output_tokens,
    total_tokens: total.total_tokens + current.total_tokens,
  };
}

function parseAndValidateResponse(payload, sourcePostId) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new QwenAdapterError("INVALID_MODEL_OUTPUT", "Qwen response did not contain message content");
  }
  let result;
  try {
    result = JSON.parse(content);
  } catch {
    throw new QwenAdapterError("INVALID_MODEL_OUTPUT", "Qwen response content was not valid JSON");
  }
  const validationErrors = validateOutput(result);
  if (result.source_post_id !== sourcePostId) validationErrors.push("source_post_id_mismatch");
  if (validationErrors.length > 0) {
    throw new QwenAdapterError("INVALID_MODEL_OUTPUT", "Qwen response failed local contract validation", {
      validation_errors: validationErrors,
    });
  }
  return result;
}

export function createQwenAdapter({ apiKey, baseUrl, prompt, model = approvedQwenModel, fetchImpl = fetch, readFile = fs.readFile }) {
  assertNonEmptyString(apiKey, "apiKey");
  assertNonEmptyString(prompt, "prompt");
  const normalizedBaseUrl = normalizeQwenBaseUrl(baseUrl);
  if (model !== approvedQwenModel) {
    throw new TypeError(`Only the approved Phase 0 model ${approvedQwenModel} may be used`);
  }

  return {
    provider: "alibaba-cloud-model-studio-singapore",
    model,
    async invoke(input) {
      const body = await buildQwenRequest({ input, prompt, model, readFile });
      let usage = null;
      let lastOutputError;

      for (let attempt = 1; attempt <= maximumOutputAttempts; attempt += 1) {
        const response = await fetchImpl(`${normalizedBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new QwenAdapterError("QWEN_API_ERROR", `Qwen API returned HTTP ${response.status}`, {
            status: response.status,
          });
        }
        const payload = await response.json();
        usage = addUsage(usage, normalizeUsage(payload.usage));
        try {
          const result = parseAndValidateResponse(payload, input.source_post_id);
          return {
            result,
            usage,
            warnings: attempt > 1 ? ["MODEL_OUTPUT_RETRY"] : [],
          };
        } catch (error) {
          if (!(error instanceof QwenAdapterError) || error.code !== "INVALID_MODEL_OUTPUT") throw error;
          lastOutputError = error;
        }
      }
      throw lastOutputError;
    },
  };
}
