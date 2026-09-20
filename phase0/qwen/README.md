# Qwen Phase 0 candidate notes

Qwen is a candidate for the Phase 0 multimodal baseline, not an approved provider/model. Setup and API usage are deferred until the product owner explicitly approves the provider, exact model, dry-run batch, and spending boundary. Do not create or paste an API key into this repository.

## Candidate strategy

1. Select and record an exact version-pinned Qwen vision model only after approval.
2. Use non-thinking structured JSON mode.
3. Compare a stronger Qwen vision model only if the baseline misses the RFC quality gate.
4. Record tokens and estimated cost per post.
5. Stop before the full 50-post run if the projected cost could exceed the separately approved spending boundary.

## Secret handling

- Create a project-specific key, not a root-account credential.
- Supply the key only as `QWEN_API_KEY` in the process environment or an approved local secret store.
- Never commit a real `.env` file. The repository contains only `.env.example` with empty values.
- Redact authorization headers and API keys from logs and error messages.
- Rotate or revoke the pilot key after Phase 0.

The product owner will be guided through account and key creation only after the dry-run code is ready and the provider decision is approved. Creating a key remains a manual product-owner action.
