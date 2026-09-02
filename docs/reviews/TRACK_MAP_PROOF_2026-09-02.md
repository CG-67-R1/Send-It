# Track Details map proof — 2026-09-02

**P0 CURSOR ALERT.** Track Details maps shipped on 2026-09-01 are unproven against venue/ASBK board maps. Do not bake or rebuild until `node scripts/prove-track-maps.mjs` is PASS.

## Executive summary

- P0: 1 (all 19 Track Details maps unproven; bake/rebuild now blocked)
- P1: 0 new code defects in the proof gate itself
- Gates that used to say PASS (`validate-track-data.mjs`) never checked official turn boards, pit location, or catalog-vs-geometry placement. Diagnose listed SHIFT/UNMATCHED and the skill said “tracks still run.” That is how every layout shipped wrong.

## Where the mistake was made

1. **Wrong gate.** `validate-track-data.mjs` only checked JSON parse, geofences, Bend lengths, and `verifiedHands` sources. It cannot see a wrong MG number or a pit painted on the wrong straight.
2. **Report-only diagnose.** `diagnose-track-memory.mjs` already showed catalog vs geometry mismatches (Winton T2–T8 all SHIFT, Hidden Valley T1–T6 UNMATCHED, QR T5 SHIFT, Gardner T1/T3/T7/T9 SHIFT). The track-data-analyst skill copied those forward as P1 “tracks still run.”
3. **Heuristic pits.** `build-track-info-maps.mjs` always draws pit entry/lane/exit at s=0.97–0.02. That is false whenever S/F is not the pit straight (QR longest straight is s=0.33).
4. **Grouped catalog vs boards.** Maps plot `tracks.json` grouped blobs (e.g. “Turns 7–10”) as one red dot. Riders read official T1–Tn boards.
5. **Conflicting skills.** `send-it-track-catalog` said SMP was clockwise; `track-data-analyst` and the venue say anticlockwise. Agents following the catalog skill can lock the wrong circuit direction.
6. **Shipped anyway.** 2026-09-01 maps went to `main` after the validator PASS, while still `needs_owner_data` vs official maps.

Systematic-debugging tight loop (now red): `node scripts/prove-track-maps.mjs` (exit 1). Green only when every layout in `app/src/data/trackInfo/mapProof.json` is `owner_verified` with board count, source, `pitVerified: true`, and no SHIFT/UNMATCHED.

## Cursor attention

1. **Do not bake. Do not run `build-track-info-maps.mjs`.** Both now refuse until proof PASS.
2. **Wait for the owner to retrieve** the RETRIEVE list from `prove-track-maps.mjs` (venue or ASBK north-up board map + pit entry/lane/exit per layout).
3. After that data is in hand: pin each board to a GPX `sNorm`, set `mapProof.json` to `owner_verified`, then rebuild maps. Copy `app/src/data/trackInfo` → `android-app/src/data/trackInfo`.
4. Re-run `node scripts/prove-track-maps.mjs` then `node scripts/mobile-review-preflight.mjs`.
5. Re-install Hermes skills from repo: `.\scripts\install-hermes-skills.ps1` so weekly review uses the P0 map-proof gate.

Do **not** invent board numbers from GPX curvature or Wikipedia alone. Wikipedia counts below are research hints, not a lock.

## Per-track errors (identified)

