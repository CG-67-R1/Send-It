# Tire Pressure & Weather Troubleshooting Guide

Comprehensive guide for motorcycle **track and road-race** tyre pressure, weather, compound bias, and wear troubleshooting.

**Version**: 0.2  
**Source**: Brand-grounded rules from Dunlop, Pirelli, Bridgestone, Michelin, Metzeler (official tables where cited); generic Bridgestone-style wet deltas where no brand table applies. Bridgestone **race** fitment/compound: `bridgestone-race-tyre-data-extract.md`.  
**Companion file**: `tire-wear-patterns-comprehensive.md` (wear visuals and fix order).  
**Last Updated**: 2026-04-13 (Bridgestone race KB cross-link)

---

## Global rules

1. **Units:** Manufacturers publish **bar** and/or **psi**. When this guide gives **psi**, it is converted from published bar where noted (1 bar is approximately 14.5 psi) or taken from psi columns in source tables. Always confirm against the **exact model + size** sheet for your tyre.
2. **Hot vs cold:** Many race charts give **cold** (before session / after warmers) and **hot** (running) as **pairs**. **Target hot / running** pressure is the operational goal; cold is how you arrive there.
3. **Measure hot pressure immediately after pit-in** at operating temperature (do not wait for cool-down) when diagnosing grip or validating setup.
4. **Do not invent numbers.** If brand/model/size is unknown, give qualitative direction and ask for the manufacturer row or hot pit-in readings.

---

## Weather → Tyre choice & pressure rules

### Cold track / cold air

**Signals:**

- Ambient air temp ≤ ~15 °C  
- Track surface temp ≤ ~20 °C  

**Common risks:**

- Cold tear / graining from insufficient carcass temperature  
- Front push if the tyre never stabilises in the operating window  

**Tyre choice bias:**

- Prefer compounds that tolerate low temperature without tearing (not always the softest if you cannot maintain heat).  
- Use warmers per manufacturer (temp/time); avoid overheating on the blanket then cooling hard on track.

**Pressure bias:**

- **First:** Confirm you are **not above** the brand’s target **hot** window — **over-inflation is a common cold-tear contributor** (small contact patch, surface overheats vs carcass).  
- **Do not** drop hot pressure blindly to “chase grip” on a cold day.  
- If tearing persists after confirming pressure is **in** window and warmers are correct: small steps **up** in hot pressure (e.g. +0.5 to +1.0 psi) can reduce carcass flex for some setups — still **small steps, one change at a time**.

**Suspension bias** (goal: more compliance without wallow):

1. Slightly reduce compression  
2. Slightly increase rebound (small steps)  
3. Slightly reduce preload (more sag)  
4. Only then consider spring changes  

---

### Hot track / hot air

**Signals:**

- Ambient air temp ≥ ~28 °C  
- Track surface temp ≥ ~40 °C  

**Common risks:**

- Overheating / hot tear, greasy feel, rear spin  

**Tyre choice bias:**

- Harder or higher-temperature compound range as heat rises.  
- Avoid overly soft compound if pace + track temp will overheat it.

**Pressure bias:**

- If greasy or skatey: verify you are **not over** the top of the hot window.  
- Small changes only: **±0.5 psi** hot unless the KB pattern is clear.  
- Pressure **too low** can also overheat the carcass (flex); stay **in** the published window, not arbitrarily low.

**Suspension bias** (goal: support and controlled load):

1. Slightly increase compression  
2. Slightly reduce rebound if the tyre packs down between bumps  
3. Verify ride height / geometry before large damping swings  

---

### Wet / drying

**Signals:**

- Standing water, fully wet, or drying line with damp patches  

**Common risks:**

- Hydroplaning in deep water  
- **Rain tyre overheating** on a drying line (greasy, fast damage)  

**Tyre choice:**

- Full rain for standing water; intermediates only if rules allow.  

**Pressure bias:**

- **Do not** use a single “always lower for wet” rule — follow **brand** rain/slick tables when available.  
- **Bridgestone-style delta template** (adjustment vs your dry **target hot**, when you have no brand wet row):  
  - **Standing water:** about **+1.5 psi** vs dry target hot  
  - **Fully wet:** often **no change** vs wet baseline in that template  
  - **Drying track:** about **−1.5 psi** vs wet baseline — but **switch to slicks or manage pace** if the line is drying; rain tyres overheat quickly without water cooling.  

**Suspension bias:**

1. Slightly soften compression  
2. Slightly soften preload  
3. Small rebound changes only after grip is stable  

---

## Warmers — summary (check brand table first)

### Dry slicks (typical ranges from multiple brands)

- **Metzeler RACETEC RR / TD slick:** ~**50 min @ 80 °C** (176 °F), with published cold/hot bar pairs.  
- **Dunlop KR slick rows:** commonly **≥60 min** at **80 °C** front / **90–100 °C** rear depending on size (see Dunlop chart).  
- **Pirelli:** commonly **80 °C, 50 min** (Diablo Superbike family).  
- **Michelin:** dry slick warmers **mandatory** on some competition sheets; use Michelin’s stated temp/time for that product.

### Rain tyres

- Many manufacturers: **low** warmer temp, **short** time, or **no** warmers on rain rubber — follow the specific tyre bulletin. **Dunlop** non-DOT wet data states **not** recommending warmers on rain tyres; if optional elsewhere, use low temp / short duration only.

---

## Wear diagnosis & fix order

1. **Confirm hot pressure immediately after pit-in** (and cold baseline if establishing a map).  
2. **Move pressure toward the brand’s target hot/running window** (not arbitrary “feel”).  
3. **Adjust warmers** (temp/time) for surface temperature.  
4. **Re-evaluate compound** for conditions + pace.  
5. **Only then** suspension in small steps.  

