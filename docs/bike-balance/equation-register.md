# Bike Balance Setup — Equation Register (MVP)

Status: v0.3  
Product: RoadRacer Coach → Tools → Bike Balance Setup  
Math rule: one calc engine for Rider / Tuner / Engineer; no simplified formulas.

## Conventions

- SI base: mm, N, N/mm, degrees (converted to radians inside trig).
- `%` of wheelbase unless noted.
- Longitudinal X from front contact patch toward rear (laden, lean 0).
- Results are **position-dependent**; always quote Pos + Lean with numbers.
- Source tiers: `public` (user-facing citations) | `identity` (§8 golden verify) | `input` (user-measured).

Internal verification aid (not affiliation): `ZeroChassis-Result-Reference-Guide.pdf` §8.

## Golden dataset A — laden track (lean 0)

From Result Reference Guide worked example:

| Symbol | Value |
|--------|------:|
| rake | 24° |
| trail | 108.3 mm |
| WB | 1426 mm |
| fork travel | 56.6 mm |
| shock travel | 21 mm |
| fork rate | 23.3 N/mm |
| shock rate | 105.5 N/mm |
| link ratio | 2.07 |
| fork force | 1542.4 N |
| shock force | 3717.3 N |
| CoG X | 698.9 mm |
| CoG Y | 672 mm |
| AS angle | 24.9° |

## Equations (MVP)

### EQ-FW-TRAVEL-01 — Front wheel travel

- **Formula:** `Fw_travel = fork_travel × cos(rake)`
- **Assumptions:** planar model; fork axis at rake; vertical wheel travel.
- **Public refs:** Standard fork/rake kinematic projection (motorcycle chassis texts).
- **§8:** `56.6 × cos(24°) ≈ 51.6 mm`

### EQ-FW-RATE-01 — Front wheel rate

- **Formula:** `Fw_rate = fork_rate ÷ cos²(rake)`
- **Assumptions:** both legs combined in `fork_rate`; vertical equivalent at tyre.
- **Public refs:** Virtual work / force–displacement through angled fork.
- **§8:** `23.3 / cos²(24°) ≈ 28 N/mm`

### EQ-FW-FORCE-01 — Front wheel force

- **Formula:** `Fw_force = fork_force ÷ cos(rake)`
- **Assumptions:** spring force along fork axis; vertical component at contact.
- **§8:** `1542.4 / cos(24°) ≈ 1692 N`

### EQ-RW-FORCE-01 — Rear wheel force

- **Formula:** `Rw_force = shock_force ÷ link_ratio`
- **Assumptions:** `link_ratio` is instantaneous motion ratio (d_wheel / d_shock).
- **§8:** `3717.3 / 2.07 ≈ 1798 N`

### EQ-RW-RATE-01 — Rear wheel rate

- **Formula:** `Rw_rate = shock_rate ÷ link_ratio²`
- **Assumptions:** instantaneous ratio; vertical stiffness at tyre.
- **§8:** `105.5 / 2.07² ≈ 24.6 N/mm` (guide shows ~26 with instantaneous vs average nuance — MVP uses instantaneous definition; Engineer note flags ratio definition)

### EQ-RW-TRAVEL-01 — Rear wheel travel

- **Formula:** `Rw_travel = shock_travel × link_ratio`
- **Assumptions:** same instantaneous ratio convention as rate/force.
- **§8 context:** example Rw travel 44.4 mm with shock 21 mm → ratio ≈ 2.11 (instantaneous local); display link ratio 2.07 may differ slightly.

### EQ-REAR-NTRAIL-01 — Rear normal trail

- **Formula:** `rear_normal_trail = (WB + trail) × cos(rake)`
- **§8:** `(1426 + 108.3) × cos(24°) ≈ 1401.5 mm`

### EQ-LT-ANGLE-01 — Load-transfer angle

- **Formula:** `LT_angle = atan(CoG_Y / WB)` (degrees for display)
- **§8:** `atan(672/1426) = 25.2°`

### EQ-AS-GEO-01 — Anti-squat angle

- **Manual mode:** user-entered angle.
- **Geometry mode:** `AS_angle = atan2(IFC_y, WB − IFC_x)` where IFC = intersection of swingarm line (pivot→rear axle) and **upper external sprocket tangent** (top chain run).
- **Assumptions:** lean 0; +swingarm angle = pivot above axle; rear sprocket concentric with axle; chain pitch radius = teeth×pitch/(2π).
- **Public refs:** classic IFC anti-squat construction (e.g. Foale); tangent chain model documented in Sources.

### EQ-AS-PCT-01 — Anti-squat percent

- **Formula:** `AS% = tan(AS_angle) / tan(LT_angle) × 100`
- **Assumptions:** classic squat-line vs load-transfer construction; CoG must be trustworthy for %.
- **Provenance rule:** if CoG is `estimated`, prefer showing AS **angle** and warn on %.
- **§8:** `tan(24.9°)/tan(25.2°) × 100 ≈ 98.4%`

### EQ-WEIGHT-01 — Static weight split

- **Formula:** `R% = CoG_X / WB × 100`; `F% = 100 − R%`
- **§8:** R% = 49.01%; F% = 50.99%

### EQ-SRC-01 — Spring rate centre

- **Formula:** `SRC = Rw_rate / (Fw_rate + Rw_rate) × WB`
- **§8:** `26/(28+26)×1426 ≈ 686.8 mm` (uses displayed wheel rates)

## Position presets (Phase 2 — documented only)

Force at wheels (N), from Result Reference Guide:

| Pos | Front N | Rear N | Lean |
|-----|--------:|-------:|-----:|
| Ext | 0 travel | 0 travel | 0 |
| Static/1g | 950 | 950 | 0 |
| Acceleration | 480 | 1450 | 0 |
| Braking | 2900 | 0 | 0 |
| Cornering | 1850 | 1600 | 0 |
| Cornering+lean | 1850 | 1600 | 50° |

MVP: user enters travels/forces for the current position; presets not simulated yet.

## Bibliography (user-facing Sources)

Cite in-app as public motorcycle dynamics practice; expand with named editions during review:

1. Cossalter, V. — *Motorcycle Dynamics* (steering geometry, trail, load transfer concepts).
2. Foale, T. — *Motorcycle Handling and Chassis Design* (geometry, anti-squat constructions).
3. Standard linkage kinematics: wheel rate ∝ spring / MR²; angled fork vertical projection via cos(rake).

Internal: Mariniello, A. — Zero Chassis Result Reference Guide v1.0 (July 2026), independent unofficial documentation — verification identities only.
