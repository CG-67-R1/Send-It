# Track Knowledge Base — Australia v2

---

## How to use

- Track-specific **coaching nuance** only (surface, risks, habits).
- Do **not** override tyre/pressure rules from other KB files.
- **Corner direction, turn count, length:** use **`track_geometry_australia.json`** (not this file).
- Works alongside **`TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json`**.
- **`TRACK_PROBLEM_INTERACTION_AU_v1.json`** is not in this pack — do not invent problem×track matrices from memory.

---

# Mallala Motorsport Park

## Overview

- Surface: Bumpy, low grip off-line
- Key traits: Heavy braking, unstable over bumps
- Core risk: Front instability + rear spin on exit

## Key sections

### MALLALA_S01 — Kink / setup

- Priority: Stability before turn-in
- Risk: Front unloading over bumps
- Coaching: Smooth inputs; avoid aggressive steering

### MALLALA_S07 — Hairpin

- Priority: Exit drive
- Risk: Rear spin on throttle pickup
- Coaching: Late apex; controlled throttle

### MALLALA_S09 — Final corner

- Priority: Drive onto straight
- Risk: Rear instability on exit
- Coaching: Smooth pickup; maximise exit line

## Common mistakes

- Overloading front over bumps
- Early throttle on exits
- Over-aggressive turn-in

---

# Broadford

## Overview

- Surface: Tight, off-camber, elevation
- Core risk: Highside from throttle misuse

## Key sections

### BROADFORD_S01 — Chute / uphill opening (Turn 1 sector)

- **Note:** Not “Honda Corner” (that name is Phillip Island). Broadford opens from the chute into an uphill right-hand pair per venue/coaching maps — verify line on the day.
- Risk: Front tuck (off-camber)
- Coaching: Maintain throttle; avoid coasting

### BROADFORD_S05 — Hairpin

- Risk: Rear lift + instability
- Coaching: Controlled braking; smooth release

## Common mistakes

- Throttle too early on off-camber
- Overconfidence in grip

---

# Mac Park

## Overview

- Surface: High grip, elevation, crests
- Core risk: Unsettled bike over crests

## Key sections

### MACPARK_S01 — Hairpin

- Priority: Exit
- Risk: Rear spin after crest
- Coaching: Delay throttle until settled

## Common mistakes

- Throttle before suspension settles
- Poor line over blind crests

---

# Phillip Island

## Overview

- Surface: High speed, long corners, wind exposure
- Core risk: Edge grip overload

## Common mistakes

- Overloading tyre edge
- Ignoring wind effect on stability

---

# Sydney Motorsport Park (SMSP)

## Overview

- Surface: High grip, flowing
- Core risk: Rider-induced errors (entry + throttle)
- **Geometry:** Official venue states main circuits run **anticlockwise only** — layouts are in `track_geometry_australia.json` under `sydney_motorsport_park` (Gardner / Brabham / Druitt). Coaching bias key: `smsp`. Do not use clockwise for Gardner GP.

## Common mistakes

- Overconfidence on entry
- Poor throttle timing
