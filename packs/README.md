# Regional deployment packs

Data-driven regional content for Road Racer AI. Adding a region requires only a new folder under `regions/` plus a `registry.json` entry — no application logic changes for hierarchy or subdivision.

## Layout

- `registry.json` — full geographic tree (AU + Regions 01–13)
- `active.json` — packs bundled in this release (default: `["au"]`)
- `schema/` — manifest / hierarchy / content-type schemas
- `shared/` — market-agnostic coach/bike notes
- `regions/<id>/` — one pack per root region

## Commands (from `api/`)

```bash
npm run validate-packs
npm run bootstrap-packs      # scaffold empty slots from registry
npm run migrate-au-pack      # refresh AU pack from legacy api/app data
npm run seed-pilot-packs     # UK / Spain / Italy seed content
npm run sync-app-packs       # copy active pack slices into app/src/packs/bundled
```

## Status values

| Status | Meaning |
|--------|---------|
| `active` | Production-ready for bundling |
| `seed` | Research seed (UK, ES, IT) — not claiming full completeness |
| `scaffold` | Empty slots + hierarchy only |

## Hybrid releases

Edit `active.json` (or set `PACK_ACTIVE=au,uk`) then run `sync-app-packs` before building the app.

Current default hybrid for UK scale launch: `["au","uk"]` (Australia home + United Kingdom). See `docs/uk-launch/`.

The home header flag is the primary pack’s country. The hybrid stays on the Australian flag because `au` is first. A country binary sets `EXPO_PUBLIC_PACK` so that pack is primary (UK → `uk` → the UK flag). Add the flag in `homeCountries.ts` and `src/assets/flags/` in both app trees before shipping any other country pack.
