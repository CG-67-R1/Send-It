# Track turn-hand verification — 2026-07-19

## Policy (P0)

Wrong left/right is not acceptable. Prefer `direction: "complex"` until a **rider** or **official numbered map** locks the hand.

- Allowlist: [`app/src/data/track_turn_verification.json`](../app/src/data/track_turn_verification.json)
- Apply: `node scripts/enforce-turn-verification.mjs --write`
- Gate: `node scripts/validate-track-data.mjs` (wired into mobile-review preflight)
- Hermes must **not** auto-write left/right from GPX bearings

## Why GPX caused errors

GPX is a centreline polyline. Automated bearing clusters do not carry official turn numbers. Hermes mapped clusters → T1…Tn incorrectly and sometimes overrode KB/maps (e.g. MG Hairpin).

## Status after enforce pass

| Track | Verified L/R | Rest |
|-------|--------------|------|
| Phillip Island | T1–T11 (rider + consensus) | — |
| Mallala | T2, T6 (rider), T7 | other corners → complex |
| Mac Park | T2–T5, T7–T8, T10–T12 | T1, T6, T9 → complex until locked |
| Morgan / Wakefield / Wanneroo / QR / Broadford / Bend Int / SMP Gardner | partial allowlist | unverified → complex |
| Bend GT, SMP Brabham/Druitt, Sandown, Winton, Calder, Hidden Valley, Baskerville | none | **all** complex (GPX/stub untrusted) |
| Mount Panorama | T1 Hell Corner right only | rest complex — full Bathurst rename/pass still needed |

## Rider lock-in queue (next)

1. Mac Park T1 / T6 / T9 hands
2. Mount Panorama full named sequence
3. Hidden Valley T1–T14
4. Baskerville T1–T9
5. Bend GT / East / West
6. SMP Brabham, Druitt, Amaroo
7. Remaining Mallala T1/T3–T5/T8–T9

When a rider confirms a hand, add it to `track_turn_verification.json` `verifiedHands`, run enforce + validate, then ship.
