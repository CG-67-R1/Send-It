# Tyre wear — photo recognition atlas (text only)

**Purpose:** Interpret a **user-uploaded photo** of a motorcycle track/race tyre.  
**Companion:** `tire-wear-patterns-comprehensive.md` (causes + fix order).  
**Rule:** No third-party images in Knowledge. Descriptors only. Never invent wear that is not visible in the user’s photo.

**Version:** 1.1 · **Updated:** 2026-08-11  
**Descriptor sources:** Original spatial atlas + paddock diagnostic consensus (pressure/band-width rules, rubber-ball sizing, healed-tear residue). No third-party images stored or uploaded.

---

## Photo diagnosis protocol (run this first)

When the user uploads a tyre image (or describes wear from a photo):

### A. Intake (ask only what the image does not show)

Batch ≤4 missing items:

1. **Front or rear?** (must know)
2. **Brand / model / compound** if advising pressure or compound change
3. **Hot pit-in pressure** (immediate after session) for any tear diagnosis
4. Track temp / session length / warmers if thermal cause is ambiguous

If the photo is unclear, ask for a second shot (see capture checklist) — do **not** guess the pattern at High confidence.

### B. Observe in this order (spatial before texture)

Ignore colour overlays, arrows, or captions drawn on the photo unless the user confirms they are accurate.

1. **Orientation** — Which side is centreline vs shoulder vs extreme edge? Use rim/brake/hub if visible.
2. **Zone** — Where is the damage relative to lean-angle zones?
   - **Centre strip** — upright / drive
   - **Mid-shoulder** — moderate lean
   - **Outer third / edge** — high lean
3. **Band geometry**
   - Width (narrow finger-width vs broad third-of-tyre)
   - Continuity around circumference (full ring vs intermittent patches)
   - Width uniformity as you follow the band
4. **Surface morphology** (only after zone + band)
   - Undercut / peelable flaps vs shallow smear
   - Arc toward centre vs parallel circumferential ridges
   - Groove-edge lips (leading vs trailing)
   - Sheen / blue-green bloom (oils — not tearing)
   - **Edge rubber balls / slag** size and stringing (see § Rubber balls)
5. **Classify** → cite this file → apply fix order from companion guide.

### C. Anti-confusion rule (critical)

**Do not** map “rough / shredded / rippled rubber” → cold tear by default.  
Many patterns look shredded in a phone photo. **Band location + width + continuity + depth** decide the class. Texture is a tie-breaker.

**Cold vs hot — band-width rule (strong discriminator):**

| Cue | Cold tear (typical) | Hot tear (typical) |
|-----|---------------------|--------------------|
| Rough/affected band | Often **narrower** | Often **wider / more diffuse** |
| Tear depth | **Deep**; nail lifts flaps | **Shallow**; nail won’t undercut |
| Colloquial look | “Rip into good rubber” / tweezers-pulled half-moons | “Melted / balled-up” surface rubber |
| Contact-patch story | Small patch (often high pressure) | Large flexing patch (often low pressure) |

**Critical hot-tear trap:** A tear band can be obvious **even when the surrounding surface still looks smooth to the touch**. Smooth ≠ healthy pressure. Class by band + depth + ball size, not “looks smooth overall.”

### D. Confidence

| Evidence | Confidence |
|----------|------------|
| Clear zone + band geometry + morphology; front/rear known | High–Medium |
| One tight close-up; zone or circumference unknown | Medium–Low — ask for wider / second angle |
| Ambiguous depth (cold vs hot tear) | Ask fingernail test; Medium until answered |
| Blue sheen only, no tear structure | High that it is discoloration, not a tear class |

---

## Capture checklist (tell the rider)

Ideal set (2–3 photos beats one macro):

1. **Overview** — whole tyre from ~45°, centre → shoulder → edge visible; label Front/Rear.
2. **Band follow** — same tyre, rotated ~90–180°, to show if damage is continuous or patchy.
3. **Macro** — only if diagnosing groove-edge / fingernail depth: one groove or one tear flap filling the frame, sharp focus, daylight or even paddock light (avoid flash glare).

Also note: cold or hot when photographed (cooled tyres look different; blue oils appear after cooling).

---

## Lean-angle zone map (photo vocabulary)

Describe findings with these terms so diagnosis stays consistent:

