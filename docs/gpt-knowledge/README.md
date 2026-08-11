# GPT Knowledge pack (RoadRacer / TrackRider)

Reference copy of the Custom GPT Knowledge files used with RoadRacer AI, stored for integration with the Send-It app.

**Source snapshot:** `C:\Users\Administrator\Downloads\gptfiles` (2026-07-19)  
**Do not treat this folder as live API retrieval yet** — it is documentation + a clean upload set for ChatGPT Knowledge.

## Authority order

```text
User facts
  → instructions.md (modes, safety, anti-hallucination)
  → core-diagnostic-pack-v2.1.json
  → rider-skill-interaction-layer.json  (detail level only)
  → TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json + Track_Knowledge_Base_Australia_v2.md  (coaching bias)
  → track_geometry_australia.json  (layout facts)
  → tyre markdown trio + `tyre-wear-photo-recognition.md`  (any pressure / wear / compound / user-photo class)
  → session-learning-v1.json  (hold / escalate / revert)
  → technique index / stubs  (Coach mode; only if content exists)
  → geometry-calculations.md  (chassis maths reference; illustrative, not prescriptive)
```

Never: invent pressures from `bike-category-reference.md`, or let track prose override geometry JSON.

## UK Custom GPT replica (2026-08-11)

Separate ChatGPT upload set for United Kingdom launch. Same diagnostic engine; swap country Knowledge.

| AU file | UK replica |
|---------|------------|
| `instructions.md` | `instructions-uk.md` |
| `track_geometry_australia.json` | `track_geometry_uk.json` |
| `TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json` | `TRACK_SPECIFIC_DIAGNOSTIC_UK_v1.json` |
| `Track_Knowledge_Base_Australia_v2.md` | `Track_Knowledge_Base_UK_v2.md` |

Upload checklist: [`docs/uk-launch/GPT_UK_UPLOAD.md`](../uk-launch/GPT_UK_UPLOAD.md).

## Track geometry coverage (track_geometry_australia.json)

| Track | Geometry | Coaching bias (TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json) |
|-------|----------|------------------------------------------------------|
| Mallala | YES (2026-08-11) | YES (mallala) |
| Morgan Park | YES (2026-08-11) | no |
| Mount Panorama | YES (2026-08-11) | no |
| Sandown | YES (2026-08-11) | no |
| SMP Gardner / Brabham / Druitt | YES (2026-08-11) | YES (smsp) |
| Calder Park (Thunderdome) | YES (2026-08-11) | no — oval, not ASBK |
| Phillip Island | YES (original) | YES |
| Broadford | YES (original) | YES |
| Mac Park | no | YES (mac_park) |
| The Bend (Intl / GT / West / East) | YES (original) | no |
| One Raceway (fmr Wakefield Park) | YES (original) | no |
| Winton | YES (original) | no |
| Hidden Valley | YES (original) | no |
| Queensland Raceway | YES (original) | no |

New geometry entries (2026-08-11) are derived from Emtron GPX dataset cross-referenced with Wikipedia and official sources. Turn-level directions marked `null` or with "verify" notes should be confirmed against official circuit diagrams before high-stakes use.

## Upload checklist (Custom GPT)

Upload everything in this folder **except**:

- `README.md` (optional)
- `legacy/` (broken JSON with markdown fences, superseded cores, Actions ops note)

Paste only the **BEGIN…END** block from `instructions.md` into **Configure → Instructions** (GPT hard-caps at 8000 characters). Upload `instructions-extended.md` as Knowledge for the full workflow text.

## What changed in this pack (2026-08-11)

| Change | Why |
|--------|-----|
| Added `tyre-wear-photo-recognition.md` | Text-only photo class atlas for user uploads; no third-party tyre images |
| `tire-wear-patterns-comprehensive.md` v0.3 + instructions TYRES/photo protocol | Stop “shredded”→cold tear; spatial band/zone first |
| `track_geometry_australia.json` — added 8 tracks (mallala, morgan_park, mount_panorama, sandown, sydney_motorsport_park with 3 layouts, calder_park) | GPX dataset (Emtron AU) cross-referenced with Wikipedia / official sources; fills coaching-bias-only gaps |
| `track_geometry_australia.json` — Mallala corrected to **clockwise** + rider-locked L/R (T2 L, T3 R, T6 L, T7 R) | GPX session had wrongly marked anticlockwise / inverted hands vs app verification |
| `instructions.md` — drop phantom `MODE:RIDER` | Hermes P0 — COACH is the coaching mode |
| `TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json` — key `smspr` → `smsp` | Hermes P1 — lookup mismatch |
| Technique stubs / index / riding-techniques header | Hermes P1/P2 — no phantom standalone files; no invent |
| `README.md` — authority order + coverage table | Hermes P1/P2 |

**Verify notes:** New track entries carry `null` approx_direction or "verify" notes on turns where sources conflict or GPX resolution was insufficient. Do not remove verify notes without cross-referencing an official circuit PDF or sighting lap.

## What changed in this pack (2026-07-19)

| Change | Why |
|--------|-----|
| Repaired JSON → kebab-case files | Fence-wrapped JSON was invalid and unreliable |
| Merged Core V1+V2 → `core-diagnostic-pack-v2.1.json` | One engine; keep V1 problem types + V2 class modifiers |
| Session escalation aligned | compound before suspension (matches tyre KB) |
| Bike category numerics removed | Conflicts with no-invent / no-fallback rules |
| Session example rewritten | Cold tear ≠ automatic pressure drop |
| Index hygiene | Missing files listed as “do not invent” |
| `legacy/` quarantine | Superseded / ops-only |

**Preserved without rewrite:** AU track coaching bias (Mallala, Broadford, Mac Park, PI, SMSP), tyre brand guides, Bridgestone extract, geometry maths, technique attribution maps.

## App integration map

| GPT | RoadRacer app |
|-----|----------------|
| `MODE:COACH` / `[[TR_MODE:COACH]]` | Coach chat (`api/roadraceAi.js` coach mode) |
| `MODE:SUSPENSION` / `[[TR_MODE:SUSPENSION]]` | Bike Setup chat |
| `MODE:FULL` | Combined race-engineer behaviour (not a separate tab yet) |
| Tyre guides | Prefer shared excerpts / FAQs over inventing in prompts |
| `track_geometry_australia.json` | Align over time with `app/src/data/tracks` |
| Session learning | Day Setup Sheet + session history storage |
| Skill layer | Future: tone by onboarding activity / self-rated level |

Local coaching prose stays **bias** (Medium/Low). Manufacturer tables stay **fact** when cited from tyre files.

## Legacy

See `legacy/README.md`.
