# Bike Category Reference (class bias only)

Quick reference for matching a user's bike to a **class bias** used by the diagnostic engine.

**Last Updated**: 2026-07-19

---

## HARD RULE — never invent a user setup

This file provides **class characterisation only**.

- Do **not** invent or apply numeric hot pressures, clicker counts, oil heights, spring rates, or shock lengths from this file.
- Do **not** substitute a “fallback profile” bike or tyre for the rider’s real machine.
- Numeric pressure / compound advice must come from the user’s stated manufacturer row or from `tire-pressure-weather-troubleshooting-guide.md` / `bridgestone-race-tyre-data-extract.md` after brand/model/size are known.
- If the bike category is unknown, ask — do not default to a fake R6/R1 setup sheet.

Legacy numeric “fallback profile” tables were removed from this pack for safety (2026-07-19). Class bias below is coaching heuristic, confidence Medium/Low.

---

## Category matching (characteristics only)

### Superbike (1000cc+)

**Examples**: Yamaha R1, BMW S1000RR, Ducati Panigale V4, Kawasaki ZX-10R, Honda CBR1000RR, Suzuki GSX-R1000

**Bias** (aligns with `core-diagnostic-pack-v2.1.json` → `bike_classes.1000`):

- High power, often traction-limited on exit
- Geometry tweaks usually less important than rider input / tyre window until basics are solid
- Traction issues: treat as more sensitive

### Mid Supersport (600cc)

**Examples**: Yamaha R6, Kawasaki ZX-6R, Honda CBR600RR, Suzuki GSX-R600

**Bias** (`bike_classes.600`):

- Balanced; corner-speed dependent
- Traction and geometry effects: moderate

### Small / lightweight (≈300–400cc class)

**Examples**: Yamaha R3, Kawasaki Ninja 300/400, Honda CBR300R, KTM RC390

**Bias** (`bike_classes.300`):

- Lower power, momentum-based
- Traction slides less common; corner speed / line critical
- Do not assume race-slick pressure bands from larger bikes

### Unknown

Ask for make / model / year (and tyre brand/model if discussing pressures). Do **not** invent a default setup.

---

**Last Updated**: 2026-07-19
