# GPX Corner Detector: 95% Accuracy Handoff

**LOCKED 2026-09-08.** Do not change `scripts/lib/gpx-corner-detector.mjs`, `scripts/lib/gpx-trace-review.mjs`, or the rider profile unless the user explicitly unlocks the tool. See `scripts/lib/GPX_CORNER_DETECTOR.lock`.

GPX review (multiple laps, start/finish stubs, seam defects) now runs inside the detector before corners are numbered. Mallala's centreline was rebuilt from the 2010 Wikimedia SVG; the previous GeoJSON GPX was the wrong shape.

## Objective

Raise GPX corner-count agreement with confirmed catalog counts to 95% while keeping the detector autonomous (no dependency on confirmed counts at runtime).

Harness set: 19 AU track GPX files.

**Read the Evidence section before proposing a solution.** Three plausible approaches have now been measured and ruled out. Re-deriving them wastes effort.

## Non-Negotiable Constraints

- Testing tool only. Do not integrate into app runtime UI.
- Fail-fast gate behaviour must remain intact.
- Detector must run without confirmed corner counts.
- Confirmed catalog counts are for evaluation only.
- No track-specific logic keyed by track ID.

## Repository Scope

Detector core:

- `scripts/lib/gpx-corner-detector.mjs` (accepts `includeGeometry: true` to expose the curvature array and event ranges for diagnostics)

Harness and diagnostics:

- `scripts/detect-gpx-corners.mjs` — single file run
- `scripts/gate-gpx-corner-detector.mjs` — batch fail-fast gates
- `scripts/compare-gpx-corners-to-catalog.mjs` — accuracy scoring
- `scripts/calibrate-gpx-corner-profile.mjs` — profile grid search
- `scripts/calibrate-gpx-start-finish.mjs` — derives numbering offsets from curated hands
- `scripts/probe-gpx-corner-plateaus.mjs` — curvature-plateau separation probe

Inputs:

- GPX: `scripts/track-memory-gpx/*.gpx`
- Confirmed counts: `app/src/data/tracks.json`
- Curated turn hands: `app/src/data/track_turn_verification.json`
- Numbering offsets (testing-only, generated): `scripts/data/gpx-start-finish-alignment.json`

## Reproduction Commands

```powershell
# accuracy scoring
node scripts/compare-gpx-corners-to-catalog.mjs --out-dir tests/gpx-corner-detector

# strict gates, expected lengths supplied from catalog
node scripts/gate-gpx-corner-detector.mjs --use-catalog-lengths --catalog app/src/data/tracks.json --max-files 19

# strict gates, fully autonomous
node scripts/gate-gpx-corner-detector.mjs --max-files 19

# plateau separation probe
node scripts/probe-gpx-corner-plateaus.mjs --ratio 2.0 --verbose
```

## Current State

Autonomous (count discovered from the trace alone):

- Exact matches: **12/19**
- Total absolute error: **11**
- Worst absolute error: **3**
- Catalog-length gate mode: passes all 19
- Strict autonomous mode: fails `smp_druitt` on lap-isolation ambiguity

Constrained and aligned (count and numbering offset supplied, see Solutions A and B):

- Exact matches: **19/19**, absolute error **0**, achieved with 11 splits and 0 merges
- Verified turn hands: **53/62 (85%)**, up from 41/62 (66%) before alignment

The autonomous figures above are the ones to improve. Constrained counts agree by construction and say nothing about detection quality; the verified-hand figure is the meaningful score.

All residual error is **under-detection**. The signed error sum equals the absolute sum, so the detector no longer invents corners anywhere in the set.

| track | confirmed | detected | delta |
|---|---:|---:|---:|
| the_bend_gt | 35 | 32 | −3 |
| baskerville | 10 | 8 | −2 |
| broadford | 12 | 10 | −2 |
| hidden_valley | 14 | 13 | −1 |
| lakeside | 9 | 8 | −1 |
| mac_park | 12 | 11 | −1 |
| wanneroo | 7 | 6 | −1 |

