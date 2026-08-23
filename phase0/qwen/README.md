# Qwen Phase 0 setup

Qwen setup is intentionally deferred until the extraction runner is ready for a metered 10-post dry run. Do not create or paste an API key into this repository.

## Planned model strategy

1. Use a version-pinned Qwen vision/flash model for the inexpensive baseline.
2. Use non-thinking structured JSON mode.
3. Compare a stronger Qwen vision model only if the baseline misses the RFC quality gate.
4. Record tokens and estimated cost per post.
5. Stop before the full 50-post run if projected total Phase 0 spend could exceed IDR 50,000.

## Secret handling

- Create a project-specific key, not a root-account credential.
- Supply the key only as `QWEN_API_KEY` in the process environment or an approved local secret store.
- Never commit a real `.env` file. The repository contains only `.env.example` with empty values.
- Redact authorization headers and API keys from logs and error messages.
- Rotate or revoke the pilot key after Phase 0.

The product owner will be guided through account and key creation only when the dry-run code is ready. Creating a key is a manual product-owner action.
