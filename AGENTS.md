# Repository instructions

## Project goal

Build a Jakarta technology-event discovery workflow. Phase 0 proves that public Instagram posts can be retrieved, interpreted from caption plus visual media, and evaluated against human-reviewed labels before production development begins.

## Current phase

- Stay in Phase 0 until the go/no-go review is explicitly approved.
- The checked-in 50-post corpus under `phase0/corpus/` is the current source of truth. Do not replace it with older spreadsheets or partial exports.
- Caption-derived labels are provisional where the corpus marks them `caption_only`, `needs_review`, or equivalent. Do not describe them as fully human-validated visual ground truth.
- Production application code (including Spring Boot scaffolding) is out of scope until the Phase 0 decision.

## Working agreements

- Read `docs/codex-cli-handoff.md` and `docs/project-tracker.md` before proposing the next task.
- Make focused changes on a feature branch. Preserve unrelated user changes.
- Never commit API tokens, `.env`, provider payloads containing secrets, downloaded Instagram media, or temporary CDN URLs.
- Use environment variables for credentials. Copy `.env.example` to `.env` locally; `.env` is ignored.
- Do not purchase, upgrade, enable overage, or attach a payment method. The approved Apify guardrail is Free Plan only with a cash budget of USD 0.
- Ask the product owner before consuming additional provider credit or running a paid AI-model evaluation.
- Preserve source permalink, stable external ID, ordered media, raw payload reference, and evidence for every extracted factual field.
- Treat missing carousel children or required visual media as an incomplete retrieval, not a successful extraction.

## Verification

- Requires Node.js 20 or newer.
- Run `npm run test:phase0` after changing contracts, fixtures, prompts, or evaluation code.
- Run `npm run evaluate:fixtures` only as a runner self-test. Its fixture scores are not evidence of live-model quality.
- On Windows, the existing corpus validator can be run with `powershell -ExecutionPolicy Bypass -File phase0/validate-corpus.ps1`.

## Review expectations

- Call out schema-breaking changes and update fixtures/tests in the same change.
- Distinguish measured results from estimates and assumptions.
- Do not mark Phase 0 complete until the frozen corpus has human-validated labels and a live multimodal baseline has been evaluated.
