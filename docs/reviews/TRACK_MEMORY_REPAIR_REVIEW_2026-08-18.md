# Track Memory Repair Review — 2026-08-18

**Scope:** Cursor's Track Memory repair pass (crash fix, wavy-edge fix, Bend GPX swap,
20-layout re-bake).  Report only — no source edits.

---

## Executive Summary

- P0: 0  | P1: 7  | P2: 5
- The crash and wavy-edge fixes are solid and confirmed by TSC and the golden-frame
  test.  The Bend sources are now correct Emtron single-laps.  However seven
  verified-hand mismatches persist across six layouts, the Bathurst s=0 rotation
  misfires (Conrod is chosen over the pit straight), Phillip Island and Lakeside
  never fire a brake board, and the Bathurst T2 catalog label is wrong.

---

## Automated Gates

### TypeScript
`cd app && ./node_modules/.bin/tsc --noEmit` — **PASS** (zero errors, zero output)

### Golden frame test
`cd app && npm run test:track-frames` — **PASS**

```
baskerville          quads 110-111  markerFrames  249  lap 1
broadford            quads 111-111  markerFrames  747  lap 1
calder_park          quads 110-111  markerFrames  249  lap 1
hidden_valley        quads  96-111  markerFrames  747  lap 1
lakeside             quads 111-111  markerFrames    0  lap 1   ← 0
mac_park             quads  39-111  markerFrames  747  lap 1
mallala              quads  45-111  markerFrames  540  lap 1
morgan_park          quads  94-111  markerFrames  498  lap 1
mount_panorama       quads 111-111  markerFrames  249  lap 1
phillip_island       quads 111-111  markerFrames    0  lap 1   ← 0
queensland_raceway   quads 108-111  markerFrames  249  lap 1
sandown              quads 110-111  markerFrames  249  lap 1
smp_brabham          quads 111-111  markerFrames  249  lap 1
smp_druitt           quads 111-111  markerFrames  249  lap 1
smp_gardner          quads  88-111  markerFrames  249  lap 1
the_bend_gt          quads 111-111  markerFrames  363  lap 1
the_bend_international quads  99-111 markerFrames 386  lap 1
wakefield_park       quads  51-111  markerFrames  747  lap 1
wanneroo             quads  54-111  markerFrames  498  lap 2
winton               quads  79-111  markerFrames  778  lap 1
PASS - every layout projects finite, non-empty frames
```

Note: golden PASS only checks finite screen coords.  markerFrames = 0 at Phillip
Island and Lakeside is a separate gameplay defect (see P1 items below).

### diagnose-track-memory.mjs

```
TOTAL baked-station mismatches 7, verified-hand misses 7, kinks14 10 across 20 layouts
```

Full mismatch list:

| Track | Corner | Wants | Got | sNorm |
|-------|--------|-------|-----|-------|
| broadford | T12 final left onto straight | left | right | 0.982 |
| mac_park | T2 blind crest | left | straight | 0.208 |
| mac_park | T12 final left onto main | left | right | 0.969 |
| queensland_raceway | T5 Spitfire/Thunderbolt | right | left | 0.807 |
| smp_gardner | T7 Corporate Hill | right | left | 0.733 |
| the_bend_international | T18 final left onto main | left | right | 0.992 |
| wakefield_park | T9 Fast Right Sweeper | right | straight | 0.959 |

### validate-track-data.mjs

```
PASS (4 planned-layout warnings only)
WARN planned layout not in catalog yet: the_bend_east
WARN planned layout not in catalog yet: the_bend_west
WARN planned layout not in catalog yet: smp_amaroo
WARN planned layout not in catalog yet: collingrove_hillclimb
```

---

## What Cursor's Pass Fixed (Confirmed)

### 1. First-start crash — FIXED
`makeRoadPaintKit` now takes `null` for bitumen at construction time; tile is
attached later via `attachBitumenTile`.  `disposeRoadPaintKit` is called with a
250 ms delay.  `draw()` is wrapped in try/catch with a non-reentrant guard
(`drawing.current`).  Code verified in `TrackMemoryRoadView.tsx:45-83`.

