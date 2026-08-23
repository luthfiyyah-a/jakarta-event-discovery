# Jakarta Event Discovery

Phase-gated implementation of RFC-001 Jakarta Event Discovery Platform.

The repository currently contains only the Phase 0 feasibility workspace. It does not yet contain the production Spring Boot application. Production foundation work starts only after the Phase 0 decision is `GO` or an approved `CONDITIONAL GO`.

## Current scope

- Build a 50-post labeled pilot corpus.
- Evaluate Instagram source-provider access and carousel completeness.
- Define a provider-neutral raw-post contract.
- Evaluate multimodal extraction of zero, one, or many event candidates.
- Measure quality, failure modes, and cost before production investment.

See [phase0/README.md](phase0/README.md) for the working conventions and current corpus status.

## Security

API credentials must be supplied through environment variables or a local secret store. Real keys, downloaded media, and raw provider responses are intentionally excluded from Git.
