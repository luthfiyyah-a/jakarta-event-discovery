# Codex CLI handoff

This repository is the portable source of truth for continuing development on a local computer with Codex CLI.

## Local setup

Prerequisites: Git, Node.js 20+, and Codex CLI.

```bash
git clone https://github.com/luthfiyyah-a/jakarta-event-discovery.git
cd jakarta-event-discovery
git fetch origin
git switch codex/phase0-handoff
npm run test:phase0
codex
```

On first launch, sign in using the method offered by Codex. Codex reads the root `AGENTS.md` automatically when started from this repository.

After reviewing this branch, merge its pull request into `main`. For later machines, clone `main` directly instead of switching to the handoff branch.

## First prompt to use locally

```text
Read AGENTS.md, docs/project-tracker.md, phase0/README.md, and the Phase 0 corpus metadata. Summarize the current state, verify npm run test:phase0, then propose the smallest next task that advances the live multimodal evaluation without spending money or changing the frozen corpus. Do not implement production application code yet.
```

## What is already available

- A 50-post corpus from five pilot accounts under `phase0/corpus/`.
- Provider-neutral raw-post and event-extraction JSON Schemas.
- Fixtures and contract tests.
- A deterministic evaluation runner for fixture/self-test use.
- A versioned multimodal extraction prompt.
- An Apify source-provider spike record and explicit zero-cash guardrails.

## What is deliberately not committed

- Apify tokens or any other credentials.
- Raw provider responses and downloaded Instagram media.
- Temporary CDN URLs and local evaluation reports.
- The older 10-post spreadsheet, because the repository already contains the newer 50-post corpus.

## Next decision point

The next blocker is choosing an approved multimodal model/provider and its spending boundary. Until that decision is made, useful local work includes visual-label review, adapter design against fixtures, idempotency tests, and evaluation-runner improvements that do not call paid services.

## Branch workflow

```bash
git switch main
git pull --ff-only
git switch -c codex/<short-task-name>
# run tests, inspect git diff, then commit and push
```

Keep one focused task per branch. Never commit `.env`, downloaded social-media assets, or raw provider payloads.