## Evidence: Three Approaches Measured And Ruled Out

### 1. Multi-scale (scale-space) curvature — ruled out

Corner counts were measured at five curvature scales (`turnWindowM` = 6, 8, 12, 18, 26).

- The 12 correct tracks are scale-invariant. Six are identical at every scale; none move by more than one.
- The under-counted tracks gain nothing at fine scale. `the_bend_gt` is 32 at every scale from 6 to 18. `broadford` is 10, `mac_park` 11, `lakeside` 8. `baskerville` gets *worse* at fine scale (8 → 6).

Conclusion: the missing corners are not hiding at a finer smoothing scale. Scale-space stability is a good *false-split veto* but has no recovery power.

Side finding: `morgan_park`, `phillip_island` and `winton` all show the signature 14, 14, 12, 13, 14 — they are only correct because σ=12 is a sweet spot. Three of the twelve wins are scale-fragile.

### 2. Curvature-plateau / radius-step splitting — ruled out

Rationale tested: two arcs of different radius joined with no straightening produce a curvature *step* with no dip, so peak-finding is structurally blind to them. A two-plateau model was fitted inside every detected event (`scripts/probe-gpx-corner-plateaus.mjs`).

Radius steps are ubiquitous, because a single corner naturally tightens or opens through its own arc:

| radius ratio threshold | corners recoverable (need 11) | false splits on the 12 correct tracks |
|---:|---:|---:|
| 1.50 | 11 | 72 |
| 2.00 | 11 | 40 |
| 2.50 | 8 | 24 |
| 3.00 | 6 | 16 |

No threshold separates the populations. Worse, the *correct* tracks carry stronger steps than the under-counted ones:

- `queensland_raceway` (6 corners, exact under every configuration tested) contains a 57 m → 332 m step, ratio 5.80, 63% variance gain. Splitting it would be wrong.
- `broadford` (needs two more corners) offers ratio 3.52 and 2.21 candidates — weaker than the ones that must not be split.

Conclusion: "must split" and "must not split" are statistically indistinguishable in the curvature profile.

### 3. Detection-sensitivity tuning — ruled out as a route to 95%

108 configurations were swept over `rateFloorDegPerM`, `minSweptDeg`, `minHeadingDeg` and `minCornerLengthM`. Tracks partition into three groups:

- **Always exact (108/108 configs):** `mallala`, `queensland_raceway`, `smp_brabham`, `smp_druitt`, `the_bend_international`, `winton`
- **Threshold-recoverable:** `phillip_island` (105/108), `sandown` (99), `smp_gardner` (84), `calder_park` (81), `morgan_park` (48), `wakefield_park` (45), `mac_park` (18), `hidden_valley` (18)
- **Never exact under any configuration:** `baskerville`, `broadford`, `lakeside`, `the_bend_gt`, `wanneroo`

Best single configuration observed: 13/19 exact, absolute error 10.

**Geometry-only ceiling is therefore about 14/19 (74%).** 18/19 is not reachable by tuning or by any curvature-based segmentation rule tried so far.

## Diagnosis

Official corner numbering is **partly conventional, not purely geometric**. Where one circuit counts a long radius-changing sweep as one corner, another counts equivalent geometry as two. The distinguishing information is not present in the GPX trace, which is why every geometric discriminator lands on the same residual.

This repo already accepts the same principle elsewhere: turn direction is treated as P0 and is sourced from `app/src/data/track_turn_verification.json`, with the standing rule that *GPX alone must never set turn direction*. Corner count appears to belong in the same category.

Secondary, separate issue: `wanneroo` is a **data defect, not an algorithm failure**. The catalog says 2.41 km; the trace resamples to 1768 m, a 27% shortfall, so the GPX is a different (shorter) layout than the 7-corner catalog entry. It is already listed in `TRACK_DETAILS_EXCLUSIONS`. Excluding it, the honest denominator is 18 and 95% means 17/18.

