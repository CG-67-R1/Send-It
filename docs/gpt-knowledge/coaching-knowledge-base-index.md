# Motorcycle Road Racing Coaching Knowledge Base - Master Index

**Version**: 0.2  
**Created**: 2025-12-22  
**Last Updated**: 2026-08-11 (Send-It `docs/gpt-knowledge` reference pack)

Complete index of coaching resources organized by technique and what it improves for the rider.

## Upload set for Custom GPT (current)

Prefer these filenames (kebab-case where repaired):

| File | Role |
|------|------|
| `instructions.md` | Short system instructions (paste BEGIN…END into Configure → Instructions; ≤8000 chars) |
| `instructions-extended.md` | Full workflow detail (Knowledge upload — not the Instructions box) |
| `core-diagnostic-pack-v2.1.json` | Diagnostic engine (merged Core V1+V2) |
| `rider-skill-interaction-layer.json` | Novice / intermediate / advanced bias |
| `session-learning-v1.json` | Hold / escalate / revert |
| `track_geometry_australia.json` | Authoritative geometry |
| `TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json` | Track coaching bias (not geometry) |
| `Track_Knowledge_Base_Australia_v2.md` | AU track coaching prose |
| `tire-pressure-weather-troubleshooting-guide.md` | Pressure / weather / brand anchors |
| `tire-wear-patterns-comprehensive.md` | Wear patterns + fix order |
| `tyre-wear-photo-recognition.md` | User-photo wear class (text atlas; no third-party images) |
| `race-setup-and-tyre-kb.md` | **Combined upload** — race suspension (Öhlins/WP/Nitron/Bitubo/Andreani/YSS) + tyre pressures all brands + rain tyres + photo wear diagnosis. 38 KB. Monthly updated. |
| `bridgestone-race-tyre-data-extract.md` | Bridgestone race fitment extract |
| `bike-category-reference.md` | Class bias only — **no numeric fallbacks** |
| `geometry-calculations.md` | Chassis geometry maths (illustrative) |
| `technique-by-improvement.md` | Technique → improvement map |
| `coaching-knowledge-base-index.md` | This file |
| `session-tracking-guide.md` | Multi-session conversation habits |
| `riding-techniques-combined.md` | Stub — limited detail until full extracts uploaded |

**Do not upload** `legacy/` (broken fence JSON, superseded cores, GPT Actions ops note).

## Missing from this pack (do not invent)

These are referenced historically but **not** present under `docs/gpt-knowledge/`. If absent from the GPT upload, say so — never reconstruct from memory:

- `TRACK_PROBLEM_INTERACTION_AU_v1.json`
- `Track_Riding_KB_AllTracks_v1.md`
- `braking-techniques.md`, `cornering-techniques.md`, `body-position.md` (full extracts)
- `overtaking-techniques.md` (stub header only in riding-techniques-combined.md; full extract not in pack)
- Bridgestone `_TEMP_…` operating-range transcription / PNG

## Track coverage (geometry vs coaching bias)

If a track has geometry but no coaching bias (or the reverse), say so and use general coaching + geometry facts only — do not invent track-specific bias.

| Track | Geometry (`track_geometry_australia.json`) | Coaching bias (`TRACK_SPECIFIC…` / Track KB) |
|-------|--------------------------------------------|-----------------------------------------------|
| Broadford | yes | yes |
| Phillip Island | yes | yes |
| Mallala | yes | yes |
| SMSP (`smsp` / `sydney_motorsport_park`) | yes | yes |
| Mac Park | no | yes |
| Winton | yes | no |
| Hidden Valley | yes | no |
| Queensland Raceway | yes | no |
| The Bend | yes | no |
| One Raceway | yes | no |
| Morgan Park | yes | no |
| Mount Panorama | yes | no |
| Sandown | yes | no |
| Calder Park | yes | no |

## Quick Reference by Improvement Area

### Improves: Corner Speed
- Vision & Reference Points → Better planning, earlier turn-in
- Throttle Control & Drive → Smooth roll-on, better exit drive
- Steering/Quick Turn → Faster direction changes
- Body Position → Better stability, reduced unwanted input