| Zone ID | Where on the tyre | Typical load |
|---------|-------------------|--------------|
| Z0 | Centre crown | Straight, drive, braking upright |
| Z1 | Inner shoulder (centre → mid) | Light lean / transition |
| Z2 | Mid-shoulder | Typical track lean |
| Z3 | Outer third / extreme edge | Max lean |

State: `Front|Rear · Z0–Z3 · continuous|intermittent · narrow|wide · deep-undercut|shallow-smear|fine-grain|raised-groove-lip|blue-bloom|ball-size-mm`

---

## Rubber balls / slag / edge aggregation (photo metric)

On slicks and soft track rubber, look at the **extreme edge (Z3)** for attached rubber crumbs:

| Ball / aggregation look | Interpretation |
|-------------------------|----------------|
| Small crumbs ~**2–3 mm**, modest edge line | Often normal worked tyre / acceptable heat |
| Larger balls ~**3–5 mm**, rubber **stringing** together, heavy edge heap | Classic **too hot** signal — raise hot pressure in small steps and/or check compound |
| Foreign track marbles stuck randomly on face | **Pickup** — clean; not the same as tear class |

Slag can remain attached if the bike never spun hard enough to throw it (pit-in photos often show edge balls still stuck). Large balls support overheating even when tear morphology is subtle.

---

## Pattern visual signatures

Each pattern: **must-see spatial cues**, **texture cues**, **lookalikes**, **confirm questions**.

### 1. Cold tear

**Must-see**

- Damage band usually on **drive / loaded shoulder** (often Z1–Z2 on rear; can appear where that tyre works hardest).
- Band often **narrower** than hot-tear damage for the same tyre.
- Tears look **deep and undercut** — raised flaps or “fingernail / half-moon” lips; as if tweezers pulled rubber out.
- Adjacent rubber often still relatively intact → sharp contrast between torn band and smoother zones.
- Extreme edge (Z3) may still show an unused or lightly used strip outside the torn band.

**Texture**

- Chunky, jagged, peelable ridges; depth into the surface is obvious in side light.
- Sharp / crusty edges — not melted-rounded.
- May look “scaly” or “washboard” but with **undercut edges**, not just fine sand grain.

**Lookalikes**

- Hot tear (wider, shallower, smeared/balled; often arcs inward).
- Suspension tear (width varies or skips around the tyre).
- Geometry tear on front (verify pressures in window first).

**Confirm**

- “Can you get a fingernail under a flap and lift rubber?” → Yes supports cold tear.
- Hot pressure vs brand window (often high / small patch) — measure before bleeding.

---

### 2. Hot tear / overheating tear

**Must-see**

- Affected area **wider / more diffuse** than classic cold tear; damage looks **worked and soft**.
- Tears **shallower**; hard to undercut with a nail.
- Often show **arcs or trails that run toward the centre (Z0)** of the tyre (centrifugal throw of softened surface rubber).
- Rear may show a **rough band on both lean sides** when pressure is too low.
- **May tear while the face still looks smooth** — do not require melted texture to call hot tear.
- Edge **rubber balls oversized (≈3–5 mm)** and/or stringing strongly support overheating.

**Texture**

- Smeared, melted, “galled,” thinly stripped, or “melted balled-up” crumbs — not thick peelable chunks.
- After pressure is corrected, earlier hot tear may leave **dark residue / discoloration** while the grain “heals” toward fine even wear — residue ≠ active new tear.

**Lookalikes**

- Cold tear (deep flaps, narrower band).
- Soft-compound overload / blister precursor (raised bubbles → blistering class).
- Rain tyre cooked on dry line (glossy smear — see wet/drying companion).
- Abrasive track “1000-grit” finish (surface looks harsh but may be track aggregate, not pressure — ask venue/surface).

**Confirm**

- Nail under flaps? Usually no / barely.
- Hot pressure often low **or** compound too soft for pace/temp — do not assume only pressure.
- On cool/slow sessions, hot tear can still appear if pressure is set for hotter/faster conditions — pressure may need to be slightly higher than “slow day” intuition.

---

### 3. Suspension-related wear

**Must-see (prefer these over texture)**

- Tear **width is not uniform** as you follow the circumference — thick then thin then thick.
- **Or** damage is **intermittent**: torn sector → clean sector → torn again (not a continuous ring).
- May coexist with pressure-like texture; spatial irregularity is the tell.

**Texture**

- Can look like cold or hot tear locally — ignore that for class until continuity/width is checked.

**Lookalikes**

- Pressure tear that happens to be photographed on one dirty patch only — need second angle around the tyre.

