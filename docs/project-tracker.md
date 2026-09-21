# Project tracker - Infotech Jakarta

- **Updated:** 2026-09-21
- **Current phase:** Phase 0 feasibility and quality baseline
- **RFC:** [RFC-001](rfc-001-jakarta-event-discovery.md)
- **Production implementation:** Not authorized

## Current snapshot

| Work item | Status | Evidence / remaining work |
|---|---|---|
| P0-01 Freeze representative corpus | Partial | The repository contains 50 caption-inspected posts across five pilot accounts. All 35 candidate labels remain provisional: 25 `caption_only` and 10 `needs_review`. Ordered image media is locally present for 48/50 posts; `LIF-001` and `LIF-005` each contain a video slide and remain incomplete under the image-only scope. |
| P0-02 Select retrieval provider | Complete for Phase 0 | Apify Free Plan selected; profile smoke test returned 10/10 posts and direct-permalink test returned 11/11 ordered carousel slides. Cash spend: USD 0. |
| P0-03 Define raw-post contract | Complete | `phase0/contracts/raw-post-result.schema.json` plus fixtures and tests. |
| P0-04 Prove media completeness/idempotency | Partial | Direct-permalink retrieval returned a result for all 50 corpus posts. The guarded runner downloaded 48 image-only posts, preserves ordered carousels, resumes from local datasets, retries CDN failures, and continues after per-post failures. Live repeated-run evidence and handling of the two mixed image/video carousels remain. |
| P0-05 Define extraction contract/prompt | Complete | Versioned schema and multimodal prompt are checked in. |
| P0-06 Build evaluation harness | Partial | Deterministic fixture runner and a provider-neutral adapter boundary pass fixture tests. No provider-specific live adapter exists. Fixture scores are not live quality evidence. |
| P0-07 Run frozen-corpus baseline | Not started | Qwen3-VL-Flash and numerical quality gates are selected. Human-validated gold labels, complete visual inputs, API access, and a spending boundary remain. |
| P0-08 Go/no-go review | Not started | Depends on P0-07 results and documented failure analysis. |

## Repository verification

- Node.js requirement: version 20 or newer.
- `npm run test:phase0`: 42/42 tests passed on Windows, including Apify input/result mapping, batch-failure isolation, CDN retry/fallback, retrieval idempotency, model-adapter boundary, and local media-layout coverage.
- Corpus validator: 50 posts, five accounts, and 35 candidates passed structural checks.
- Media-layout validator: 48/50 post directories are structurally valid. `LIF-001` and `LIF-005` are deliberately missing because each requires a video slide; source completeness still needs human confirmation.
- The checked-in 50-post corpus remains the source of truth.

These checks verify repository mechanics and internal consistency. They do not validate the provisional labels or live-model quality.

## Measured provider results

| Test | Result | Runtime | Provider credit | Cash |
|---|---:|---:|---:|---:|
| Five profiles, two posts each | 10/10 posts | 23 s | USD 0.017 | USD 0 |
| One direct carousel permalink | 11/11 ordered slides | 3 s | USD 0.003 | USD 0 |
| Frozen-corpus direct permalinks | 50/50 dataset results; 48 image-only posts downloaded | Six guarded runs | USD 0.135 | USD 0 |

Total documented Apify credit usage is USD 0.155 and cash spend is USD 0. Profile mode was sufficient for discovery metadata but did not return child media in the tested configuration. The direct-permalink actor returned ordered child media. Two corpus carousels contain one video child each and are correctly rejected by the current image-only runner. These observations are limited to the tested payloads and are not a production reliability claim.

## Active constraints

- Apify Free Plan only; maximum cash budget USD 0.
- No payment method, paid upgrade, or overage without a new explicit decision.
- Provider-credit use for corpus media retrieval was approved on 2026-09-21; stop if Free Plan credit is insufficient.
- Qwen3-VL-Flash is approved for the baseline; API access and the maximum spend are undecided.
- Human approval remains required before publishing any event.
- Production application scaffolding remains out of scope.

The IDR 50,000 figure in [the budget document](../phase0/budget.md) is a historical planning envelope, not current spending authorization.

## Current blockers

1. All 50 posts still require human validation using caption plus all ordered visual media.
2. `LIF-001` and `LIF-005` require a decision on mixed-carousel video handling before their visual inputs can be complete.
3. Live repeated-run idempotency evidence is incomplete.
4. Qwen API access and the maximum spend need product-owner action/approval before a live call.

## Recommended next sequence

1. Review the 48 locally complete image posts and resolve their provisional gold labels.
2. Decide whether and how the two mixed image/video carousels enter Phase 0 scope.
3. Capture live repeated-run idempotency evidence without replacing the frozen corpus.
4. Implement the Qwen-specific adapter behind the tested boundary without making a live call.
5. Confirm the Qwen Singapore API key and explicit maximum spend.
6. Run an approved metered 10-post dry run before any full-corpus evaluation.
7. Run the frozen-corpus baseline, inspect failures, and hold the go/no-go review before production scaffolding.

## Decisions requiring the product owner

- Qwen API-key setup and maximum spend.
- Whether mixed-carousel video and/or Reel extraction enters scope.
- The final `GO`, `CONDITIONAL GO`, or `NO-GO` decision.

## Exit criteria for Phase 0

- Corpus labels are human-validated from caption plus all ordered visual media.
- Retrieval completeness and stable identifiers are demonstrated across representative post types.
- Live extraction outputs conform to the schema and include field-level evidence.
- Baseline metrics, costs, and failure categories are documented and accepted.
- The product owner records an explicit `GO`, `CONDITIONAL GO`, or `NO-GO` decision.
