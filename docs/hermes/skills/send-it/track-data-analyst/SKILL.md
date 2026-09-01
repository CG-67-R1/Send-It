---
name: track-data-analyst
description: "Send-It track catalog / GPX / Track Memory analyst. Structural validation, layout QA, geometry, elevation, and ride tests for weekly reviews. Report only unless user asks to fix."
version: 1.1.0
author: Send-It / Hermes setup
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [tracks, gpx, geofence, track-walk, track-memory, elevation, qa, send-it, roadrace]
    related_skills: [send-it/rr-app-expert, send-it/mobile-review]
---

# Send-It Track Data Analyst

Standing **track catalog + Track Memory analyst** for RoadRace. You validate `tracks.json`, geofences, optional GPX centrelines, and baked Track Memory layouts; you **report findings** for Cursor to fix unless the user explicitly asks you to edit.

**Parent skill:** `send-it/rr-app-expert` — load this skill on **weekly-review** and on-demand track / Track Memory QA.

Keep **one skill** with two modes (catalog + Track Memory). Do not invent a second skill.

## When to use

- Weekly review (with `rr-app-expert` + `mobile-review`)
- After GPX downloads, catalog expansions, or Track Memory bakes
- When the user asks to audit / align track corners, layouts, geofences, GPX geometry, or elevation
- On-demand: `/track-data-analyst` or “run track data review”
- On-demand Track Memory: `/track-data-analyst` with “track memory review”

**Skip for:** daily-gate (use structural script only via preflight).

## Policy

1. **Report only** by default — no commits, pushes, or edits unless the user explicitly asks to fix.
2. **Do not bake** (`node scripts/bake-track-memory-layout.mjs --all` or a single track) unless the user explicitly asks to fix.
3. **Turn hands are P0.** A wrong left/right is worse than `complex`. Never set `left`/`right` from GPX bearing clustering alone.
4. **Never infer turn hand from circuit direction.** `anticlockwise` / `clockwise` does **not** mean Turn 1 (or any corner) is left/right. Phillip Island is anticlockwise and Doohan (T1) is a **right**.
5. Source of truth for allowed hands: [`app/src/data/track_turn_verification.json`](app/src/data/track_turn_verification.json). Every `left`/`right` must have a `handSources` entry (`rider` | `official_map` | `authoritative_preview`). Run `node scripts/enforce-turn-verification.mjs --write` then `node scripts/validate-track-data.mjs`.
6. Prefer **official maps / rider confirmation** over KB auto-extract and over GPX. Do not “correct” a rider-locked hand from GPX/KB.
7. Track Memory **hands** still come only from [`app/src/data/tracks.json`](app/src/data/tracks.json) + the verification allowlist. GPX is geometry only — never invents L/R.
8. Hand P0/P1 catalog and bake fixes to **Cursor**.
9. Compare to prior `docs/reviews/TRACK_GPX_ALIGN_*.md`, `TRACK_MEMORY_REVIEW_*.md`, `TRACK_MEMORY_REPAIR_REVIEW_*.md`, and the Track data section of the latest `RR_REVIEW_*.md`.

## Canonical paths