**Confirm**

- Second photo around the tyre.
- Spring rate suitability for rider weight; rebound/compression history.

**Subtype — raised tread-block / groove edge**

- Macro: rubber **lip raised on one side of a groove**, other side flatter.
- **Leading-edge** raised lip (edge that meets road first in rotation) → rebound often **too slow** (tyre stays planted / digs).
- **Trailing-edge** raised lip → rebound often **too fast** (tyre skips / tears on unload).
- Only diagnose this from a sharp groove macro; ask for one if overview is soft.

---

### 4. Geometry — not enough weight on front

**Must-see**

- Almost always **front** tyre.
- **Narrow** tear band ≈ **5–10 mm** wide (finger-width), typically in **Z1–Z2** (midway centre→edge), **not** the whole outer third.
- Band usually **uniform and continuous** around the circumference.
- Extreme edge (Z3) may look under-used relative to the torn mid band (front pushing/dragging rather than rolling loaded).

**Texture**

- Can resemble a thin hot-tear strip — class by **narrow mid-band + front + continuity**, not by shred wording.

**Lookalikes**

- Hot tear on rear (wider, arc to centre).
- Too-much-front geometry (outer third, wide).
- Cold tear (deep flaps) — if hot pressures were in window and front mid-band is narrow/continuous, prefer geometry over “more cold tear.”

**Confirm**

- Front vs rear.
- Approximate band width vs tyre half-width.
- Geometry/ride-height only after pressure + compound ruled in window.

**Authority note:** Some web mirrors reverse the two geometry symptoms. Prefer: **light front = narrow mid band**; **heavy front = outer third**. Do not invent from conflicting blogs.

---

### 5. Geometry — too much weight on front

**Must-see**

- Almost always **front** tyre.
- Damage dominates the **outer third (Z3)** — large affected area.
- Inner boundary of the bad wear (edge toward centre) often follows a **clean circumferential line**.
- Suggests ploughing/scrub at lean rather than a thin mid-band.

**Texture**

- Heavy scrub / tear on outer third; centre may look healthier.

**Lookalikes**

- Aggressive lean + soft compound edge tear (check pressure/compound first).
- Not-enough-front (narrow mid band only).
- Soft front end amplifying forward weight (same photo class; setup differs).

**Confirm**

- Is wear mostly outer third or a thin mid strip?
- Soft front end + forward weight bias history.
- Hot pressures already in brand window (otherwise fix pressure first).

---

### 6. Graining

**Must-see**

- Surface covered in **rolled pills / small rubber balls** or a “rolled dough” skin — rubber moved, not deep-ripped flaps.
- Often early session / cool surface / sliding before full heat.

**Lookalikes**

- Track pickup/marbles stuck on (foreign blobs — see pickup).
- Cold tear (deep undercut).

---

### 7. Blistering

**Must-see**

- **Raised bubbles**, blisters, or local skin separation; may burst into craters.
- Localised heat pockets, not a uniform circumferential tear band.

---

### 8. Cupping / scalloping (often front)

**Must-see**

- Alternating **high/low cups** around the circumference — wavy height, lump-like, not just surface grain.
- Best confirmed by **hand**: run palm around tyre — feel repeating dips/humps.
- Photo: side light helps; look for scalloped silhouette along the tread path.
- Rider may report vibration / roar at speed.

**Causes bias:** worn/poor damping, imbalance, pressure extremes — mechanical inspection before storytelling.

---

### 9. Feathering / sawtooth (treaded)

**Must-see**

- Groove or block edges **smooth one direction, sharp/stepped the other** (fingernail test along the block).
- Raised lip on one groove edge vs flatter opposite edge.
- Common on treaded fronts from brake + turn-in scrub; rear can show from drive torque / chain alignment.

---

### 10. Chunking

**Must-see**

- Missing rubber with **sharp voids / craters**; local, abrupt loss of material.
- Heat + abrasion / bond failure — compound and pressure first.

---

### 11. Pickup / marbling

**Must-see**

- Discrete **blobs or crumbs stuck onto** the surface (track rubber), not continuous tear structure of the carcass itself.
- Clean vs wear: pickup sits proud; underlying grain may still be fine.
- Distinct from edge slag sizing in § Rubber balls (pickup can be anywhere; slag metric is edge aggregation size).

---

### 12. Flat-spot / squared centre (Z0)

**Must-see**

