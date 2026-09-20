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

- [Model pricing and regional availability](https://help.aliyun.com/en/model-studio/model-pricing)
- [Structured output](https://help.aliyun.com/en/model-studio/qwen-structured-output)
- [Singapore region and endpoints](https://help.aliyun.com/en/model-studio/singapore-regional-access-information)

For multimodal input, use JSON Object mode and validate the parsed result locally. Do not assume provider-side strict JSON Schema enforcement for image requests.

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