### Improves: Consistency
- Braking & Trail Braking → Consistent entry speeds
- Vision & Reference Points → Repeatable reference points
- Mental Game → Structured practice, confidence base

### Improves: Safety/Risk Management
- Trail Braking → Speed-radius relationship, risk management
- Throttle Control → Avoiding high-sides, rear traction shocks
- Steering/Quick Turn → Survival reactions, safety framing
- Mental Game → Confidence vs tension, trusting bike/tyres

### Improves: Entry Speed Control
- Braking & Trail Braking → Markers, brake pressure control
- Vision & Reference Points → Planning entry/apex/exit

### Improves: Exit Drive
- Throttle Control & Drive → Roll-on timing, stability
- Body Position → Better stability for drive

### Improves: Learning & Progress
- Mental Game → Structured practice, avoiding plateaus
- Fitness & Preparation → Rider conditioning, fatigue management

### Improves: Stability
- Body Position → Reducing unwanted input, bar weight
- Throttle Control → Neutral/maintenance throttle
- Steering → Commitment to steering input

## Techniques by Category

### 1. Vision & Reference Points
**Improves**: Corner speed, consistency, entry planning, safety  
**Sources**: Keith Code (CSS), CSS Australia  
**Track-Specific**: Only if a turn-by-turn KB is uploaded; otherwise use `track_geometry_australia.json` for layout facts and AU coaching bias files for habits — do not invent corner sequences.

### 2. Braking & Trail Braking
**Improves**: Entry speed control, consistency, safety, corner speed control  
**Sources**: Keith Code (CSS), Nick Ienatsch (ChampSchool), Ken Hill, Simon Crafar (MotoVudu)

### 3. Throttle Control & Drive
**Improves**: Exit drive, corner speed, safety, stability  
**Sources**: Keith Code (CSS), Nick Ienatsch (ChampSchool)

### 4. Steering, Turn-in, Quick Turn
**Improves**: Corner speed, safety, direction changes  
**Sources**: Keith Code (CSS), Simon Crafar (MotoVudu)

### 5. Body Position & Rider Inputs
**Improves**: Stability, corner speed, efficiency  
**Sources**: Keith Code (CSS), Simon Crafar (MotoVudu)

### 6. Mental Game, Confidence, Learning
**Improves**: Learning rate, progress, consistency, confidence  
**Sources**: Simon Crafar, Keith Code (CSS), Ken Hill

### 7. Fitness & Preparation
**Improves**: Endurance, consistency, learning capacity  
**Sources**: Simon Crafar, Ken Hill

## Quick Diagnosis Guide

- "I'm slow through corners" → Vision, Steering, Throttle, Body Position
- "I'm inconsistent" → Braking, Vision, Mental Game
- "I'm scared/not confident" → Mental Game, Throttle (safety), Steering
- "I can't get faster" → Mental Game, Structured Practice, Fitness
- "I'm slow on exit" → Throttle Control, Body Position
- "I brake too early/late" → Braking, Vision (markers)
- "I'm getting tired" → Fitness, Mental Game (attention)

**See**: `technique-by-improvement.md` for detailed breakdown

---

## GPT Knowledge — track data hierarchy (2026-07-19)

**Tyre pressure, weather, compound bias:** `tire-pressure-weather-troubleshooting-guide.md`

**Tyre wear patterns and fixes:** `tire-wear-patterns-comprehensive.md`  
**User tyre photo class:** `tyre-wear-photo-recognition.md`

**Bridgestone race line:** `bridgestone-race-tyre-data-extract.md`

**Authoritative geometry:** `track_geometry_australia.json` — use before inferring layout from prose.

**Coaching / diagnostic bias (not geometry):** `TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json`, `Track_Knowledge_Base_Australia_v2.md`. Local RO coaching experience — Medium/Low confidence; do not override tyre or geometry facts.

**Diagnostic engine:** `core-diagnostic-pack-v2.1.json` (+ skill + session JSON).

**Superseded:** files under `legacy/` — do not re-upload.

**App integration:** see `README.md` in this folder.
