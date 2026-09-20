# Project tracker - Infotech Jakarta

- **Updated:** 2026-09-21
- **Current phase:** Phase 0 feasibility and quality baseline
- **RFC:** [RFC-001](rfc-001-jakarta-event-discovery.md)
- **Production implementation:** Not authorized

## Current snapshot

| Work item | Status | Evidence / remaining work |
|---|---|---|
| P0-01 Freeze representative corpus | Partial | The repository contains 50 caption-inspected posts across five pilot accounts. All 35 candidate labels remain provisional: 25 `caption_only` and 10 `needs_review`. Local visual-media readiness is currently 0/50 posts. |
| P0-02 Select retrieval provider | Complete for Phase 0 | Apify Free Plan selected; profile smoke test returned 10/10 posts and direct-permalink test returned 11/11 ordered carousel slides. Cash spend: USD 0. |
| P0-03 Define raw-post contract | Complete | `phase0/contracts/raw-post-result.schema.json` plus fixtures and tests. |
| P0-04 Prove media completeness/idempotency | Partial | One 11-slide carousel passed. Local comparison and guarded Apify media-retrieval runners are tested. Live corpus retrieval awaits local token configuration; repeated-run evidence, additional carousel shapes, and Reel/video behavior remain. |
| P0-05 Define extraction contract/prompt | Complete | Versioned schema and multimodal prompt are checked in. |
| P0-06 Build evaluation harness | Partial | Deterministic fixture runner and a provider-neutral adapter boundary pass fixture tests. No provider-specific live adapter exists. Fixture scores are not live quality evidence. |
| P0-07 Run frozen-corpus baseline | Not started | Qwen3-VL-Flash and numerical quality gates are selected. Human-validated gold labels, complete visual inputs, API access, and a spending boundary remain. |
| P0-08 Go/no-go review | Not started | Depends on P0-07 results and documented failure analysis. |

## Repository verification

- Node.js requirement: version 20 or newer.
- `npm run test:phase0`: 38/38 tests passed on Windows, including Apify input/result mapping, retrieval idempotency, model-adapter boundary, and local media-layout coverage.
- Corpus validator: 50 posts, five accounts, and 35 candidates passed structural checks.
- Media-layout validator: 0/50 post directories are currently present; source completeness remains unverified.
- The checked-in 50-post corpus remains the source of truth.

These checks verify repository mechanics and internal consistency. They do not validate the provisional labels or live-model quality.

## Measured provider results

| Test | Result | Runtime | Provider credit | Cash |
|---|---:|---:|---:|---:|
| Five profiles, two posts each | 10/10 posts | 23 s | USD 0.017 | USD 0 |
| One direct carousel permalink | 11/11 ordered slides | 3 s | USD 0.003 | USD 0 |

Profile mode was sufficient for discovery metadata but did not return child media in the tested configuration. The direct-permalink actor returned ordered child media. These observations are limited to the tested payloads and are not a production reliability claim.

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
2. Complete visual inputs are not committed; the guarded retrieval runner is ready, but the Apify token is not yet configured locally.
3. Retrieval idempotency and representative media-completeness evidence are incomplete.
4. Qwen API access and the maximum spend need product-owner action/approval.

## Recommended next sequence

1. Review all 50 posts visually and resolve provisional gold labels.
2. Configure the project-specific Apify token locally, then retrieve and verify one smoke-test post.
3. Retrieve the remaining image/carousel media in guarded batches within Free Plan credit.
4. Confirm the Qwen Singapore account/API key and explicit maximum spend.
5. Implement the Qwen-specific adapter behind the tested boundary.
6. Run an approved metered 10-post dry run before any full-corpus evaluation.
7. Run the frozen-corpus baseline, inspect failures, and hold the go/no-go review before production scaffolding.

## Decisions requiring the product owner

- Local setup of the existing project-specific Apify token.
- Qwen API-key setup and maximum spend.
- Whether Reel/video extraction enters scope.
- The final `GO`, `CONDITIONAL GO`, or `NO-GO` decision.

## Exit criteria for Phase 0

- Corpus labels are human-validated from caption plus all ordered visual media.
- Retrieval completeness and stable identifiers are demonstrated across representative post types.
- Live extraction outputs conform to the schema and include field-level evidence.
- Baseline metrics, costs, and failure categories are documented and accepted.
- The product owner records an explicit `GO`, `CONDITIONAL GO`, or `NO-GO` decision.
