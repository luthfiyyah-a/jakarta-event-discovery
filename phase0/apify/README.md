# Apify media retrieval

The Phase 0 media runner uses the official `apify/instagram-scraper` Actor with direct Instagram post permalinks from the frozen corpus.

## Active authorization

- Apify Free Plan only.
- Maximum cash spend: USD 0.
- No payment method, paid upgrade, or overage.
- Provider-credit use for corpus media retrieval was approved by the product owner on 2026-09-21.
- Stop if free-plan credit is insufficient.

## Local token setup

Copy `.env.example` to the ignored `.env` file and set:

```dotenv
INSTAGRAM_PROVIDER_API_KEY=your_project_specific_apify_token
```

Never paste the token into chat, logs, committed files, command arguments, or URLs. The runner also accepts `APIFY_TOKEN` or `APIFY_API_TOKEN` from the process environment.

## Smoke test

Start with one corpus post and a USD 0.01 provider-charge cap:

```powershell
npm run retrieve:apify -- --execute --post-id AWS-001 --max-charge-usd 0.01
```

The runner refuses to call Apify without `--execute`. It allows at most ten posts and a maximum provider-charge cap of USD 0.05 per run.

Successful downloads are stored only in ignored paths:

- `phase0/media/<post_id>/slide-NN.<extension>`
- `phase0/raw/<post_id>.json`
- `phase0/raw/<post_id>.manifest.json`
- `phase0/raw/apify-run-<run_id>.json`

Run `npm run validate:media-layout` afterward. This verifies local directory/file ordering but does not replace human confirmation that the source carousel has no missing final slide.

The runner refuses to overwrite an existing post directory. Video media is reported as out of scope instead of being treated as a successful image retrieval.
