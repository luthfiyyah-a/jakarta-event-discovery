const sensitiveKeyPattern = /(^|_)(authorization|api_?key|access_?token|auth_?token|secret|password|cookie)($|_)/i;

const secretPatterns = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi, "Bearer [REDACTED]"],
  [/\b(?:sk-|apify_api_|gh[pousr]_|glpat-|npm_)[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]"],
];

function redactString(value) {
  return secretPatterns.reduce((redacted, [pattern, replacement]) => redacted.replace(pattern, replacement), value);
}

export function redactSensitive(value) {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [
    key,
    sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactSensitive(nestedValue),
  ]));
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

function assertOrderedMedia(media) {
  if (!Array.isArray(media) || media.length === 0) {
    throw new TypeError("raw_post.media must contain at least one item");
  }
  for (const [index, item] of media.entries()) {
    if (item.position !== index + 1) {
      throw new TypeError(`raw_post.media must be ordered from position 1; received ${item.position} at index ${index}`);
    }
  }
}

export function buildExtractionInput(rawPostResult) {
  if (!rawPostResult || typeof rawPostResult !== "object" || Array.isArray(rawPostResult)) {
    throw new TypeError("rawPostResult must be a RawPostResult object");
  }
  if (rawPostResult.status !== "success") {
    throw new TypeError("only a successful, complete retrieval can become extraction input");
  }

  const post = rawPostResult.raw_post;
  if (!post) throw new TypeError("rawPostResult.raw_post is required");
  assertNonEmptyString(post.provider_external_id, "raw_post.provider_external_id");
  assertNonEmptyString(post.permalink, "raw_post.permalink");
  assertOrderedMedia(post.media);

  return {
    source_post_id: post.provider_external_id,
    permalink: post.permalink,
    caption: post.caption ?? null,
    media_completeness: "complete",
    media: post.media.map((item) => ({
      position: item.position,
      media_type: item.media_type,
      input_uri: item.storage_uri ?? item.source_url,
    })),
  };
}

function optionalNonNegativeNumber(value, label) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative number when provided`);
  }
  return value;
}

function normalizeUsage(usage) {
  if (!usage) return null;
  return {
    input_tokens: optionalNonNegativeNumber(usage.input_tokens, "usage.input_tokens"),
    output_tokens: optionalNonNegativeNumber(usage.output_tokens, "usage.output_tokens"),
    total_tokens: optionalNonNegativeNumber(usage.total_tokens, "usage.total_tokens"),
  };
}

function normalizeReportedCost(cost) {
  if (!cost) return null;
  assertNonEmptyString(cost.currency, "reported_cost.currency");
  return {
    currency: cost.currency,
    amount: optionalNonNegativeNumber(cost.amount, "reported_cost.amount"),
  };
}

function normalizeWarnings(warnings) {
  if (warnings === null || warnings === undefined) return [];
  if (!Array.isArray(warnings) || warnings.some((warning) => typeof warning !== "string" || warning.length === 0)) {
    throw new TypeError("adapter response warnings must be an array of non-empty strings");
  }
  return [...warnings];
}

function defaultClock() {
  return {
    now: () => new Date(),
    monotonic: () => performance.now(),
  };
}

export class ModelAdapterInvocationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ModelAdapterInvocationError";
    this.details = details;
  }
}

export async function runModelAdapter({ adapter, input, clock = defaultClock() }) {
  if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
    throw new TypeError("adapter must be an object");
  }
  assertNonEmptyString(adapter.provider, "adapter.provider");
  assertNonEmptyString(adapter.model, "adapter.model");
  if (typeof adapter.invoke !== "function") throw new TypeError("adapter.invoke must be a function");
  assertNonEmptyString(input?.source_post_id, "input.source_post_id");

  const startedAt = clock.now();
  const startedMonotonic = clock.monotonic();
  let response;
  try {
    response = await adapter.invoke(input);
  } catch (error) {
    const safeError = redactSensitive({
      message: error instanceof Error ? error.message : String(error),
      details: error?.details ?? null,
    });
    throw new ModelAdapterInvocationError(safeError.message, safeError.details);
  }
  const durationMs = Math.max(0, clock.monotonic() - startedMonotonic);

  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new TypeError("adapter.invoke must return an object");
  }
  if (!response.result || typeof response.result !== "object" || Array.isArray(response.result)) {
    throw new TypeError("adapter response must include a result object");
  }

  const usage = normalizeUsage(response.usage);
  const reportedCost = normalizeReportedCost(response.reported_cost);
  const warnings = normalizeWarnings(response.warnings);
  if (!usage) warnings.push("USAGE_UNAVAILABLE");
  if (!reportedCost) warnings.push("REPORTED_COST_UNAVAILABLE");

  return {
    provider: adapter.provider,
    model: adapter.model,
    source_post_id: input.source_post_id,
    started_at: startedAt.toISOString(),
    duration_ms: durationMs,
    usage,
    reported_cost: reportedCost,
    result: response.result,
    warnings,
  };
}