## Candidate Solution Directions

Ordered by expected value given the evidence above.

### A. Constrained placement against a known corner count — IMPLEMENTED

The detector no longer has to *discover* N when N is known elsewhere; it *places* N. Pass `targetCornerCount` and a `constrain_corner_count` gate moves the event count onto the target, splitting where the plateau ranking has the strongest support and merging only same-hand neighbours.

This is exactly the same doctrine the repo already applies to turn hands: geometry decides *where*, curated data decides *what*.

```powershell
# whole catalog, counts supplied as targets
node scripts/compare-gpx-corners-to-catalog.mjs --constrain-to-catalog --out-dir tests/gpx-corner-detector-constrained

# single layout
node scripts/detect-gpx-corners.mjs --gpx scripts/track-memory-gpx/baskerville.gpx --length-km 2.01 --target-corners 10
```

Measured result: **19/19, absolute error 0**, from 11 splits and 0 merges.

Properties worth preserving:

- **Autonomous path is untouched.** Without `targetCornerCount` the gate does not run and output is unchanged at 12/19.
- **No-op where already correct.** All 12 previously-correct layouts took 0 splits and 0 merges. The constraint only intervenes on the 7 that were short.
- **Turn hands are never invented.** Splits inherit the parent event's hand and merges are restricted to same-hand neighbours, so an unreachable target fails the gate rather than fabricating a direction.
- **Auditable.** `cornerDetection.countSource` is `autonomous` or `constrained_to_target`, and `countConstraint.actions` records every split with its radii, radius ratio and variance gain.
- **Fail-fast intact.** An unreachable target fails `constrain_corner_count` with the stall count and full gate report.

Placement of the 11 constrained splits looks geometrically sound — each lands on a genuine radius change (for example The Bend GT: 62 m → 152 m at ratio 2.43, 144 m → 57 m at 2.52, 39 m → 110 m at 2.85, variance gains 38–49%) and no resulting corner falls below the profile minima.

Remaining caveat: count agreement is now true by construction, so it is no longer a measure of detector quality. Judging this properly needs placement ground truth — see C.

### B. Numbering alignment — IMPLEMENTED, and it was the dominant error

Corner *count* was masking a worse fault. Measured against curated `verifiedHands`, the numbered hands agreed only **41/62 (66%)** — but rotating the sequence by a single corner lifted several layouts to perfect. Mac Park went 4/10 to **10/10** on a shift of −1, Broadford 1/4 to **4/4**.

Cause: no GPX in the catalog carries a start/finish waypoint, so all 19 layouts fall back to `longest_straight`, which is not always the main straight. Corners were being found in the right places and given the wrong numbers.

```powershell
# derive offsets from curated hands, then apply and verify
node scripts/calibrate-gpx-start-finish.mjs
node scripts/compare-gpx-corners-to-catalog.mjs --constrain-to-catalog --align --verify-hands --out-dir tests/gpx-corner-detector-aligned
```

Result: **53/62 (85%)** verified hands, with 19/19 counts.

Design notes:

- Offsets live in `scripts/data/gpx-start-finish-alignment.json`, outside `app/`, so nothing reaches the app.
- A `verify_turn_hands` gate fails when a rotation explains materially more of the curated hands, which is how a misaligned layout announces itself instead of shipping wrong numbers.
- The gate and the calibrator share one criterion (`MISALIGNED_NUMBERING_GAIN_SHARE`, `MIN_VERIFIED_HANDS_FOR_ALIGNMENT`, both exported from the detector) so they can never disagree about a layout.
- Where the aligned Turn 1 runs straight out of the preceding corner there is nowhere to put a start/finish line, so numbering rotates and `startFinish.startMoved: false` records that distances still measure from the inferred start.

