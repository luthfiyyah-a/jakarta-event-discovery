# Pilot corpus labeling policy

This policy separates post-level extraction from canonical-event grouping. It preserves the RFC cardinality rules: one post may yield zero, one, or many candidates, while one canonical event may be supported by many source posts.

## Post roles

- `EVENT_OVERVIEW`: promotes the real-world event as a whole.
- `SESSION_PROMO`: promotes a speaker, topic, or agenda session inside a larger event.
- `STANDALONE_EVENT`: the post represents an independently attendable event.
- `MULTI_EVENT`: the post contains two or more independently attendable events.
- `EVENT_SUPPORT`: setup, reminder, venue instruction, or other evidence for an event that should not create a new candidate by itself.
- `RECAP_OR_NON_EVENT`: no upcoming event candidate should be produced.
- `UNKNOWN`: insufficient evidence until caption and slides are inspected.

## Counting rules

### Event series versus canonical event

An event series is an umbrella grouping, not automatically a public event. Create separate canonical events when a user makes a separate attendance decision, including events on different dates or programs with distinct registration paths. Connect those events through `event_series_group` metadata rather than merging them.

Two tracks on the same date and at the same venue remain separate events when they have distinct programs and registration paths. Conversely, speaker sessions or agenda blocks under one registration and attendance decision remain parts of one canonical event.

### Several posts for one event

Group posts under one `canonical_event_group` when they share the same real-world event identity. A changed speaker or session subtitle does not create a new canonical event by itself.

Strong grouping evidence includes the same event brand, event date, venue, registration destination, and organizer framing. Conflicting evidence must be flagged for human review.

### One post with several speakers

Return one event when the speakers participate in one program with one attendance decision, date/venue context, and registration flow. Speaker count is not event count.

### Sessions inside a larger event

A session is not a separate canonical event when attendees register for or attend the parent event and the session is merely part of its agenda. Store the post as `SESSION_PROMO` and link its evidence to the parent canonical event.

A session may be treated as a standalone event only when it is independently attendable or registerable, or when the product owner confirms that users should discover it independently.

### Multi-event posts

Return separate candidates when a post advertises independently attendable programs with distinct identities or attendance decisions. Multiple titles or speakers alone are not sufficient.

## Ambiguity rule

Do not force a gold label. Mark the row `needs_review`, record competing interpretations, and ask the product owner to adjudicate the specific case.

## Relevance rule

`post_role` describes what the source post represents before product filtering. `gold_event_count` describes the candidates expected after the RFC technology and Jabodetabek relevance rules. A real event outside Jabodetabek may therefore be labeled `STANDALONE_EVENT` with `gold_event_count=0`; this is an intentional negative relevance case, not contradictory data.

## Evaluation boundary

The RFC Phase 0 quality gate evaluates per-post extraction, including known multi-event cases. Cross-post canonical grouping is recorded as an additional corpus dimension so that later deduplication and moderation work can be tested without losing this pilot evidence.
