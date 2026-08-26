# Phase 0 feasibility workspace

## Status

The corpus currently contains 50 inspected posts across all five pilot accounts:

- 11 from `awsugid`
- 13 from `gdgjakarta`
- 12 from `garudaspark`
- 8 from `indonesiadesignresearch`
- 6 from `lifeatblibli`

The RFC corpus-size gate of 50 real posts from at least three target accounts is met. All five pilot accounts are represented. This satisfies the sample-size prerequisite only; provider completeness, extraction quality, latency, failure-mode, and cost gates remain open.

The sampling pool contains the original 30 top-grid permalinks plus three additional image/carousel posts selected on 26 August 2026 to close the RFC sample-size gate. All 26 image/carousel posts in the pool have been inspected and admitted to the corpus. Seven Reels are retained as observed source data but are excluded from the default RFC image/carousel corpus until the product scope explicitly includes video extraction.

Two collaboration-post edge cases resolve to a partner account as the primary Instagram author even though they appeared on a pilot account's profile grid. They remain attributed to the sampled pilot account in `source_account`, with the primary-author mismatch recorded in `ambiguity_notes` so source provenance can be tested explicitly.

## Corpus files

- `corpus/pilot-posts.csv`: one record per Instagram post.
- `corpus/top-grid-sampling-pool.csv`: ranked profile-grid discoveries awaiting caption/media inspection and final corpus admission.
- `corpus/gold-event-candidates.csv`: zero or more extracted event candidates per post.
- `corpus/canonical-event-groups.csv`: cross-post grouping of candidates that refer to the same real-world event.
- `corpus/event-series-groups.csv`: connects independently attendable events to an umbrella event series without merging them.
- `corpus/labeling-policy.md`: product rules for event, session, and multi-event labeling.

Unknown values remain blank until the original post and all available slides have been inspected. Ambiguous cases are documented rather than forced into a gold label.

Run `powershell -NoProfile -ExecutionPolicy Bypass -File phase0/validate-corpus.ps1` from the repository root to verify the sample-size gate, uniqueness, cross-file references, candidate cardinality, and sampling-pool status. The execution-policy override applies only to that PowerShell process.

## Budget

The hard Phase 0 budget is IDR 50,000 across Instagram-provider and AI usage. A 10-post metered dry run must precede the full evaluation.