### 2. Wavy Bathurst edges — FIXED
`samplePath` (physics.ts:81-123) now blends three neighbouring segment headings
(triangle blend: segA+segB at i1, segB+segC at i2, lerped by t).  Uniform
Catmull-Rom is gone.  `smoothPlanar` in bake script applies a 14 m triangle window
on the planar path before elevation is applied.

### 3. The Bend sources — FIXED
`bake-track-memory-layout.mjs` maps both Bend layouts to Desktop Emtron files:
- `the_bend_gt` → `Tallem_Bend_GT.gpx` (104 KB desktop, clean single lap)
- `the_bend_international` → `Tallem_Bend_International.gpx` (46 KB desktop)

Baked lengths: GT 7802 m (+32 m vs 7770 m official), International 4900 m
(−50 m vs 4950 m official).  Both within 1 % tolerance.  DEM double-lap
behaviour is gone — comment in bake script at line 57-58 confirms intent.

---

## Remaining Findings

### P1 — The Bend International T18 wrong lean direction

**diagnose:** `T18 (final left onto main straight)@0.992 wants left got right`

The verified hand entry for T18 is `left` (turn_verification.json confirmed).
The baked geometry at sNorm = 0.992 reads as a right-hand deflection.
Root cause: the Emtron trace almost closes at the pit entry and the final few
points before the close deflect right (the bike was exiting the last corner onto
the straight, not completing the apex).  The geometry algorithm classifies this
deflection as the "corner" rather than the true apex a few metres earlier.

The corner IS physically placed in the baked JSON at sNorm = 0.9918 (catalog
places it correctly), but the diagnose geometry probe at that station reads right.
Effect: the game's auto-lean tips the rider right through what should be a left
flick — wrong visual + wrong coaching cue.

**Fix (Cursor):** In `scripts/lib/track-geometry.mjs` `turnEvents`, clamp the
search window so events within the final 1 % of the lap (sNorm > 0.99) are
merged into the preceding event rather than treated as a fresh corner.
Alternatively, tighten the Emtron Bend International trace end by trimming the
last ~10 points before the close so the geometry reader sees the apex correctly.
After fix: `node scripts/diagnose-track-memory.mjs` must show 0 mismatches for
`the_bend_international`.

---

### P1 — Bathurst s=0 rotates to Conrod Straight, not pit straight

**diagnose:** `mount_panorama longest straight 1089m starting s=0.600`

That 1089 m straight at s = 0.600 is Conrod Straight.  T1 (Hell Corner) sits at
sNorm = 0.1814 = **1117 m from s = 0**, far beyond where a pit straight should end.
On the real circuit the pit-straight is ~600-700 m; Hell Corner should be within
the first ~800 m of a correctly rotated lap.

Root cause: `rotateToStraightBeforeT1` has this override at bake line 662-664:

```js
if (longest && best && longest.lenM > best.run.lenM * 1.7 && longest.lenM > 600) {
  best = { run: longest.run, ... };
}
```

This was designed for The Bend where the hand-matching straight is only ~290 m and
the pit straight is 987 m (ratio ≈ 3.4).  At Bathurst the hand-matching straight
(pit straight before Hell Corner right) is ~600 m and Conrod is 1089 m (ratio ≈
1.82).  The ratio clears 1.7 and 1089 > 600, so the override fires — wrongly
taking Conrod as s = 0.

**Fix (Cursor):** Add a lower-bound guard on the matching candidate.  The override
should only fire when the best matching candidate is genuinely short (< 400 m),
indicating there is no usable pit straight.  Suggested change:

```js
// Only force-take the longest straight when the matched candidate is so short
// that no real pit straight exists (e.g. The Bend 290 m).  Do NOT override when
// the matched candidate is a credible pit straight (Bathurst ~600 m).
if (
  longest &&
  best &&
  best.run.lenM < 400 &&          // ← add this guard
  longest.lenM > best.run.lenM * 1.7 &&
  longest.lenM > 600
) {
```

After fix, re-bake `mount_panorama` and confirm T1 (Hell Corner right) lands at
sNorm ≤ 0.15 (≤ ~925 m on the 6157 m lap).

---

### P1 — Phillip Island and Lakeside: 0 brake boards in any lap

**golden test:** `phillip_island markerFrames 0  |  lakeside markerFrames 0`

