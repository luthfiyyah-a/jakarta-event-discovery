# Codex CLI handoff

This repository is the portable source of truth for continuing development on a local computer with Codex CLI.

## Local setup

Prerequisites: Git, Node.js 20 or newer, and Codex CLI.

```bash
git clone https://github.com/luthfiyyah-a/jakarta-event-discovery.git
cd jakarta-event-discovery
git fetch origin
git switch main
npm run test:phase0
codex
```

If work is awaiting review on a feature branch, switch to that named branch instead of `main`. Codex reads the root `AGENTS.md` automatically when started from this repository.

## Read order

1. `AGENTS.md`
2. `docs/rfc-001-jakarta-event-discovery.md`
3. `docs/project-tracker.md`
4. `phase0/README.md`
5. Relevant contracts, fixtures, prompts, tests, and corpus metadata for the selected task

## First prompt to use locally

```text
Read AGENTS.md, docs/rfc-001-jakarta-event-discovery.md, docs/project-tracker.md, and phase0/README.md. Summarize the current Phase 0 state, verify npm run test:phase0, then choose the smallest unblocked task that advances the Phase 0 exit criteria without spending money, changing the frozen corpus, or implementing production application code. Stop for product-owner approval before using provider credit or a paid AI model.
```

## What is already available

- A 50-post caption-inspected corpus from five pilot accounts under `phase0/corpus/`.
- Provider-neutral raw-post and event-extraction JSON Schemas.
- Fixtures and contract tests.
- A deterministic evaluation runner for fixture/self-test use.
- A versioned multimodal extraction prompt.
- Apify source-provider spike evidence and explicit zero-cash guardrails.
- A cross-platform `npm run test:phase0` command.

## What is deliberately not committed

- Apify, Qwen, or other credentials.
- Raw provider responses and downloaded Instagram media.
- Temporary CDN URLs and local evaluation reports.
- The older 10-post spreadsheet, because the repository contains the newer 50-post corpus.

## Current blockers

- Human visual review of all 50 posts is incomplete.
- Ordered image media is locally present for 48/50 posts but remains ignored by Git; `LIF-001` and `LIF-005` each contain a video slide and are incomplete under the image-only scope.
- Live repeated-run idempotency evidence is incomplete.
- Qwen3-VL-Flash and the acceptance thresholds are selected; API access and the spending boundary remain undecided, and no live model call has been made.

Useful local work that does not require spending includes documentation maintenance, fixture-based adapter design, redaction/metering tests, idempotency tests, and evaluation-runner hardening. Do not describe fixture scores as live-model quality evidence.

## Branch workflow

```bash
git switch main
git pull --ff-only
git switch -c codex/<short-task-name>
# run tests, inspect git diff, then commit and push when authorized
```

Keep one focused task per branch. Never commit `.env`, downloaded social-media assets, raw provider payloads, or temporary CDN URLs.
