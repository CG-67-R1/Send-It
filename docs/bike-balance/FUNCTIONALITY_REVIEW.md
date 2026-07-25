# Bike Balance Setup — Functionality Review (v0.2)

Date: 2026-07-25  
Scope: RoadRacer Coach → Tools → Bike Balance Setup after v0.3 build

## Verdict

**v0.3 closes the biggest AS gap** (angle from swingarm/chain geometry) and adds measured travel slots + citable export.  
Still **not** ZeroChassis-class for full force→attitude solving or CAD bike files — but much stronger as an accessible, auditable paddock tool.

## What works now

| Capability | Status | Notes |
|------------|--------|-------|
| Derived geometry / rates / forces | Strong | Exact identities; §8 golden tests |
| Anti-squat % + squat/extend flag | Strong | Warns if CoG not measured |
| Load-transfer angle, weight F/R %, SRC, SRC%, SFC | Strong | SFC vs CoG X drift warning |
| Position presets (Ext/Static/Accel/Brake/Corner/Corner+lean) | Partial | Applies exact wheel→component **forces**; does **not** invent travels |
| Skill modes Rider/Tuner/Engineer | Strong | Same engine; progressive disclosure |
| Why this number (sources) | Strong | Formula + inputs + citations |
| Ref vs proposal deltas | Strong | Manual Save as Ref |
| Symptom → highlight guide | Good | §9 map; no alternate math |
| Verify cross-checks | Good | Identity consistency |
| RR Bike Setup AI handoff | Good | Seeds numbers; AI must not invent |
| Lean context | Weak | Label + warning only; no leaned kinematics yet |

## Gap vs ZeroChassis-class software

| Missing for parity | Impact |
|--------------------|--------|
| Full frame/swingarm/chain CAD model → AS angle from geometry | High — users still type AS angle |
| Travel solved from force (needs springs, preload, TOS, linkage curve) | High — presets change forces, not attitude |
| Multi-graph / travel sweep | High |
| Tyre carcass rates, top-out spring model as first-class | Medium |
| Multi-bike file library / 4-column compare | Medium |
| Excel/report export with full bibliography | Medium (Sources exist per field) |

## Usability vs ZeroChassis

Likely **better for**: track-day riders, club tuners, learning “what moved”, legitimacy when challenged, phone-side workflow next to Day Setup / AI.

Still **worse for**: race engineers who already live in a verified ZC bike file and need force-driven attitude iteration without re-measuring travels.

## Recommended next build slice (v0.3)

1. Anti-squat **angle from geometry** (swingarm, pivot, sprockets, chain line → IFC) with public refs  
2. Optional measured travel pairs per position (Ext / Static / Brake…) stored on the bike  
3. Citable PDF/Markdown export of Ref vs proposal  
4. Only after (1)–(2): market harder to “priced out of pro chassis software” users  

## Test status

Run: `npm run test:bike-balance` in `app/`  
Expected: laden §8 + Ext identities + position force inverses + new EQ IDs.
