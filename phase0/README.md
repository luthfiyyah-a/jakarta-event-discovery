# Phase 0 feasibility workspace

## Status

The corpus currently contains 24 user-selected posts:

- 11 from `awsugid`
- 13 from `gdgjakarta`

The final RFC gate still requires 50 real posts from at least three target accounts. Posts from `garudaspark`, `indonesiadesignresearch`, and `lifeatblibli` remain candidates for the next sampling batch.

## Corpus files

- `corpus/pilot-posts.csv`: one record per Instagram post.
- `corpus/gold-event-candidates.csv`: zero or more extracted event candidates per post.
- `corpus/canonical-event-groups.csv`: cross-post grouping of candidates that refer to the same real-world event.
- `corpus/event-series-groups.csv`: connects independently attendable events to an umbrella event series without merging them.
- `corpus/labeling-policy.md`: product rules for event, session, and multi-event labeling.

Unknown values remain blank until the original post and all available slides have been inspected. Ambiguous cases are documented rather than forced into a gold label.

## Budget

The hard Phase 0 budget is IDR 50,000 across Instagram-provider and AI usage. A 10-post metered dry run must precede the full evaluation.