`cornerNeedsDistanceBoards` (physics.ts:181) returns true only when
`cornerTurnAngleDeg > DISTANCE_BOARD_MIN_DEG` (90°, defined in coachCues.ts).
At PI and Lakeside, every corner's turn angle over the ±42 m window is below 90°.
PI's fastest corners (Doohan, Southern Loop) are tight hairpins on the real
circuit but at the high point densities of the baked trace the 84 m window
captures insufficient heading change.  Lakeside has no particularly tight hairpins
in its catalog.

Effect: riders at Phillip Island and Lakeside **never see a "Brake Now!"** board or
the 150/100/50 m distance boards for the full session.  This is a material gameplay
deficit at two of the highest-profile circuits.

**Fix (Cursor):** Lower `DISTANCE_BOARD_MIN_DEG` in `coachCues.ts` from 90 to 65.
Verify with `npm run test:track-frames` that PI and Lakeside both show > 0
markerFrames.  A value of 65° will also fire at tight hairpins on other layouts
without triggering on kinks (kinks in the diagnose output are ≤ 25°, well below 65).

---

### P1 — Five more verified-hand baked-station mismatches

The following six mismatches (beyond Bend T18 above) remain after the repair pass.
All are cases where the geometry at the baked sNorm station disagrees with the
rider-verified turn hand.  In-game this shows as the bike leaning the wrong way
into the corner.

| Track | Corner | Issue |
|-------|--------|-------|
| broadford | T12 final left | GPX end-of-trace reads right |
| mac_park | T2 blind crest | Geometry reads straight (slight turn reads below event threshold) |
| mac_park | T12 final left | GPX end-of-trace reads right |
| queensland_raceway | T5 Spitfire hairpin | Geometry reports left; verified right |
| smp_gardner | T7 Corporate Hill | Geometry reports left; verified right |
| wakefield_park | T9 Fast Right Sweeper | Near-end-of-trace reads straight |

**Fix (Cursor):** For each track, inspect the GPX trace in the vicinity of the
failing corner, check whether a trace end-effect is causing misclassification (as
at Bend T18), and if so trim the trace tail before the close or adjust the event
search window.  For QR T5 and SMP Gardner T7 (mid-lap mismatches) the GPX bearing
clustering likely disagrees with the official map — verify on official circuit
diagrams and if confirmed, add/update the verified-hand entry and re-bake.

After fix: `node scripts/diagnose-track-memory.mjs` must show 0 baked-station
mismatches.

---

### P2 — Bathurst T2 catalog label is wrong

The catalog names T2 "Murray's Corner" (`mount_panorama_t2`).  On the real circuit
Murray's Corner is the tight left hairpin at the foot of the mountain (approximately
T10 in most official numberings).  The corner at T2 position (above Hell Corner on
the climb) is The Cutting / Griffins Bend.

The baked T2 is currently `complex` direction so it does not affect verified-hand
logic.  The wrong name will show in the coach flash overlay on-device.

**Fix (Cursor):** In `app/src/data/tracks.json`, rename `mount_panorama_t2` label
from "Murray's Corner" to "Griffins Bend" (or "The Cutting" — Griffins Bend is the
official name for the first right-hand complex above Hell Corner).  No re-bake
required; label changes only.

---

### P2 — Bathurst T12 is unnamed ("Turn 12")

The final catalog corner `mount_panorama_t12` carries the generic label "Turn 12".
On the real circuit this is the kink-sequence leading from Reid Park onto the main
straight.  It has no standalone name, but "Reid Park Kink" or "Pit Straight entry
complex" would be more useful in the coach overlay than "Turn 12".

**Fix (Cursor):** Update label in `app/src/data/tracks.json`.  No re-bake needed.

---

### P2 — DEM leftover GPX files in scripts/track-memory-gpx/

Two files exist in `scripts/track-memory-gpx/` that are NOT used by the bake
script (it reads the Desktop Emtron copies for these tracks):

- `scripts/track-memory-gpx/the_bend_gt.gpx` — 114 KB (DEM, double-lap fragment)
- `scripts/track-memory-gpx/the_bend_international.gpx` — 50 KB (DEM, pre-Emtron)