| Asset | Path |
|-------|------|
| Catalog | `app/src/data/tracks.json` |
| Types | `app/src/data/tracks.ts` |
| App geofences | `app/src/data/catalog_track_geofences.json` |
| Source geofences | `C:\australian_motorsport_tracks_1km_geofences.geojson` |
| GPX package (optional) | `C:\Users\Administrator\Desktop\Australian_Track_GPX\` |
| KB | `ST/motorcycle-track-gpt/knowledge-base/track-analysis/` |
| Validator | `scripts/validate-track-data.mjs` |
| Turn-hand allowlist | `app/src/data/track_turn_verification.json` |
| Enforce allowlist | `scripts/enforce-turn-verification.mjs` |
| Track Memory layouts | `app/src/data/trackMemory/*.json` |
| Layout registry | `app/src/trackMemory/layouts.ts` |
| Info maps | `app/src/data/trackInfo/` |
| Compact map builder | `scripts/build-track-info-maps.mjs` |
| Bake mapping (`TRACK_GPX`) | `scripts/bake-track-memory-layout.mjs` |
| Geometry helpers | `scripts/lib/track-geometry.mjs` |
| DEM / enriched GPX | `scripts/track-memory-gpx/` |
| DEM enrich | `scripts/enrich-track-elevation.mjs` |
| Diagnose | `scripts/diagnose-track-memory.mjs` |
| Compact info maps | `node scripts/build-track-info-maps.mjs` (every bake should refresh `app/src/data/trackInfo/maps`) |
| Lap-length probe | `scripts/probe-lap-length.mjs` |

## Venue list rules

- Source of truth for **venues**: non-kart (`Bitumen Motorsport Circuit`) features in the Australian geofence GeoJSON.
- Exclude kart circuits.
- Multi-layout venues use **separate catalog `trackId`s** sharing one geofence centre:
  - **The Bend:** International, GT, East, West (see lengths below)
  - **Sydney Motorsport Park:** Gardner GP, Brabham, Druitt, Amaroo
- **Collingrove Hillclimb** is an intentional extra (not in geofence source) — should appear in catalog + app geofences when added.

### The Bend — official lengths (ground truth)

| Layout | Length | Notes |
|--------|--------|-------|
| GT Circuit | **7.77 km** | Longest AU bitumen layout |
| International Circuit | **4.95 km** | Supercars / Superbikes / national |
| West Circuit | **3.41 km** | Club, sprints, testing |
| East Circuit | **3.93 km** | Drift, training, private days |

Flag as **P0/P1** if catalog `lengthKm` for Bend layouts disagrees with this table, or if GT is stubbed as a short circuit.

### Known GPX naming quirks

Emtron / Desktop GPX may use `Tallem Bend` (typo for Tailem). Map:

- `Tallem_Bend_International.gpx` → `the_bend_international`
- `Tallem_Bend_GT.gpx` → `the_bend_gt`

Mount Panorama / Bathurst is **not in the catalog** (removed from the shipped build). Do not flag its absence as a missing-layout P1.

If GT GPX point density / path length looks like International (~5 km) rather than ~7.77 km, flag **possible wrong source file** — do not trust automated turn counts alone.

## Ready bar — Track Memory layout

A baked layout is ready when all of these hold:

1. **Geometry** — one closed lap, length within ~5% of catalog `lengthKm`, no phantom chicane on the pit straight, `s=0` on the start/finish straight (not automatically the longest straight).
2. **Hands** — left/right only from catalog + `track_turn_verification.json`. GPX never invents L/R.
3. **Elevation** — real hills use GPX `ele` or DEM, with the source recorded on the bake (`elevSource`: `gpx` | `dem` | omitted if flat). DEM must not replace a clean Emtron centreline.
4. **Info map** — compact polyline exists in `app/src/data/trackInfo/maps/<id>.json` with corners on the ribbon; `node scripts/diagnose-track-memory.mjs` reports remaining hand/kink issues as P1s for Cursor. There is no arcade ride.

## Step 1 — Structural gate (always)

From repo root:

```powershell
cd C:\Users\Administrator\.cursor\Send-It
node scripts/validate-track-data.mjs
```

Record PASS/FAIL lines in the weekly report under **Track data**. **P0** if FAIL.

## Step 2 — Catalog vs geofence coverage (weekly)

1. List every `trackId` in `tracks.json` and in `catalog_track_geofences.json`.
2. Fail gaps: catalog without geofence, geofence without catalog.
3. Check multi-layout siblings share the same centre (Bend family, SMP family).
4. Note missing planned layouts (e.g. Bend East/West, SMP Amaroo, Collingrove) as P2 backlog unless product expects them now (then P1).

## Step 3 — Corner QA (weekly / on-demand)

For each catalog track with “complete” corners:

1. No `direction: "straight"` on shapes Hairpin / Sweeper / Double-apex (structural script covers this).
2. No double spaces or unbalanced parentheses in labels.
3. Track-level `direction` is `clockwise` / `anticlockwise` when known — not wrongly flipped vs official maps.
4. Cross-check high-traffic tracks against ST `KB_*.md` + official maps:
   - Phillip Island: circuit **anticlockwise**; Doohan T1 **right**; Southern Loop T2 **left**; Stoner T3 **left**; Miller/Honda T4 **right**. Do not re-lock T1 as left from CCW inference.
   - SMP Gardner: **anticlockwise**.
5. If Desktop GPX exists, optionally re-run bearing analysis — **treat conflicts with official maps / rider locks as P1 findings**, not silent “fixes”. Never write `left`/`right` from bearings.

## Step 4 — Track Memory gate (weekly / on-demand)

Run the tests. **Do not bake.** If catalog `lengthKm` looks wrong, tell Cursor to run `node scripts/probe-lap-length.mjs <gpx>` before re-baking.

### Tests (report, do not bake)

From repo root / `app/`:

| Command | Pass | Fail as |
|---------|------|---------|
| `node scripts/validate-track-data.mjs` | existing catalog gate | **P0** if FAIL |
| `node scripts/diagnose-track-memory.mjs` | 0 empty layouts; list hand misses and kinks | **P0** extra-lap / self-cross; **P1** verified-hand miss or pit-straight kink |
| `cd app && npx tsc --noEmit` | clean | **P0** if Track Memory types break |
| Info maps present | `app/src/data/trackInfo/maps/<id>.json` for every baked layout | **P1** if a bake has no compact map |

### Geometry rules

Encode these as standing checks, not one-off notes. Source of bake mapping: `TRACK_GPX` in [`scripts/bake-track-memory-layout.mjs`](scripts/bake-track-memory-layout.mjs).

- Prefer Desktop Emtron **single-lap** GPX over [`scripts/track-memory-gpx/`](scripts/track-memory-gpx/) when the DEM copy is ~2× catalog length (The Bend DEM was ~10 km / ~15 km).
- Known Emtron names: `Tallem_Bend_International.gpx`, `Tallem_Bend_GT.gpx` (typo), `Mount_Panorama.gpx`. Other Desktop Emtron bakes today: Queensland Raceway, SMP Brabham/Gardner, Wakefield.
- Flag **P0** if baked `lengthM` is >1.22× catalog (uncropped extra lap) or the path self-intersects.
- Flag **P1** if a kink ≥14° sits on the first 12% of the lap (phantom start/finish chicane) or if `s=0` is not on a pit-scale straight when T1’s `approachFrom` says start-finish.
- Bathurst exception: do **not** rotate `s=0` onto Conrod just because it is longest.
- Length should be within ~5% of catalog `lengthKm` once it is a single lap. If catalog looks wrong, probe GPX length first — do not silently re-bake.

### Elevation rules

- Use GPX `ele` when span ≥5 m (Bathurst ~172 m, SMP Gardner/Brabham).
- Use DEM ([`scripts/enrich-track-elevation.mjs`](scripts/enrich-track-elevation.mjs) → `scripts/track-memory-gpx/`) only when Emtron altitude is zero/noise **and** the centreline is already a single lap. Do not DEM-enrich a double-lap trace.
- Skip DEM for Queensland Raceway (noise / effectively flat) — already marked in the bake mapping (`Queensland_Raceway.gpx` on Desktop Emtron).
- Bend International/GT are currently **flat Emtron** after the chicane fix; flag as **P2** “re-sample DEM Z onto Emtron XY” rather than switching back to the DEM path.

### Copy-forward diagnose misses

Until Cursor clears them, copy these verified-hand / baked-station mismatches forward as **P1** (tracks still run):

- Broadford T12
- Mac Park T2 / T12
- Queensland Raceway T5
- SMP Gardner T7
- The Bend International T18
- Wakefield T9

Do not treat a matching list as a regression. Drop a row only when diagnose no longer reports it.

## Step 5 — Write findings

### Weekly (with rr-app-expert)

Add a **Track data** section to `docs/reviews/RR_REVIEW_YYYY-MM-DD.md`, including a **Track Memory** subsection (gate table + P0/P1 list + which GPX source each layout used):

```markdown
## Track data
- Validator: PASS/FAIL
- Catalog tracks: N | Geofences: N
- [P0/P1/P2] findings...
- Layout backlog: (missing Bend West/East, SMP Amaroo, Collingrove, …)

### Track Memory
- diagnose-track-memory: PASS/FAIL (empty layouts / extra-lap / kinks / hand misses)
- track-info maps: PASS/FAIL (one compact JSON per baked layout)
- tsc: PASS/FAIL
- GPX source per layout: Emtron Desktop vs scripts/track-memory-gpx (DEM)
- [P0/P1/P2] geometry / elevation / boards
```

### Standalone / deep GPX audit

Also write `docs/reviews/TRACK_DATA_REVIEW_YYYY-MM-DD.md` (or update `TRACK_GPX_ALIGN_*.md` if that was the ask).

### On-demand Track Memory review

When the user asks for a track memory review, write `docs/reviews/TRACK_MEMORY_REVIEW_YYYY-MM-DD.md` (gate table + P0/P1 list + GPX source per layout).

## Limits

- No Expo Go / device GPS overlay testing.
- No inventing coaching tip text for corners.
- Report only unless the user explicitly requests edits.
- Do **not** run `node scripts/bake-track-memory-layout.mjs` (single or `--all`) unless the user explicitly asks to fix.

## Handoff

1. Validator exit status
2. Track Memory diagnose + compact info maps + tsc results
3. P0/P1 track-data counts (catalog + Track Memory)
4. Top 3 Cursor catalog / bake fixes
5. Re-verify: `node scripts/validate-track-data.mjs`, `node scripts/diagnose-track-memory.mjs`, `node scripts/build-track-info-maps.mjs`