| Track | Catalog dots | Geometry turns | Published boards (research) | Errors on the shipped map |
|---|---|---|---|---|
| Phillip Island | 11 | 11 | **12** | Missing T12; MG stored as **T9 right** (guides: **T10 left**); T11 labelled Gardner (official T12); Lukey/Hayshed numbering off; pits heuristic |
| Mallala | 9 | 9 | 9 (some guides 10) | T4 and T5 UNMATCHED (stacked on T3–T6); pits heuristic |
| Mac Park | 12 | 8 | owner | T1, T2, T6, T12 UNMATCHED; T8 and T11 SHIFT; pits heuristic |
| Morgan Park | 9 | 12 | **12** | Grouped T1–2 / T8–9 / T11–12 so 9 dots vs 12 boards; T9/T10/T11 SHIFT; pits heuristic |
| Wakefield / One Raceway | 9 | 9 | owner (layout changed) | T3 SHIFT; T6 and T9 UNMATCHED; no standalone T7; pits heuristic |
| Wanneroo | 8 | 9 | owner (bike chicane?) | T3 SHIFT ~10% of lap; T6 UNMATCHED; longest straight not at s=0 so pits heuristic is wrong |
| The Bend International | 13 | 18 | **18** | Grouped T4+T5, T7–10, T15–16; T4 UNMATCHED; T6 SHIFT; pits heuristic |
| The Bend GT | 9 | 31 | ~35 | 9 blobs vs ~31 events; T2/T3 SHIFT 9–13% of lap; pits heuristic |
| SMP Gardner | 11 | 11 | **11** | T1, T3, T7, T9 SHIFT; T7 verified right vs geom left; pits heuristic; catalog-skill wrongly said CW |
| SMP Brabham | 11 | 17 | **18** | 11 grouped blobs vs 18 boards; pits heuristic |
| SMP Druitt | 6 | 8 | owner | 6 dots vs 8 geometry turns; pits heuristic |
| Queensland Raceway | 5 | 6 | **6** | T3 UNMATCHED; T5 SHIFT 15% and hand disagree (right vs left); S/F/pits on wrong straight (longest at s=0.33) |
| Broadford | 7 | 5 | **12** | Grouped boards; T12 left vs geom right; T3/T6/T7 UNMATCHED; pits heuristic |
| Sandown | 5 | 10 | **13** | 5 blobs vs 13 boards; pits heuristic |
| Winton | 8 | 12 | **12** | **T2–T8 all SHIFT** (one event late); 8 dots vs 12 National boards; pits heuristic |
| Calder Park | 3 | 9 | owner | 3 blobs vs 9 geometry turns; pits heuristic |
| Hidden Valley | 14 | 8 | **14** | Count matches Wikipedia but **T1–T6 UNMATCHED** (dots on the opening sector); T7–T14 all SHIFT; pits heuristic |
| Baskerville | 9 | 5 | owner | T1–T4 UNMATCHED; 9 vs 5 geometry; pits heuristic |
| Lakeside | 8 | 7 | owner | T1 UNMATCHED; pits heuristic |

## Foolproof rebuild method (after owner data)

1. Owner supplies, per layout: north-up official map (photo/PDF) with **board numbers**, plus pit entry / lane / exit marked vs S/F.
2. Cursor records `ownerBoardCount`, `ownerBoardSource`, and a `sNorm` per board in `cornerStations.json` (no grouped “Turns 7–10” map dots).
3. Pit `sNorm` range stored in proof (`pitVerified: true`). Never infer pits from a 3% wrap around s=0.
4. `prove-track-maps.mjs` must go green (count match, no SHIFT > 4% of lap, pits verified).
5. Only then bake (if centreline changed) and rebuild compact maps; mirror to android-app.
6. Hermes weekly: FAIL preflight if proof is red. Do not copy-forward.

## Automated gates now

| Command | Expected today |
|---|---|
| `node scripts/prove-track-maps.mjs` | **FAIL** (all `needs_owner_data`) |
| `node scripts/validate-track-data.mjs` | **FAIL** (includes map proof) |
| `node scripts/bake-track-memory-layout.mjs <id>` | **blocked** |
| `node scripts/build-track-info-maps.mjs` | **blocked** |
| `node scripts/mobile-review-preflight.mjs` | **FAIL** on map proof |

Health-check.yml (10-min calendar/API) does **not** include this gate so Render warm-up stays independent of map proof.

## Suggested fix order (Cursor, after owner retrieval)

1. Pin PI 12 boards (MG left T10) + pits — highest-traffic.
2. QR S/F and pit straight (s=0 is wrong) + 6 boards.
3. Winton National 12 + unshift T2–T8.
4. Remainder from the RETRIEVE list.

## Re-verify

```powershell
node scripts/prove-track-maps.mjs
node scripts/mobile-review-preflight.mjs
```
