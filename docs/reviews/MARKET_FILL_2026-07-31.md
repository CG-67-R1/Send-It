# Market pack fill — 2026-07-31

Hermes skill: `send-it/market-pack` (mode **fill-pack**)

## Result

All former scaffold packs promoted to **seed** with researched federations, circuits (GPS, empty corners), series, news, licensing, AI prompts, i18n, emergency/weather.

| Pack | Status | Tracks | Federations (items) |
|------|--------|--------|---------------------|
| na-east | seed | 12 | 4 |
| na-west | seed | 8 | 4 |
| jp | seed | 6 | 2 |
| id | seed | 2 | 1 |
| my | seed | 2 | 1 |
| th | seed | 3 | 1 |
| za | seed | 5 | 1 |
| sa | seed | 7 | 6 |
| cn | seed | 5 | 2 |
| fr | seed | 7 | 1 |

Pre-existing pilots unchanged: `uk`, `es`, `it` (seed). Reference: `au` (active).

`node scripts/validate-packs.mjs` — OK.

## Notes

- Hermes oneshot ended with **HTTP 402** (inference credits) after writing pack files; validation run separately.
- Corner geometry intentionally empty — Track Walk programme still required per market.
- Claims carry confidence tags; federation URLs should be re-verified before promoting any pack to `active`.
- `active.json` remains `["au"]` — hybrid release unchanged.

## Next

1. Owner spot-check URLs / series names with local riders.
2. Top up Hermes credits if further research passes needed.
3. Set `packs/active.json` + `npm run sync-app-packs` when bundling a non-AU release.