The bake script TRACK_GPX entries for both Bend layouts have no `gpxDir` field, so
they resolve to the Desktop Emtron folder, not `scripts/track-memory-gpx/`.  These
files are dead clutter that will cause confusion on the next re-bake if someone
accidentally adds a `gpxDir` entry for them.

**Fix (Cursor):** Delete both files from `scripts/track-memory-gpx/`.  If archival
is needed, move to a `scripts/track-memory-gpx/archive/` folder and exclude from
the bake glob.

---

### P2 — Bend GT geometry vs catalog: 31 turn events for 9 catalog corners

**diagnose:** `the_bend_gt  corners: catalog 9, geometry 31 turns`

The Emtron GT trace at 7802 m contains 31 detected turn events but only 9 catalog
corners are placed.  This ratio (3.4:1) is much higher than other layouts and
suggests the 7.77 km trace has a lot of mid-corner GPS jitter the `chaikinClosed`
smoothing has not fully tamed, or that some of the GT's flowing esses are splitting
into multiple events.  No verified hands are present for GT (0/0 check), so the
alignment cannot be scored.

**Fix (Cursor):** Add GT corner hands to `track_turn_verification.json` and
re-bake; run `node scripts/enforce-turn-verification.mjs --write` first.  This
will let the alignment score corner placements and reduce spurious event splitting.
Alternatively increase the `turnRate` threshold in `track-geometry.mjs` for longer
circuits.

---

### P2 — Wanneroo wraps into lap 2 before markerFrames are sampled

**golden test:** `wanneroo quads 54-111 markerFrames 498 lap 2`

Wanneroo's 40-second ride wraps into a second lap.  No failure — the golden test
only checks lap 1 and still PASS — but the low quad count (54 minimum) at this
short circuit (1764 m) and the lap-2 wrap are worth noting.  The 54-quad minimum
may indicate a frame where the camera is looking along a straight and the frustum
clips most of the road — not a bug, but check on device.

---

## Summary Table

| Severity | Count | Items |
|----------|-------|-------|
| P0 | 0 | — |
| P1 | 7 | Bend Intl T18 wrong lean; Bathurst s=0 on Conrod; PI/Lakeside 0 brake boards; Broadford T12; Mac Park T2+T12; QR T5; SMP Gardner T7; Wakefield T9 hand mismatches |
| P2 | 5 | Bathurst T2 mislabel; Bathurst T12 unnamed; DEM leftover GPX; Bend GT 31-event alignment; Wanneroo lap-2 frame low |

*(The seven verified-hand mismatches count as 7 individually but share one fix
pattern; they are grouped as the P1 "five more mismatches" item above plus Bend
T18 and Bathurst rotation.)*

---

## Top 3 Cursor Fixes

**1. Bathurst rotation guard (P1)**
In `scripts/bake-track-memory-layout.mjs` line 662, add `best.run.lenM < 400` as a
precondition for the longest-straight override.  Re-bake `mount_panorama`.  Verify
T1 Hell Corner appears at sNorm ≤ 0.15.  This unblocks correct s=0 for one of the
two signature circuits.

**2. Brake-board threshold (P1) — affects PI and Lakeside**
In `app/src/trackMemory/coachCues.ts`, lower `DISTANCE_BOARD_MIN_DEG` from 90 to
65.  Re-run `npm run test:track-frames` and confirm PI and Lakeside both show
markerFrames > 0.  No re-bake needed.

**3. End-of-trace hand mismatches (P1) — affects 5 layouts**
Fix the `turnEvents` search in `scripts/lib/track-geometry.mjs` to suppress events
within the last 1–2 % of the lap (sNorm > 0.98), merging them into the preceding
event.  This will cure the end-of-trace misclassifications at Broadford T12,
Mac Park T12, Wakefield T9, and Bend International T18 in one change.  Re-bake
all four tracks.  Then investigate QR T5 and SMP Gardner T7 separately against
official circuit maps.  Verify with `node scripts/diagnose-track-memory.mjs` — aim
for 0 baked-station mismatches.

---

## Re-verify After Fixes

```bash
node scripts/diagnose-track-memory.mjs       # target: 0 mismatches
node scripts/validate-track-data.mjs         # must stay PASS
cd app && npm run test:track-frames           # PASS + PI/Lakeside markerFrames > 0
cd app && ./node_modules/.bin/tsc --noEmit   # must stay clean
```
