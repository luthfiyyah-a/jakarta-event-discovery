# Phase 0 budget guardrail

## Current authorization

- Apify: Free Plan only, with a maximum cash spend of USD 0.
- The approved corpus retrieval is complete. Any additional provider-credit use requires explicit product-owner approval.
- AI extraction: Qwen3-VL-Flash is selected, but no live batch or spending boundary is approved yet.
- Payment methods, paid upgrades, and overage are not authorized.

## Measured usage

| Activity | Provider credit | Cash |
| --- | ---: | ---: |
| Initial profile and direct-carousel spikes | USD 0.020 | USD 0 |
| Six frozen-corpus direct-permalink runs | USD 0.135 | USD 0 |
| **Total documented Apify usage** | **USD 0.155** | **USD 0** |

The corpus runs returned 50/50 dataset results. Forty-eight in-scope image-only posts were downloaded locally; two mixed image/video carousels are excluded from the current scope.

Qwen's Singapore free quota is conditional on account eligibility and expiry. It must be verified in the Model Studio console and configured to stop when the quota is exhausted; “free quota available” is not authorization for paid overage.

## Historical planning envelope

The original planning ceiling was **IDR 50,000 total** for Instagram-provider access and AI extraction. It is retained for planning history and is not permission to spend.

The initial proposed allocation was:

| Component | Working cap |
| --- | ---: |
| Qwen 10-post metered dry run | IDR 5,000 |
| Qwen full run and bounded retries | IDR 10,000 |
| Instagram provider | IDR 35,000 |

Any future paid batch requires a new explicit product-owner decision that names the provider/model, batch size, maximum spend, stop condition, and whether the planning allocation changes. Actual usage, currency-conversion assumption, and remaining approved budget must be recorded before and after each approved batch.