- Centre strip more worn or **squared-off** vs shoulders; photo shows flatter crown silhouette if angle allows.
- Often a **lighter grey / dusty** centre band vs darker unused shoulders; sharp transition to curved shoulders.
- Tread grooves may vanish in the centre strip while shoulders still show depth (street/touring) OR track tyre shows flat Z0 plateau from high hot pressure / straight miles / TC.

**Fix bias:** pressure toward window; compound; gearing/throttle; not geometry first.

---

### 13. Rain tyre overheating on drying line

**Must-see**

- Rain/intermediate carcass; **glossy, greasy, polished smear**, often asymmetric where dry line loaded the tyre.
- Rapid onset story from rider.

**Action bias:** tyre choice / leave dry line — not suspension first. See pressure companion wet/drying logic.

---

### 14. Blue / green / purple discoloration

**Must-see**

- **Iridescent blue–green–purple bloom** or oily sheen after cooling — oils migrated to surface.
- May sit on otherwise fine grain; **not** itself a tear class.
- Signal of heat cycles used; performance may fade over many cycles — do not declare tyre “dead” from colour alone.

**Lookalikes**

- Wet glare / flash reflection — ask if colour remains in shade after cool-down.

---

### 15. Good / healthy wear (“beach tide”)

**Must-see**

- Even, **fine directional grain** across the used lean zones — like sand after the tide, subtle and uniform.
- No deep undercut flaps, no melted smear arcs, no intermittent shredded sectors.
- Edge use matches rider lean; no isolated mid-band disaster on the front.

**Note:** Racers may still trade life for pace; “good longevity wear” ≠ maximum grip setup.

---

## Decision tree (photo → class)

```
1. Blue/iridescent bloom only, no tear structure?
   → Discoloration (heat-cycle oils). Not a tear fix.

2. Fine even grain, no deep flaps / smear arcs / intermittent shred?
   → Good wear (or early mild use). Hold; log pressures.

3. Front tyre + narrow (~5–10 mm) continuous mid-shoulder band (Z1–Z2)?
   → Geometry: not enough front weight (after pressure window check).

4. Front tyre + wide outer-third (Z3) wear with clean circumferential inner edge?
   → Geometry: too much front weight (after pressure/compound).

5. Tear width varies OR torn/clean/torn around circumference?
   → Suspension-related. If groove lip raised one side → rebound hint.

6. Deep undercut / fingernail-liftable flaps, **narrower** band, sharp contrast?
   → Cold tear class → pressure/temp window first.

7. Wider/shallow smear, arcs toward centre, oversized edge balls (~3–5 mm), or tear band despite smooth face?
   → Hot tear / overheat class → pressure + compound + spin.

8. Pills / bubbles / cups / sawtooth / chunks / stuck marbles?
   → Graining / blistering / cupping / feathering / chunking / pickup.

9. Still unclear → ask Front/Rear, second circumference shot, nail test, hot pressure, ball size estimate.
   Confidence: Low–Medium. No numeric setup leap.
```

---

## Context confounders (do not mis-class)

- **Circuit direction asymmetry:** Clockwise tracks can wear one shoulder harder — not automatically suspension/geometry.
- **Abrasive / new track mix:** Surface can look “1000-grit” harsh without classic tear morphology — ask venue.
- **Healed hot tear residue:** Dark stain after pressure fix with improving grain — history, not necessarily active tear.
- **Conflicting geometry blogs:** Keep light-front = narrow mid band; heavy-front = outer third.
- **No Creative Commons labeled motorcycle cold/hot tear atlas** found suitable for Knowledge upload — text descriptors remain the upload artifact.

---

## Output template (when diagnosing from photo)

Use Setup format; one primary class:

1. **Seen:** `Front|Rear · zones · band geometry · morphology` (facts from image only)
2. **Class:** pattern name + confidence
3. **Why not lookalikes:** one line
4. **Next:** fix priority step 1 (usually hot pressure vs brand window) — cite companion
5. **Need:** missing photo or data (if any)

Cite: `Source: tyre-wear-photo-recognition.md — <pattern>`  
Fixes: `Source: tire-wear-patterns-comprehensive.md — <pattern>`

---

## What never to do

- Upload or rely on third-party reference photos in Knowledge.
- Invent tear depth, circumference continuity, or front/rear if not stated/visible.
- Jump to suspension/geometry before pressure + thermal/compound context (fix priority).
- Treat blue oils as proof the tyre is finished.
- Equate any roughness with cold tear.

---

**End of atlas**
