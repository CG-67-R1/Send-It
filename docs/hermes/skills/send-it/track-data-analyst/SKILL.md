---
name: track-data-analyst
description: "Send-It track catalog / GPX / corner-data analyst. Structural validation + layout QA for weekly reviews. Report only unless user asks to fix."
version: 1.0.0
author: Send-It / Hermes setup
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [tracks, gpx, geofence, track-walk, qa, send-it, roadrace]
    related_skills: [send-it/rr-app-expert, send-it/mobile-review]
---

# Send-It Track Data Analyst

Standing **track catalog analyst** for RoadRace Track Walk data. You validate `tracks.json`, geofences, and optional GPX centrelines; you **report findings** for Cursor to fix unless the user explicitly asks you to edit.

**Parent skill:** `send-it/rr-app-expert` — load this skill on **weekly-review** and on-demand track QA.

## When to use

- Weekly review (with `rr-app-expert` + `mobile-review`)
- After GPX downloads or catalog expansions
- When the user asks to audit / align track corners, layouts, or geofences
- On-demand: `/track-data-analyst` or “run track data review”

**Skip for:** daily-gate (use structural script only via preflight).

## Policy

1. **Report only** by default — no commits, pushes, or edits unless the user explicitly asks to fix.
2. Prefer **official layout lengths / turn hands** over automated bearing guesses when they conflict.
3. Hand P0/P1 catalog fixes to **Cursor**.
4. Compare to prior `docs/reviews/TRACK_GPX_ALIGN_*.md` and the Track data section of the latest `RR_REVIEW_*.md`.

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

If GT GPX point density / path length looks like International (~5 km) rather than ~7.77 km, flag **possible wrong source file** — do not trust automated turn counts alone.

## Step 1 — Structural gate (always)

From repo root:

```powershell
cd C:\Users\Administrator\.cursor\Send-It
node scripts/validate-track-data.mjs
```

Record PASS/FAIL lines in the weekly report under **Track data**.

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
   - Phillip Island: anticlockwise; Doohan **left**; Southern Loop **left**; MG Hairpin **right** (common map convention — flag Hermes/GPX bearing errors that invert these).
   - SMP Gardner: **anticlockwise**.
5. If Desktop GPX exists, optionally re-run bearing analysis — **treat conflicts with official maps as P1 findings**, not silent “fixes”.

## Step 4 — Write findings

### Weekly (with rr-app-expert)

Add a **Track data** section to `docs/reviews/RR_REVIEW_YYYY-MM-DD.md`:

```markdown
## Track data
- Validator: PASS/FAIL
- Catalog tracks: N | Geofences: N
- [P0/P1/P2] findings...
- Layout backlog: (missing Bend West/East, SMP Amaroo, Collingrove, …)
```

### Standalone / deep GPX audit

Also write `docs/reviews/TRACK_DATA_REVIEW_YYYY-MM-DD.md` (or update `TRACK_GPX_ALIGN_*.md` if that was the ask).

## Limits

- No Expo Go / device GPS overlay testing.
- No inventing coaching tip text for corners.
- Report only unless the user explicitly requests edits.

## Handoff

1. Validator exit status
2. P0/P1 track-data counts
3. Top 3 Cursor catalog fixes
4. Re-verify: `node scripts/validate-track-data.mjs`
