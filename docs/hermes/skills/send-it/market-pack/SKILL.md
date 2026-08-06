---
name: market-pack
description: "Research and fill Road Racer AI regional packs under packs/regions/. Web-researched federations, tracks (GPS, no fabricated corners), series, news, licensing, AI prompts. Modes: market-research (report), fill-pack (write seed JSON)."
version: 1.0.0
author: Send-It / Hermes setup
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [market, region, packs, research, send-it, roadrace]
    related_skills: [send-it/rr-app-expert, send-it/track-data-analyst]
---

# Send-It Market Pack

Standing skill for **regional pack research and seed data** for Road Racer AI.

Repo root: `C:\Users\Administrator\.cursor\Send-It`  
Packs live under `packs/regions/<packId>/`. Registry: `packs/registry.json`.

## Modes

| Mode | Behaviour |
|------|-----------|
| **market-research** | Report only → `docs/reviews/MARKET_<ID>_YYYY-MM-DD.md` |
| **fill-pack** | Research + **write** seed JSON into `packs/regions/<id>/` (user must ask to fill/add data) |
| **source-audit** | News/calendar scrape feasibility notes |
| **track-inventory** | Venue list only; never invent corner hands |
| **readiness-gate** | Ready / Blocked / Needs owner checklist |

## Policy

1. **Confidence tags** on every claim: `official` | `established-press` | `community` | `unverified`.
2. **No fabricated corners** — tracks may have `name`, `lat`, `lng`, empty `corners: []`.
3. **Do not invent rule clause numbers** — link-out to federation rulebook URLs.
4. Prefer official federation / series sites over forums.
5. After writing packs: run `node scripts/validate-packs.mjs` from repo root.
6. Set pack `manifest.status` to `seed` when filling scaffolds (not `active` unless owner says so).
7. Match existing seed shape from `packs/regions/uk/` (reference for structure).

## Pack files to fill (minimum for seed)

Write/update these relative to `packs/regions/<packId>/`:

- `manifest.json` — status `seed`, locales, spelling
- `organisations/federations.json` — `{ items: [...] }`
- `tracks/tracks.json` — `{ version: 1, tracks: [...] }` with GPS where known
- `competitions/series.json` — domestic series with `local: true`
- `competitions/classes.json`
- `calendar/sources.json`
- `news/sources.json` (≥3 trusted sources)
- `headlines/sources.json` — `sourceIds` only if matching existing API scrapers; else empty + notes
- `licensing/pathways.json`
- `rules/rulebook.json` — link-out
- `ai/prompts.json` — home context, `webSearchCountry`, spelling
- `i18n/strings.json`
- `onboarding/areas.json`
- `emergency.json`, `weather/sources.json`
- `progression/pathways.json`, `terminology.json`

Keep empty arrays for suppliers/services if unknown.

## Pack IDs (first-release scaffolds)

| packId | Region | Notes |
|--------|--------|-------|
| na-east | North America East | Eastern US + Eastern Canada coverage areas |
| na-west | North America West | Western US + Western Canada |
| jp | Japan | MFJ |
| id | Indonesia | IMI |
| my | Malaysia | MAM |
| th | Thailand | FMSCT |
| za | South Africa | MSA |
| sa | South America | BR, AR, CL, CO, PE, UY children |
| cn | China | FMS |
| fr | France | FFM |

Also may refresh pilots: `uk`, `es`, `it` (already seed).

## Research checklist (every pack)

1. Governing body + official URL  
2. Licence pathway (high-level steps + URL)  
3. Domestic road-race series + calendar URL  
4. Primary asphalt circuits (name + approximate GPS)  
5. ≥3 news sources  
6. AI prompt home-context + ISO country for web search  
7. Local terminology / spelling (tyre vs tire)  
8. Emergency number + national weather source  

## Invocation examples

```text
/market-pack
Mode fill-pack. Fill ALL scaffold packs: na-east, na-west, jp, id, my, th, za, sa, cn, fr.
Write seed JSON into packs/regions/<id>/. No fabricated corners.
Then run node scripts/validate-packs.mjs. Report what you wrote.
```

```text
/market-pack
Mode market-research for MARKET=JP.
Write docs/reviews/MARKET_JP_<date>.md. Report only.
```

## Reference seed shape

Copy field patterns from `packs/regions/uk/` and `packs/regions/au/manifest.json`.  
Each organisation/track/source item should include `id`, `nodeId` (pack root or child), and `confidence` where applicable.