**Detail and visuals:** `tire-wear-patterns-comprehensive.md`.

---

## Brand pressure anchors

All values are **examples** for common track sizes — **verify** against the current datasheet for **your** tyre code and rim width.

### Dunlop

- **Interpretation:** Published tables mix **target running**, **cold**, **after warmers**, and **minimum** — read the column headers for your exact model.  
- **Slick (example: KR106 120/70 R17 front):** target running about **2.3–2.6 bar** (~33–38 psi); cold setting ~**2.1 bar** (~30 psi); after warmers ~**2.4 bar** (~35 psi) per official pressure chart.  
- **Slick rear (example: KR108 190/55):** target running about **1.5–1.7 bar** (~22–25 psi) class; cold ~**1.2 bar** (~17 psi); minimum running ~**1.5 bar** (~22 psi) per chart.  
- **Wet (KR189 / KR389 family):** follow wet row; warmers often **optional**, low temp, short time if used.  
- **Warmers (slick chart):** e.g. **60 min** at **80 °C** front; rear sizes often **90–100 °C** depending on tyre.  

**Source:** Dunlop motorcycle race pressure / technical tables (user Knowledge uploads).

---

### Metzeler (2026 Technical Databook style)

**RACETEC RR SLICK (17″):**

| Position | Size examples | Rec. rim (in) | Cold (no warmers) | Hot (after warmers) | Warmers |
|----------|---------------|---------------|-------------------|---------------------|---------|
| Front | 120/70 R17, 125/70 R17 | 3.50 | 2.1–2.2 bar (30–32 psi) | 2.2–2.5 bar (32–36 psi) | ~50 min @ 80 °C |
| Rear | 180/60–200/65 R17 | 5.50–6.00 | 1.6–1.8 bar (23–26 psi) | 1.7–1.9 bar (25–28 psi) | same |

**RACETEC TD SLICK:** Same front pressures as RR slick; rear sizes include **180/55–200/55 R17** with same pressure bands (see datasheet).

**RACETEC RR (treaded):** Front e.g. **2.0–2.2 bar** cold → **2.0–2.4 bar** hot; rear **1.6–1.8** cold → **1.7–1.9** hot; warmers ~**50 min @ 80 °C** (typical rows).

**RACETEC RR RAIN:** Front **2.3 bar** (34 psi) cold → **2.4 bar** (35 psi) hot; rear **1.9→2.0 bar** (28→29 psi); warmers ~**30 min @ 50 °C**.

**Compounds (NHS slicks):** K0 super soft, K1 soft, K2 medium; **K3** on some road-legal RR lines = endurance-oriented.

**Source:** Metzeler Technical Databook 2026 (RACETEC sections).

---

### Pirelli

- **Diablo Superbike (typical published bands):**  
  - Front 120/70: cold **30–32 psi**, hot **32–36 psi**  
  - Rear 180/190/200: cold **22–26 psi**, hot **24–28 psi**  
- **Warmers:** commonly **80 °C, 50 minutes**  

**Source:** Pirelli Diablo Superbike documentation.

---

### Bridgestone

- **Race / track product detail (V02, V03, W01, CR11, supermoto, R11/V02/W01 compound-vs-track infographic):** `bridgestone-race-tyre-data-extract.md` — fitment, article numbers, warmers notes; **operating-range infographic** has **track temperature × track severity** per line (numeric bands only on the **graphic**, not in PDF text).
- **Wet/dry delta template** (vs your normal **dry target hot**, when no brand wet row):  
  - Standing water: **+1.5 psi**  
  - Fully wet: **no change** (template)  
  - Drying: **−1.5 psi**  

**Source:** Bridgestone track-day adjustment chart; 2026 Motorcycle Tire Data Book v1.1 (race section extract in KB).

---

### Michelin

- **General:** Warmers help reach operating pressure sooner; they **do not** replace the manufacturer’s **target** pressures for that tyre.  
- **Power Slick / competition slick (example sheet, 1000 cc class):**  
  - **Minimum cold:** **1.3 bar** (~18.9 psi)  
  - **Hot (e.g. after ~6 laps):** **1.5–1.7 bar** (~21.8–24.7 psi)  
  - Compound choice vs track temperature and rider level is **model-specific** — use the bulletin for Soft/Medium/Hard and rear “24” variants.  
- **Power Rain (if warmers used):** low blanket temps per Michelin (e.g. **30–50 °C** range on cold vs hot surface in some guides).  

**Source:** Michelin competition/track tyre technical sheets.

---

## Cold tear vs pressure — reconciliation

- **Cold tear** often correlates with the tyre **not** being in its thermal window **or** with **pressure too high** (surface overheats vs carcass).  
- **Always:** measure **hot pit-in**, compare to brand window, then adjust warmers/compound before large suspension changes.  
- **Cold day:** do not automatically bleed pressure down; if you are **below** window and tearing, you may need **more** pressure (small step) or a different compound / warmer strategy — see cold-track section above.

---

## How to apply in GPT (structured outputs)

**Inputs useful:** ambient and track surface temp, wet/dry/drying, surface abrasion, tyre brand/model/compound/size, **hot pit-in pressures**, pace level, session length.

**Output structure:**

1. Tyre choice / compound bias for conditions  
2. Starting pressure plan (cold + target hot) tied to brand table when known  
3. Warmer plan if slicks  
4. Troubleshooting order (pressure → warmers → compound → suspension)  
5. Link wear symptoms to `tire-wear-patterns-comprehensive.md`  
