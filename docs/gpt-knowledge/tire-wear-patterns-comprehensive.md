# Tire Wear Patterns — Comprehensive Guide

Complete guide to **motorcycle** tyre wear patterns, causes, and fixes for track day and racing.

**Version**: 0.3  
**Companion files**:
- `tire-pressure-weather-troubleshooting-guide.md` — pressure, weather, brand anchors, wet/drying logic
- `tyre-wear-photo-recognition.md` — **user-photo interpretation** (spatial descriptors, decision tree; text only, no reference images)
**Sources**: Manufacturer-aligned pressure/wear logic, track-paddock diagnostic consensus, suspension/geometry wear heuristics.  
**Last Updated**: 2026-08-11

**Photo uploads:** Run `tyre-wear-photo-recognition.md` protocol first (zone → band geometry → morphology). Do **not** map “shredded” → cold tear by default. No third-party tyre photos in Knowledge.

---

## Quick “always do this first” rules

1. **Hot pressure reading immediately after pit-in** (don’t wait).  
2. **Pressure and compound/window before suspension** for most wear problems.  
3. If chasing tears for hours: likely **wrong compound** for surface temperature + pace.  
4. **Numeric targets:** use brand tables in `tire-pressure-weather-troubleshooting-guide.md` — do not guess pressures.  
5. **From a photo:** classify with `tyre-wear-photo-recognition.md`, then return here for fix order.

---

## Fix order rule (general)

1. Confirm **hot pressure** immediately after pit-in.  
2. Move pressure toward the brand’s **target hot / running** window.  
3. Adjust **warmers** (temp/time) for cold/hot surface.  
4. Re-evaluate **compound** for conditions + pace.  
5. Only then tune **suspension** in small steps.  

---

## Wear patterns

### 1. Cold tear / cold tearing

**What it looks like:**

- Loaded drive/shoulder band with **deep undercut** flaps; fingernail-shaped lips; sharp contrast vs smoother adjacent rubber.  
- Photo: prefer **depth + undercut** over the word “shredded” (see photo atlas).  
- **Key test:** Can you get a fingernail **under** the tears? (Often **yes** on classic cold tear.)

**Severity:** Mild → shallow clustered rips; moderate → wider band; severe → chunks, continuous undercut damage.

**Common causes** (ranked — **setup-dependent**):

1. **Over-inflation (hot pressure above window)** — small patch works hard, surface overheats vs carcass; material tears. **Confirm against brand hot target first.**  
2. Tyre not reaching / staying in operating window (cold track, short sessions, cautious pace).  
3. Compound too soft for conditions/pace.  
4. Suspension too stiff (especially compression), reducing mechanical grip.

**Fix order:**

1. Hot pit-in pressure vs brand window (see companion guide).  
2. Warmers: correct temp/time; avoid cooking on blanket then cooling on track.  
3. Compound: more temperature-tolerant / harder if the tyre never stabilises.  
4. Suspension: slightly soften compression; address excessive rebound “packing” if present.

**Note:** Some texts emphasise **high** pressure as the dominant cold-tear cause; others emphasise **low** carcass temperature. **Both** map to “not in the right thermal + mechanical window.” Always **measure** and compare to the manufacturer row.

---

### 2. Hot tear / overheating tear

**What it looks like:**

- Smeared, “melted then torn” texture; **shallow** tears; often **wider/diffuse**; may **arc toward centre**; hard to get fingernail deep under.  
- **Key test:** Shallow, smeared, arcing → think **hot tear / overheating**.

**Common causes** (ranked):

1. Compound too soft for track temp + pace.  
2. Pressure **out of window** — **too low** (excess flex/heat) **or too high** (skating/slide heat).  
3. Excessive wheelspin.  
4. Suspension allowing excessive squat/spin.  
5. Very abrasive surface.

**Fix order:**

1. Verify **hot** pressure immediately; correct toward window in **small** steps (e.g. ±0.5–1 psi).  
2. Harder / higher-temp compound if overheating persists.  
3. Reduce wheelspin (electronics, throttle, gearing).  
4. Slightly more support if the bike squats and spins.

---

### 3. Graining

**What it looks like:** Rolled balls/pills; “rolled” rather than melted.

**Causes:** Sliding at low temperature; surface not bonding.

**Fix order:** Heat (warmers/pace), correct hot pressure, smoother inputs, compound change if it never stabilises.

---

### 4. Blistering

**What it looks like:** Raised bubbles / boiled patches; local tread separation.

**Causes:** Sustained overheating; often compound too soft for conditions; can be amplified by wrong pressure.

**Fix order:** Compound/spec change; verify hot pressures; shorten sessions / cool-down; reduce prolonged spin.

---

### 5. Cupping / scalloping

**What it looks like:** Alternating high/low cups; often **front**.

**Causes:** Balance, alignment, worn parts, damping issues.

**Fix order:** Mechanical inspection and wheel balance first; then damping (often rebound).

---

### 6. Feathering / sawtooth edges