**Aliasing is the trap here.** Hand sequences repeat. Phillip Island's opening right-left-left-right recurs exactly four corners later, so a shift of 4 scores a perfect 6/6 purely by coincidence — its sequence has genuine hand errors that no rotation fixes. The offset is therefore required to explain a *share* (40%) more of the evidence, not merely a couple more corners. Phillip Island, Wakefield Park and Mallala are reported for human review rather than aligned automatically.

Biggest remaining limitation: **9 of 19 layouts have no verified hands at all**, so their alignment is simply unknown. Extending `verifiedHands` coverage is now the highest-value data work.

### C. Redefine the success metric

Exact count matching is a brittle proxy for usefulness. A coaching tool needs corners in the right *places* with the right numbers, and ±1 on a 35-corner circuit is immaterial next to labelling Turn 5 as Turn 4. Verified-hand agreement is a better proxy and is now measured; per-corner apex ground truth would be better still.

### C. Curate per-corner ground truth, then learn the convention

The four genuinely unreachable circuits (`baskerville`, `broadford`, `lakeside`, `the_bend_gt`) need labels mapping each official corner number to a position on the trace. About 250 labels across the 19 layouts. This is the only route that can *learn* the numbering convention rather than guess it, and it converts the problem from unsupervised segmentation into supervised sequence labelling.

### D. Marginal tuning win — measured, deliberately NOT applied

Setting `minHeadingDeg: 7` and `minCornerLengthM: 5` yields **13/19 exact, absolute error 10**, fixes `hidden_valley`, regresses nothing, and passes strict gates with catalog lengths.

Rejected for now: these thresholds are fitted to the 19-track evaluation set and are permissive enough (a 7° minimum heading change) to risk admitting noise on unseen layouts. Recorded so it is not rediscovered and mistaken for a solution.

### E. Autonomous lap isolation (separate defect)

`smp_druitt` still fails the strict autonomous gate: an open trace with a 1059 m start/end gap where `auto_slice` (5711 m) and `start_return` (5789 m) compete against a 7298 m full trace. Combining closure gap, closure heading and periodicity confidence into a single score would likely resolve it. This is independent of the counting problem.

## Request To Other Models (Copy/Paste)

You are improving `scripts/lib/gpx-corner-detector.mjs`, a testing-only GPX corner detector.

Constraints: keep fail-fast gates; no app runtime integration; no confirmed corner counts used during autonomous detection; no track-ID-specific logic.

Current state: 12/19 exact, absolute error 11, worst error 3. All residual error is under-detection on `baskerville` (−2), `broadford` (−2), `hidden_valley` (−1), `lakeside` (−1), `mac_park` (−1), `the_bend_gt` (−3), `wanneroo` (−1).

Already measured and ruled out — do not repropose without new evidence:

1. Multi-scale curvature / scale-space apex stability. Under-counted tracks gain nothing at any curvature scale from 6 m to 26 m.
2. Curvature-plateau or radius-step splitting. At a 1.5 radius ratio this recovers 11 corners but causes 72 false splits on tracks that are already correct; no threshold separates them.
3. Detection-sensitivity tuning. Across 108 threshold configurations, `baskerville`, `broadford`, `lakeside`, `the_bend_gt` and `wanneroo` are never exact. Geometry-only ceiling is about 14/19.

Diagnosis to engage with: official corner numbering appears partly conventional rather than purely geometric, so the distinguishing information may be absent from the GPX.

Your task: either (a) identify a geometric or topological signal that separates "one official corner" from "two joined official corners" and demonstrate it beats the plateau baseline above, or (b) argue for a different formulation (constrained placement against a known count, a revised metric, or supervised labelling) and implement the first step.

Report before/after exact matches, absolute error, worst error, which tracks changed and why, and any regressions.

Success target: 17/18 excluding the `wanneroo` data defect, with zero regressions — or a reasoned argument that this target is the wrong one, backed by measurement.
