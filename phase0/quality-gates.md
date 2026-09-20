# Phase 0 quality gates

These gates determine whether the frozen-corpus multimodal baseline supports a `GO`, `CONDITIONAL GO`, or `NO-GO` recommendation. Fixture self-test scores do not count toward these gates.

## Measurement set

- Final measurement uses all 50 frozen-corpus posts after human validation from captions and all ordered visual media.
- A metered 10-post dry run must cover event, non-event, single-image, carousel, multi-event, and insufficient-detail cases before the full run.
- First-attempt results and results after at most one bounded formatting/transport retry must be reported separately.

## Hard gates

All hard gates must pass:

| Gate | Required result |
|---|---:|
| Complete ordered visual input | 100% of evaluated posts |
| Schema parse rate after at most one bounded retry | 100% |
| Populated factual fields with evidence entries | 100% |
| Critical hallucinations | 0 |
| Candidates marked `ready` when required media is incomplete | 0 |
| Evaluation spend above the approved cap | 0 |

A critical hallucination is an unsupported or incorrect event date, time, venue, registration URL, or event identity that could cause a user to attend, register for, or travel to the wrong event.

## Quality floors

| Metric | Minimum |
|---|---:|
| Post classification accuracy | 90% |
| Core-field correctness | 90% |
| Core-field coverage | 85% |
| Multi-event candidate recall | 100% |
| Human-audited evidence grounding | 95% |

Core fields are `event_name`, `start_date`, `venue`, and `format`, matching the current evaluation runner. Unknown gold values are excluded from coverage and correctness denominators. Evidence grounding measures whether each cited caption or slide actually supports the populated field, not merely whether an evidence object exists.

## Decision rule

- `GO`: every hard gate and quality floor passes.
- `CONDITIONAL GO`: every hard gate passes, and at most one quality floor is no more than five percentage points below target, with a documented remediation and owner.
- `NO-GO`: any hard gate fails, more than one quality floor misses, a quality floor misses by more than five points, or cost/reliability cannot be bounded.

Small-sample metrics must be read with their denominators. In particular, the known multi-event subset is small, so one missed candidate fails the 100% multi-event-recall gate and must be reviewed directly.