**What it looks like:** Smooth one direction, sharp/stepped the other; common on **treaded** fronts.

**Causes:** Braking + turn-in scrub; damping imbalance can worsen.

**Fix order:** Pressure check; small rebound change (1–2 clicks), re-evaluate; check geometry extremes.

---

### 7. Chunking

**What it looks like:** Missing rubber, sharp voids; localised.

**Causes:** Heat + abrasion; bond failure after overheating.

**Fix order:** Compound for conditions; hot pressure in range; reduce spin; slightly soften harsh compression if hammering bumps.

---

### 8. Pickup / marbling

**What it looks like:** Blobs of track rubber stuck to the tyre.

**Fix order:** Clean; stay off marbles; maintain heat (pace/warmers).

---

### 9. Flat-spotting / squared-off centre

**Causes:** Straight-line miles, high hot pressure, drive habits, TC intervention.

**Fix order:** Pressure toward window; compound for load/temp; gearing/throttle style.

---

### 10. Rain tyre overheating on drying line

**What it looks like:** Glossy/smeared, polished, greasy; rapid onset; often asymmetric where the dry line loads the tyre.

**Symptoms:** Grip drops suddenly; vague feel on drying line.

**Fix order:**

1. **Switch tyre** when practical.  
2. Reduce time on dry line; touch damp where safe to cool.  
3. **Pressure:** follow **rain** bulletin — do **not** chase grip by dumping pressure once overheating starts (see companion guide wet/drying logic).  
4. Pace management; low/short warmers only if manufacturer allows.

**Coaching note:** If a rain tyre feels greasy on a drying line, it is often **already overheating** — suspension tweaks won’t substitute for tyre choice or water cooling.

---

### 11. Suspension-related wear

**What it looks like:** Non-uniform tear width **or** intermittent torn→clean→torn around circumference; raised tread/groove edges (leading vs trailing hints at rebound). Texture alone is not enough — need a circumference view.

**Fix order:** Spring suitability; rebound; compression; small steps.

---

### 12. Geometry-related wear

**Not enough weight on front:** Front tyre; **narrow ~5–10 mm** continuous mid-shoulder band (not outer third).

**Too much weight on front:** Front tyre; **outer third** wear, large band, inner edge of damage follows circumference.

**Fix:** Ride height, fork offset, spring/balance — after ruling out pressure/compound. Photo atlas §§4–5.

---

### 13. Centre wear fast

**Causes:** Hot pressure high; straight-line load; heat.

**Fix order:** Reduce hot toward window; compound; throttle/gearing.

---

### 14. Edge tearing (lean)

**Causes:** Pressure/compound vs lean load; rebound packing; harsh compression on bumps.

**Fix order:** Hot pressure to window; small rebound reduction; slightly softer compression if surface is harsh.

---

### 15. Tyre discoloration (blue/green tint)

**Meaning:** Oils migrating after heat cycles; often **normal**. Effectiveness can fade over many cycles.

---

### 16. Good wear pattern

Even “beach tide” wear — smooth, predictable. Racers may still trade life for pace.

---

## Cold tear vs hot tear — quick comparison

| Characteristic | Cold tear (typical) | Hot tear (typical) |
|----------------|---------------------|---------------------|
| Depth | Deeper, “ripped” | Shallower, smeared |
| Fingernail test | Often **lifts** | Often **no** deep lift |
| Texture | Torn, chunky | Melted, arcing |
| Pressure clue | Often **above** window | Often **below** window **or** wrong compound |

**Reality:** Overlap exists; **hot pit-in measurement** + **brand window** decide the first move.

---

## Prevention strategies

### Pressure

- Hot pit-in every session; small steps (±0.5–1 psi).  
- **Wet/drying:** use **companion guide** — brand tables or Bridgestone-style deltas; avoid a universal “always lower for wet” rule.

### Conditions

- **Cold:** window discipline + warmers + compound.  
- **Hot:** harder compound band; avoid exceeding top of hot window.  
- **Drying:** rain tyre damage risk — pace and tyre choice first.

### Riding

- Smooth inputs; avoid cold-tyre heroics; manage wheelspin.

---

## Quick reference by symptom

| Symptom | Think |
|---------|--------|
| Deep rips, lifts with nail | Cold tear / mechanical tearing — check **high** pressure + temp window |
| Shallow smear, arcs | Hot tear / overheating — pressure low or compound soft |
| Pills / rolled | Graining — temp + slip |
| Bubbles | Blistering — heat / compound |
| Cups (front) | Mechanical + damping |
| Sawtooth | Tread scrub + damping |
| Chunks | Heat + abrasion / bond |
| Marble pickup | Track debris |
| Rain greasy dry line | Rain overheating — tyre choice |
| Non-uniform around tyre | Suspension / geometry |

---

## Checklists

**Before track day:** cold baseline; tyre condition; warmers working; weather plan; brand pressure row saved.

**During:** hot pit-in; visual wear scan; one change at a time.

**After:** cold pressure log; photos of wear; note compound and laps.

---

**Last Updated**: 2026-08-11
