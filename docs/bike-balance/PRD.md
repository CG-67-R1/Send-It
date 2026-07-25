# Bike Balance Setup — PRD / UI (v0.1 MVP)

## Goal

Ship an accessible, audit-ready bike balance calculator in RoadRacer **Coach → Tools**, with correct deterministic math and skill-mode presentation.

## Non-goals (v0.1)

- Force-based position simulation (document presets only)
- Full frame-file CAD / ZeroChassis file import
- Apex mega-spec documentation

## Screens

1. **BikeBalanceSetup** (hub) — skill mode toggle, Pos/Lean labels, Inputs / Results / Compare tabs, disclaimer
2. **Why this number** (modal/sheet) — equation ID, formula, assumptions, citations, inputs used
3. Wire from Tools list button “Bike Balance Setup”

## Skill modes

| Mode | Default Results UI |
|------|--------------------|
| Rider | Plain-language cards + meaning; Sources behind tap |
| Tuner | Parameter rows + Δ vs Ref + groups |
| Engineer | Rows + equation IDs + Verify cross-checks |

## MVP inputs

Bike/setup name; rake; trail; wheelbase; fork/shock travel; fork/shock rate; link ratio; fork/shock force; CoG X/Y; CoG provenance; anti-squat angle; lean (display); position label.

## MVP outputs

All EQ-* from `equations.json` that have required inputs; unavailable → “Needs input”.

## Persistence

AsyncStorage key for active bike setup + optional Ref snapshot + skill mode preference.

## AI handoff

Format measured inputs + engine outputs (with equation IDs) into RR Bike Setup chat; AI must not invent replacement numbers.
