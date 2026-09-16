---
name: track-details-bake
description: Rebuild Track Details from repo GPX (ribbon, numbered corners, optional racing line) and prove both app trees. Use when baking tracks, adding GPX, fixing Track Memory, racing lines, turn hands, or prove-track-maps failures. Never set left/right from GPX.
---

# Track Details bake (implementer)

Cursor implementer for Track Details. Hermes `track-data-analyst` is report-only — do not become a second analyst.

Policy source: `docs/hermes/skills/send-it/track-data-analyst/SKILL.md` and `AGENTS.md`.

## When to use

- User asks to bake, rebuild Track Details, add a GPX, fix a racing line, or close a track P0
- `prove-track-maps.mjs` / `validate-track-data.mjs` fails
- Catalog or `track_turn_verification.json` edits

## Hands are P0

- Source of allowed hands: `app/src/data/track_turn_verification.json` (mirror in `android-app/`)
- Every `left`/`right` needs `handSources`: `rider` | `official_map` | `authoritative_preview`
- Circuit direction ≠ corner hand (Phillip Island anticlockwise; Doohan / T1 is a **right**)
- GPX, the detector, and clockwise/anticlockwise **never** set L/R
- Do not override a rider-locked hand from GPX or KB
- Stop and ask before changing a verified hand

After catalog hand edits:

```powershell
node scripts/enforce-turn-verification.mjs --write
```

Then copy `app/src/data/tracks.json` (and the verification JSON if changed) to `android-app/src/data/`. Then `node scripts/validate-track-data.mjs`.

## Bake order

Every shipped layout needs:

1. GPX in `scripts/track-memory-gpx/`
2. Polyline ribbon in `app/src/data/gpxTrackMaps/` (and android-app)
3. Numbered turns in `app/src/data/trackDetailsCorners/` (and android-app)
4. Racing line in `app/src/data/racingLines/` when solved (and android-app)

```powershell
node scripts/build-track-details.mjs
node scripts/build-track-details.mjs <track-id>
node scripts/build-track-details.mjs <track-id> --with-lines
```

`--with-lines` runs `python scripts/build-racing-lines.py` (~1–2 min per layout; full catalog ~30 min). Prefer named ids. Do not start a full-catalog line solve unless the user asked.

The line is an overlay. It never edits GPX. `TrackFacilityMap` strokes in **map units** (asphalt half-width 0.6), not device pixels. No modelled lap time.

## Gates (required before claiming done)

```powershell
node scripts/validate-track-data.mjs
node scripts/prove-track-maps.mjs
node scripts/diagnose-track-memory.mjs
```

`prove-track-maps.mjs` fails self-intersect, open line, off-asphalt, or **app ≠ android-app** corner JSON. A missing line is a warning.

## Do not

- Restore board PNGs, `boardMaps.ts`, or `mapProof.json`
- Ship detector PNGs from `tests/`
- Bake because a Hermes report exists — bake when the user asked or a P0 requires it
- Commit unless the user asked

For isolated long bakes, delegate to the `track-baker` subagent.
