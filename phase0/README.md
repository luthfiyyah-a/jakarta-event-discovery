# Phase 0 feasibility workspace

## Status

The corpus currently contains 34 inspected posts:

- 11 from `awsugid`
- 13 from `gdgjakarta`
- 10 from `garudaspark`

The final RFC gate still requires 50 real posts from at least three target accounts. Posts from `garudaspark`, `indonesiadesignresearch`, and `lifeatblibli` remain candidates for the next sampling batch.

An automated top-grid sampling pool contains 30 permalinks from the three remaining pilot accounts. The 10 Garuda Spark posts have been inspected and admitted to the corpus. The remaining pool contains 13 uninspected image/carousel post URLs and 7 Reels. Reels are retained as observed source data but are excluded from the default RFC image/carousel corpus until the product scope explicitly includes video extraction.

## Corpus files

- `corpus/pilot-posts.csv`: one record per Instagram post.
- `corpus/top-grid-sampling-pool.csv`: ranked profile-grid discoveries awaiting caption/media inspection and final corpus admission.
- `corpus/gold-event-candidates.csv`: zero or more extracted event candidates per post.
- `corpus/canonical-event-groups.csv`: cross-post grouping of candidates that refer to the same real-world event.
- `corpus/event-series-groups.csv`: connects independently attendable events to an umbrella event series without merging them.
- `corpus/labeling-policy.md`: product rules for event, session, and multi-event labeling.

Unknown values remain blank until the original post and all available slides have been inspected. Ambiguous cases are documented rather than forced into a gold label.

## Budget

The hard Phase 0 budget is IDR 50,000 across Instagram-provider and AI usage. A 10-post metered dry run must precede the full evaluation.
