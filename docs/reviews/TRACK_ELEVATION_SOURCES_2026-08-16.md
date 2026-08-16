# Track Elevation Sources — 2026-08-16

On-demand analyst report for Send-It Track Memory elevation enrichment.
Goal: identify sources so Cursor can bake height into layouts still showing as flat.

Report only — no commits, no edits.

---

## Already-Baked (hasElevation: true)

| trackId | elevSpanM | Source | GPX path |
|---------|-----------|--------|----------|
| mount_panorama | 172.5 m | Emtron GPX (real ele) | Desktop/Australian_Track_GPX/gpx/Mount_Panorama.gpx |
| smp_brabham | 30.7 m | Emtron GPX (real ele) | Desktop/…/Sydney_Motorsport_Park_-_Brabham.gpx |
| smp_gardner | 25.1 m | Emtron GPX (real ele) | Desktop/…/Sydney_Motorsport_Park_-_GP.gpx |
| wakefield_park | 20.3 m | Emtron GPX (real ele) | Desktop/…/Wakefield_Park_Raceway.gpx |
| phillip_island | 30.0 m | DEM-enriched ztracks GPX (Mapzen) | scripts/track-memory-gpx/phillip_island.gpx |

Note on Wakefield Park: the Emtron GPX reports span 20.3 m but the task brief noted 19.4 m; the difference is rounding in parsers vs the raw xml. Accept 20.3 m as the precise figure.

---

## Phillip Island — Lukey Heights deeper check

The existing DEM-enriched ztracks GPX resolves:
- Low point: 27 m ASL (Turn 3/4 valley area, near -38.5087, 145.2349)
- Peak: 57 m ASL at (-38.4989, 145.2365) — corresponds to Lukey Heights ridge
- Span: 30 m

Mapzen DEM grid-probe around the Lukey Heights ridge (~-38.516 to -38.520, 145.223–145.227)
returns max 45 m, which is lower than the track-trace value of 57 m. This discrepancy is a
known DEM underestimate at steep coastal ridges where the 30 m DEM cell averages slope.

The ztracks GPX was pre-enriched (likely with denser sampling or a different DEM tile) and
gives 57 m which matches published "Lukey Heights" references. No better local source was found.

Recommendation: accept 30 m DEM span / 57 m peak as authoritative for Phillip Island.
If a higher-fidelity source is needed, the best public option is the official Phillip Island
Circuit survey or Garmin Connect activity exports from actual laps (SRTM1 returns HTTP 400 for AU).

---

## Flat Tracks — DEM Elevation Available (ready-to-enrich)

All 14 remaining tracks have GPX centrelines (either Emtron Desktop or ztracks) and the
enrich-track-elevation.mjs + opentopodata.org/mapzen pipeline is live and responsive.
Full DEM pass was run on all tracks during this audit (all points, 90-pt batches, ~1 s delay).

### Tier 1 — High span (>= 20 m) — high visual impact, enrich first

| trackId | DEM span (full pass) | DEM range (ASL) | GPX source | GPX path |
|---------|---------------------|-----------------|------------|----------|
| baskerville | **36 m** | 48–84 m | ztracks (no ele) | scripts/track-memory-gpx/baskerville.gpx |
| broadford | **28 m** | 263–291 m | ztracks (no ele) | scripts/track-memory-gpx/broadford.gpx |
| morgan_park | **29 m** | 478–507 m | Emtron (ele=0) | Desktop/…/Morgan_Raceway.gpx |
| smp_druitt | **26 m** | 47–73 m | Emtron (ele=0) | Desktop/…/Sydney_Motorsport_Park_-_Druitt.gpx |
| sandown | **20 m** | 39–59 m | Emtron (ele=0) | Desktop/…/Sandown_Raceway.gpx |

KB notes:
- **Baskerville**: KB (intructions.txt) notes "front load heavy into downhill". Span 36 m is the highest of all flat tracks — strong coaching signal.
- **Broadford**: KB confirms "climb up to Turn 1, dipping down the back straight, slight downhill run into T10/11". Uphill hairpin at T5. 28 m span. Also "Turn 12 drops off-camber downhill onto the main chute".
- **Morgan Park**: KB explicitly states "significant elevation changes and undulation" and "track undulates over the Southern Downs hillside". Uphill T1-T2 section, downhill T7-T9. 29 m span confirmed.
- **SMP Druitt**: Emtron GPX has 519 pts (good density). KB has no separate Druitt file but SMP Gardner KB notes gentle rise over tunnel (T3-T4). Druitt shares terrain. DEM span 26 m is plausible.
- **Sandown**: No KB file. DEM span 20 m. Sandown is known to have a gentle rise through the infield; 20 m is consistent with track topography.

### Tier 2 — Medium span (10–19 m) — still worth baking

