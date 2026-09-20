# Phase 0 feasibility workspace

## Status

The corpus currently contains 50 caption-inspected posts across all five pilot accounts:

- 11 from `awsugid`
- 13 from `gdgjakarta`
- 12 from `garudaspark`
- 8 from `indonesiadesignresearch`
- 6 from `lifeatblibli`

The [RFC-001](../docs/rfc-001-jakarta-event-discovery.md) corpus-size gate of 50 real posts from at least three target accounts is met. All five pilot accounts are represented. This satisfies the sample-size prerequisite only; the labels are not yet human-validated from all ordered visual media, and the provider-completeness, extraction-quality, latency, failure-mode, and cost gates remain open.

The sampling pool contains the original 30 top-grid permalinks plus three additional image/carousel posts selected on 26 August 2026 to close the RFC sample-size gate. All 26 image/carousel entries in the pool have been caption-inspected and admitted to the corpus. Seven Reels are retained as observed source data but are excluded from the default image/carousel corpus until the product scope explicitly includes video extraction.

Two collaboration-post edge cases resolve to a partner account as the primary Instagram author even though they appeared on a pilot account's profile grid. They remain attributed to the sampled pilot account in `source_account`, with the primary-author mismatch recorded in `ambiguity_notes` so source provenance can be tested explicitly.

## Corpus files

- `corpus/pilot-posts.csv`: one record per Instagram post.
- `corpus/top-grid-sampling-pool.csv`: ranked profile-grid discoveries awaiting caption/media inspection and final corpus admission.
- `corpus/gold-event-candidates.csv`: zero or more extracted event candidates per post.
- `corpus/canonical-event-groups.csv`: cross-post grouping of candidates that refer to the same real-world event.
- `corpus/event-series-groups.csv`: connects independently attendable events to an umbrella event series without merging them.
- `corpus/labeling-policy.md`: product rules for event, session, and multi-event labeling.

Unknown values remain blank until the original post and all available slides have been inspected. The current `caption_only` and `needs_review` candidate labels are provisional. Ambiguous cases are documented rather than forced into a gold label.

Run `powershell -NoProfile -ExecutionPolicy Bypass -File phase0/validate-corpus.ps1` from the repository root to verify the sample-size gate, uniqueness, cross-file references, candidate cardinality, and sampling-pool status. The execution-policy override applies only to that PowerShell process.

## Retrieval repeatability support

`retrieval/compare-retrieval-runs.mjs` compares two contract-shaped retrieval results while ignoring retrieval timestamps and temporary source URLs. It reports drift in status, provider, stable post identity, media count/order/type/checksum, and failure classification. Its fixture-based tests prepare the local harness only; live repeated-run provider evidence remains outstanding.

## Model adapter boundary

`evaluation/model-adapter.mjs` builds extraction input only from complete, ordered retrieval results and runs an injected provider adapter. Its run record captures provider/model identity, duration, token usage, reported cost, output, and warnings without persisting the input or raw provider payload. Credential redaction is applied to adapter errors. The checked-in tests use a fake adapter only; no external model has been called and no Qwen-specific adapter exists yet.

The approved baseline model and numerical thresholds are documented in [qwen/README.md](qwen/README.md) and [quality-gates.md](quality-gates.md). Original visual files must follow [media-layout.md](media-layout.md) and remain local-only.

## Budget and authorization

The historical Phase 0 planning ceiling is IDR 50,000, but it is not authorization to spend. The active Apify guardrail is Free Plan with a cash budget of USD 0, and no paid AI-model evaluation is approved. See [budget.md](budget.md) for the distinction between the planning envelope and current authorization.
