# Qwen Phase 0 baseline

## Approved model configuration

- Provider: Alibaba Cloud Model Studio
- Region/deployment scope: Singapore / International
- Model: `qwen3-vl-flash-2026-01-22`
- Mode: non-thinking
- Response format: JSON Object
- Final validation: local `EventExtractionResult v1` validation remains mandatory

The snapshot is pinned so the 10-post dry run and 50-post baseline use the same model behavior. Qwen3-VL-Flash is the inexpensive first baseline; Qwen3-VL-Plus is not authorized as an automatic fallback.

Official references:

- [Model pricing and regional availability](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
- [Structured output](https://www.alibabacloud.com/help/en/model-studio/qwen-structured-output)
- [Qwen vision OpenAI-compatible API](https://www.alibabacloud.com/help/en/model-studio/qwen-vl-compatible-with-openai)
- [Regions and endpoints](https://www.alibabacloud.com/help/en/model-studio/regions)

For multimodal input, use JSON Object mode and validate the parsed result locally. Do not assume provider-side strict JSON Schema enforcement for image requests.

## Local adapter status

`evaluation/qwen-adapter.mjs` implements the approved model behind the provider-neutral adapter boundary without adding an SDK dependency. It:

- accepts only HTTPS Singapore Model Studio endpoints and the pinned model;
- converts local JPEG, PNG, and WebP files to Base64 Data URLs;
- preserves media order and labels every image with its one-based `media_index`;
- fixes non-thinking and JSON Object modes in the request;
- parses and locally validates the output, retrying invalid output at most once;
- accumulates token usage across both attempts; and
- rejects incomplete or video inputs before any provider request.

Tests inject a fake HTTP transport. No live Qwen request has been made.

## Safe runner behavior

`npm run plan:qwen -- --max-posts 2` validates local manifests and prints a bounded plan without contacting Qwen. The runner caps selections at 10 posts. Its live branch remains deliberately disabled until the product owner approves a metered batch and a cost-accounting method; setting a key or passing `--execute` alone cannot trigger a paid call.

## Evaluation sequence

1. Confirm the Singapore-region account, available free quota, and an explicit maximum spend.
2. Create a project-specific API key manually and expose it only as `QWEN_API_KEY`.
3. Configure the Singapore endpoint through `QWEN_BASE_URL` and keep it out of committed runtime output.
4. Run the 10-post dry run against complete local visual inputs.
5. Record model ID, region, tokens, reported cost, latency, retries, and failures per post.
6. Stop before the full run if any hard gate fails or projected cost exceeds the approved cap.
7. Run the full 50-post baseline only after the dry run is reviewed.

## Secret handling

- Create a project-specific key, not a root-account credential.
- Supply the key only through the process environment or an approved local secret store.
- Never commit a real `.env` file.
- Redact authorization headers and API keys from logs and error messages.
- Rotate or revoke the pilot key after Phase 0.

No API call, provider-credit consumption, payment method, or paid usage is authorized merely by this model selection. Those actions still require the product owner's explicit spending approval.