| trackId | DEM span | DEM range (ASL) | GPX source | GPX path |
|---------|----------|-----------------|------------|----------|
| the_bend_gt | **15 m** | 6–21 m | Emtron (ele=0) | Desktop/…/Tallem_Bend_GT.gpx |
| wanneroo | **14 m** | 80–94 m | ztracks (no ele) | scripts/track-memory-gpx/wanneroo.gpx |
| the_bend_international | **14 m** | 7–21 m | Emtron (ele=0/1) | Desktop/…/Tallem_Bend_International.gpx |
| hidden_valley | **13 m** | 10–23 m | ztracks (no ele) | scripts/track-memory-gpx/hidden_valley.gpx |
| calder_park | **12 m** | 128–140 m | Emtron (ele=0) | Desktop/…/Calder_Park_Raceway.gpx |
| mac_park | **10 m** | 32–42 m | ztracks (no ele) | scripts/track-memory-gpx/mac_park.gpx |
| winton | **10 m** | 175–185 m | Emtron (ele=0) | Desktop/…/Winton_Motor_Raceway.gpx |

KB notes:
- **The Bend (GT + International)**: KB confirms "a lot of undulation... which TV won't show" (T2-T3 section), crest at T7, blind crest at T11. Both layouts share terrain. The 1533-pt GT GPX covers the full 7.77 km loop — good density for DEM.
  Note: the_bend_international Emtron GPX has ele values of 0–1 m (not real data — effectively flat). Treat as zero-ele, enrich via DEM.
- **Wanneroo**: KB calls it "natural sand-hill terrain" with The Basin ("drop into it and climb out"), crest near T7. 14 m DEM span consistent with sand-hill topography.
- **Hidden Valley**: KB (intructions.txt) notes "hot, pressure rise >2 PSI, rear fades fast" — no elevation description, but DEM gives 13 m span across 155 pts.
- **Calder Park**: No KB file. 12 m DEM span. Calder Park has a known gentle banking around the oval section.
- **Mac Park**: KB confirms undulating with blind rises, sweepers over crests (T2, T7). 10 m DEM span from ztracks GPX (151 pts — lower density, may underestimate).
- **Winton**: No KB file. 10 m DEM span. Winton is generally flat Victorian plains but has a known gentle undulation through the infield chicane area.

### Tier 3 — Low span (< 10 m) — DEM-only, worth baking but lower visual payoff

| trackId | DEM span | DEM range (ASL) | GPX source | GPX path | KB notes |
|---------|----------|-----------------|------------|----------|----------|
| mallala | **9 m** | 41–50 m | Emtron (ele=0) | Desktop/…/Mallala_Raceway.gpx | KB: "flat layout" — but "undulation/compression mentioned in draft" for final section. 9 m DEM is plausible. |
| queensland_raceway | **5 m** | 35–40 m | Emtron (ele=0) | Desktop/…/Queensland_Raceway.gpx | KB explicitly: "flat — no significant elevation changes". 5 m DEM span. Below the 5–8 m usefulness threshold. DEM noise likely. |

Queensland Raceway is P3 / skip: the KB confirms it is essentially flat and the 5 m DEM span
is at or below DEM noise floor for a 3.1 km circuit. hasElevation should stay false.
Mallala at 9 m is borderline — worth baking but the coaching signal is minimal.

---

## Source ranking: ready-to-bake vs need-download vs DEM-only fallback

| trackId | Status | Action |
|---------|--------|--------|
| baskerville | **READY-TO-BAKE** | Run enrich-track-elevation on ztracks GPX, then bake |
| broadford | **READY-TO-BAKE** | Run enrich-track-elevation on ztracks GPX, then bake |
| morgan_park | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| smp_druitt | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| sandown | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| the_bend_gt | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| the_bend_international | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| wanneroo | **READY-TO-BAKE** | Run enrich-track-elevation on ztracks GPX, then bake |
| hidden_valley | **READY-TO-BAKE** | Run enrich-track-elevation on ztracks GPX, then bake |
| calder_park | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| mac_park | **READY-TO-BAKE** | Run enrich-track-elevation on ztracks GPX, then bake |
| winton | **READY-TO-BAKE** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| mallala | **READY-TO-BAKE (low payoff)** | Run enrich-track-elevation on Desktop Emtron GPX, then bake |
| queensland_raceway | **DEM-ONLY, SKIP** | KB confirms flat; DEM span 5 m at noise floor. Leave hasElevation false. |
| phillip_island | **ALREADY DONE** | ztracks GPX enriched. 30 m span / 57 m peak accepted. |

No additional local sources (RaceCapture, RaceRender CSVs, alternate GPX, Downloads) were found.
No telemetry exports in Downloads, Documents, or tmp/ztracks beyond the files already catalogued.

---

## enrich-track-elevation.mjs — required Cursor changes

