# Project tracker — Infotech Jakarta

**Updated:** 2026-09-21  
**Current phase:** Phase 0 feasibility and quality baseline  
**Production implementation:** Not authorized yet

## Current snapshot

| Work item | Status | Evidence / remaining work |
|---|---|---|
| P0-01 Freeze representative corpus | Partial | Repository contains 50 inspected posts across five pilot accounts. Visual/human validation remains incomplete for provisional labels. |
| P0-02 Select retrieval provider | Complete for Phase 0 | Apify Free Plan selected; profile smoke test returned 10/10 posts and direct-permalink test returned 11/11 ordered carousel slides. Cash spend: USD 0. |
| P0-03 Define raw-post contract | Complete | `phase0/contracts/raw-post-result.schema.json` plus fixtures and tests. |
| P0-04 Prove media completeness/idempotency | Partial | One 11-slide carousel passed. Repeated-run stable-ID test, additional carousel shapes, and reel/video behavior remain. |
| P0-05 Define extraction contract/prompt | Complete | Versioned schema and multimodal prompt are checked in. |
| P0-06 Build evaluation harness | Partial | Deterministic fixture runner and tests pass; no live model adapter yet. |
| P0-07 Run frozen-corpus baseline | Not started | Requires human-validated gold labels, full visual inputs, approved model/provider, and spending boundary. |
| P0-08 Go/no-go review | Not started | Depends on P0-07 results and documented failure analysis. |

## Measured provider results

| Test | Result | Runtime | Provider credit | Cash |
|---|---:|---:|---:|---:|
| Five profiles, two posts each | 10/10 posts | 23 s | USD 0.017 | USD 0 |
| One direct carousel permalink | 11/11 ordered slides | 3 s | USD 0.003 | USD 0 |

Profile mode was sufficient for discovery metadata but did not return child media in the tested configuration. The direct-permalink actor returned ordered child media. These observations are limited to the tested payloads and are not a production reliability claim.

## Active constraints

- Apify Free Plan only; maximum cash budget USD 0.
- No payment method, paid upgrade, or overage without a new explicit decision.
- Ask before consuming more provider credit.
- AI extraction provider/model and its budget are undecided.
- Human approval remains required before publishing any event.

## Recommended next sequence

1. Review all 50 posts visually and resolve provisional gold labels.
2. Add repeat-run/idempotency and failure-classification evidence for the retrieval path.
3. Decide a multimodal model/provider and explicit maximum spend.
4. Implement the smallest live-model adapter behind the checked-in extraction contract.
5. Run the frozen-corpus baseline, inspect failures, and record coverage/correctness/multi-event recall.
6. Hold the go/no-go review before creating production application scaffolding.

## Exit criteria for Phase 0

- Corpus labels are human-validated from caption plus all ordered visual media.
- Retrieval completeness and stable identifiers are demonstrated across representative post types.
- Live extraction outputs conform to the schema and include field-level evidence.
- Baseline metrics and failure categories are documented and accepted.
- Product owner records an explicit GO, CONDITIONAL GO, or NO-GO decision.
