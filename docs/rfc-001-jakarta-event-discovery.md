# RFC-001: Jakarta Event Discovery Platform

- **Status:** Draft; Phase 0 validation in progress
- **Last aligned:** 2026-09-21
- **Production implementation:** Not authorized

## Summary

Build a workflow that discovers public technology-event posts relevant to Jakarta and the wider Jabodetabek area, preserves source provenance, extracts structured event candidates from captions plus ordered visual media, and keeps a human in the publication loop.

The project is phase-gated. Phase 0 must establish retrieval feasibility, multimodal extraction quality, failure modes, and bounded cost before production application work begins.

## Problem

Technology-event information is often distributed across Instagram captions, single images, carousels, and potentially video. Important facts may appear only in visual media, one post may advertise several independently attendable events, and several posts may refer to the same real-world event. A caption-only or single-image pipeline would therefore produce incomplete or misleading records.

## Phase 0 scope

- Maintain a representative frozen corpus of at least 50 real posts from at least three target accounts.
- Retrieve stable source identifiers, permalinks, captions, post type, and all required media in source order.
- Treat missing required media as an incomplete retrieval.
- Extract zero, one, or many event candidates under a provider-neutral contract.
- Attach source evidence to every populated factual field.
- Evaluate schema conformance, classification, core-field coverage/correctness, multi-event recall, failure categories, latency, and cost.
- Require human review before any event is published.

## Out of scope until the Phase 0 decision

- Spring Boot or other production application scaffolding.
- Production ingestion schedules, databases, moderation UI, search, or public publishing.
- Paid provider usage without a separately approved provider, model, batch, and spending boundary.
- Reel/video extraction unless product scope is explicitly expanded.

## Data and provenance requirements

For every source post, preserve the source permalink, stable external identifier, source account, ordered media, and a reference to the raw provider payload. Every extracted factual field must retain caption or media evidence. Temporary CDN URLs, downloaded media, raw provider responses, and credentials must not be committed.

One post may yield zero, one, or many candidates. Multiple posts may support one canonical event. Independently attendable events may share an event-series group without being merged. Detailed cardinality rules live in the [labeling policy](../phase0/corpus/labeling-policy.md).

## Phase 0 exit criteria

Phase 0 is complete only when:

- the frozen corpus has human-validated labels based on captions and all ordered visual media;
- retrieval completeness and stable identifiers have been demonstrated across representative post types;
- live multimodal outputs conform to the extraction contract and include field-level evidence;
- baseline metrics, cost, and failure categories have been documented and accepted; and
- the product owner records an explicit `GO`, `CONDITIONAL GO`, or `NO-GO` decision.

The approved numerical acceptance thresholds and decision rule are recorded in the [Phase 0 quality gates](../phase0/quality-gates.md).

## Current decisions

- The checked-in 50-post corpus is the Phase 0 source of truth.
- Apify Free Plan is the selected retrieval provider for Phase 0 evidence gathered so far.
- The active Apify cash budget is USD 0; no payment method, paid upgrade, or overage is authorized.
- The baseline model is Qwen3-VL-Flash, pinned to `qwen3-vl-flash-2026-01-22` in non-thinking mode for the Singapore/International region.
- Multimodal output uses JSON Object mode followed by local contract validation; provider-side strict JSON Schema enforcement is not assumed.
- The Qwen spending boundary and API access are not yet approved.
- Caption-derived `caption_only` and `needs_review` labels are provisional, not visual ground truth.

## Open decisions

The product owner must approve:

- the Qwen maximum spend and API-key setup;
- any additional provider-credit consumption;
- whether Reel/video extraction enters scope;
- the final Phase 0 go/no-go outcome.

Measured progress and the next executable work are maintained in the [project tracker](project-tracker.md). Budget history and current authorization are separated in the [Phase 0 budget guardrail](../phase0/budget.md).
