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
  → tyre markdown trio  (any pressure / wear / compound number)
  → session-learning-v1.json  (hold / escalate / revert)
  → technique index / stubs  (Coach mode; only if content exists)
```

Never: invent pressures from `bike-category-reference.md`, or let track prose override geometry JSON.

## Upload checklist (Custom GPT)

Upload everything in this folder **except**:

- `README.md` (optional)
- `legacy/` (broken JSON with markdown fences, superseded cores, Actions ops note)

Paste only the **BEGIN…END** block from `instructions.md` into **Configure → Instructions** (GPT hard-caps at 8000 characters). Upload `instructions-extended.md` as Knowledge for the full workflow text.

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