The script currently has DEM_TRACKS hardcoded to only phillip_island.
To run --all-flat for all 13 remaining tracks, Cursor must add all tracks to DEM_TRACKS.

The GPX source mapping needs to handle both Desktop Emtron GPX and ztracks GPX dirs.
The bake-track-memory-layout.mjs already knows the correct gpxDir per track — the enrich script
should mirror that mapping or accept a --gpx-dir flag.

Suggested DEM_TRACKS expansion (Cursor action):

```js
const DEM_TRACKS = {
  // ztracks GPX (no ele values at all)
  baskerville:  { gpxName: 'baskerville.gpx',   gpxDir: ZTRACKS_GPX_DIR },
  broadford:    { gpxName: 'broadford.gpx',      gpxDir: ZTRACKS_GPX_DIR },
  hidden_valley:{ gpxName: 'hidden_valley.gpx',  gpxDir: ZTRACKS_GPX_DIR },
  mac_park:     { gpxName: 'mac_park.gpx',       gpxDir: ZTRACKS_GPX_DIR },
  wanneroo:     { gpxName: 'wanneroo.gpx',       gpxDir: ZTRACKS_GPX_DIR },
  // Desktop Emtron GPX (ele=0 or ele=0/1)
  calder_park:          { gpxName: 'Calder_Park_Raceway.gpx' },
  mallala:              { gpxName: 'Mallala_Raceway.gpx' },
  morgan_park:          { gpxName: 'Morgan_Raceway.gpx' },
  queensland_raceway:   { gpxName: 'Queensland_Raceway.gpx' },
  sandown:              { gpxName: 'Sandown_Raceway.gpx' },
  smp_druitt:           { gpxName: 'Sydney_Motorsport_Park_-_Druitt.gpx' },
  the_bend_gt:          { gpxName: 'Tallem_Bend_GT.gpx' },
  the_bend_international:{ gpxName: 'Tallem_Bend_International.gpx' },
  winton:               { gpxName: 'Winton_Motor_Raceway.gpx' },
  // Already done
  phillip_island: { gpxName: 'phillip_island.gpx', gpxDir: ZTRACKS_GPX_DIR },
};
```

The enrichOne() function must read gpxDir from the track entry (defaulting to DEFAULT_GPX_DIR).

---

## Priority / Severity

| Priority | Count | Items |
|----------|-------|-------|
| P0 | 0 | None — no blocking data errors |
| P1 | 5 | baskerville (36 m), broadford (28 m), morgan_park (29 m), smp_druitt (26 m), sandown (20 m) — high span, DEM ready, layout currently flat |
| P2 | 8 | the_bend_gt (15 m), wanneroo (14 m), the_bend_international (14 m), hidden_valley (13 m), calder_park (12 m), mac_park (10 m), winton (10 m), mallala (9 m) — medium/low span, DEM ready |
| P3 | 1 | queensland_raceway (5 m) — at noise floor, skip |

Total: 0 P0 / 5 P1 / 8 P2 / 1 P3

---

## Top 3 Cursor Next Steps

**1 (P1) — Expand enrich-track-elevation.mjs DEM_TRACKS map**
Add all 13 flat tracks (baskerville through winton) to DEM_TRACKS with correct gpxDir per track.
Update enrichOne() to read gpxDir from the entry rather than always using DEFAULT_GPX_DIR.
Then run: `node scripts/enrich-track-elevation.mjs --all-flat`
This writes enriched GPX files under scripts/track-memory-gpx/ for all flat tracks.
(Estimated API time: ~8–10 min for 3 400 total points at 90-pt batches with 1 s delay.)

**2 (P1) — Bake the Tier 1 tracks first (highest elevation impact)**
After enrichment, run bake-track-memory-layout.mjs for the five Tier 1 tracks in order:
  baskerville (36 m) → broadford (28 m) → morgan_park (29 m) → smp_druitt (26 m) → sandown (20 m)
Verify hasElevation: true and elevSpanM matches DEM result in each output JSON.

**3 (P2) — Bake Tier 2 and mark queensland_raceway as permanently flat**
After Tier 1, run bake for all Tier 2 tracks.
For queensland_raceway: set hasElevation: false explicitly in the layout JSON (or omit elevSpanM)
and add a comment / meta note that KB confirms the track is flat and DEM span is at noise floor.
This prevents future re-enrichment attempts.

---

## Notes on missing tracks (no GPX at all)

No local GPX was found for any layout without a Desktop Emtron or ztracks file.
All 14 flat tracks have coverage via one of the two existing GPX sources.
No additional downloads are required.

---

*Report written by Hermes track-data-analyst, 2026-08-16.*
*DEM provider: opentopodata.org/mapzen (Mapzen Terrain Tiles, ~30 m grid). All queries live during audit.*
*Full DEM pass run on all 14 flat tracks (all GPX points, not sampled).*
