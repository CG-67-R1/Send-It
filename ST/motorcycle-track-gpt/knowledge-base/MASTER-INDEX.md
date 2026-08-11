# Knowledge Base Master Index

Complete navigation guide for the motorcycle track GPT knowledge base.
Last updated: 2026-08-11

## Quick Navigation

- **Suspension brands & specs**: suspension/race-suspension-brands-kb.md
- **Suspension setup detail**: suspension/Motorcycle-Suspension-Technology-in-Detail.md
- **Tyre reference (race dry + rain)**: equipment/race-tyre-reference-kb.md
- **Tyre wear diagnosis**: equipment/tyre wear.txt
- **Chassis geometry**: chassis/geometry-calculations.md
- **Track coaching (all AU tracks)**: track-analysis/Track_Riding_KB_AllTracks_v1.md
- **Track-specific KB files**: track-analysis/KB_*.md
- **Riding techniques index**: riding-techniques/coaching-knowledge-base-index.md
- **Technique by improvement goal**: riding-techniques/technique-by-improvement.md
- **OEM suspension reference**: bike-specs/bike_setup_reference (3).txt

## File Index by Category

### Suspension
| File | Contents |
|------|----------|
| race-suspension-brands-kb.md | Öhlins, WP, Nitron, Bitubo, Andreani, YSS — race models, specs, spring rates, oil weights, sag reference. Monthly update. |
| Motorcycle-Suspension-Technology-in-Detail.md | Deep technical reference — damping theory, valving, geometry |
| Road Race Setup KB.txt | Session-format setup conversation log (historical reference) |
| swingarm-and-chain-dynamcs.md | Chain tension and swingarm geometry interaction |
| intructions.txt | GPT instruction template for suspension mode |
| ohlins-documentation/ | PDF manuals for specific Öhlins models |

### Tyres / Equipment
| File | Contents |
|------|----------|
| race-tyre-reference-kb.md | Pirelli, Bridgestone, Michelin, Dunlop, Metzeler, Avon, Continental — compounds, pressures (cold/hot), operating temps, rain tyre data. Monthly update. |
| tyre wear.txt | Visual tyre wear types — cold tear, hot tear, graining, edge wear; causes and fixes |
| ohlins_product_information_overview (3).txt | Öhlins product safety and general overview |

### Track Analysis
| File | Contents |
|------|----------|
| Track_Riding_KB_AllTracks_v1.md | Complete AU track coaching KB: 103 corner/section guides across 10 tracks |
| KB_Broadford_State_Motorcycle_Complex.md | Broadford corner-by-corner |
| KB_Mallala_Motorsport_Park.md | Mallala corner-by-corner |
| KB_McNamara_Park_Raceway_Mac_Park.md | Mac Park corner-by-corner |
| KB_Morgan_Park_Raceway_Circuit_K.md | Morgan Park corner-by-corner |
| KB_One_Raceway_Wakefield_Park.md | One Raceway / Wakefield Park corner-by-corner |
| KB_Phillip_Island_Grand_Prix_Circuit.md | Phillip Island corner-by-corner |
| KB_Queensland_Raceway_National_Circuit.md | Queensland Raceway corner-by-corner |
| KB_Sydney_Motorsport_Park_Gardner_GP_Circuit.md | SMP Gardner GP corner-by-corner |
| KB_The_Bend_Motorsport_Park_International_Circuit.md | The Bend International corner-by-corner |
| KB_Wanneroo_Raceway_Barbagallo.md | Wanneroo corner-by-corner |

### Riding Techniques
| File | Contents |
|------|----------|
| coaching-knowledge-base-index.md | Master technique index: technique categories, sources, improvement areas |
| coaching-index.md | Track-specific coaching index (cross-reference to AllTracks KB) |
| technique-by-improvement.md | Technique → improvement goal map |
| body-position.md | Body position stub (source: Motovudu) |
| braking-techniques.md | Braking stub |
| cornering-techniques.md | Cornering stub |
| overtaking-techniques.md | Overtaking stub |
| Motovudu-2-Dark-Art-of-Performance.md | Full source text — Simon Crafar; internal reference only, not for upload |
| track-coach.txt | Video transcript source — internal reference only, not for upload |

### Bike Specs / Chassis
| File | Contents |
|------|----------|
| bike_setup_reference (3).txt | OEM spec reference for common race bikes |
| this is information from Pirrelli a.txt | Pirelli compound image interpretation (historical) |
| geometry-calculations.md | Rake, trail, wheelbase, pitch angle maths |

## Update Schedule

| File | Update cadence | Method |
|------|----------------|--------|
| race-suspension-brands-kb.md | Monthly | Hermes cron — web research + diff |
| race-tyre-reference-kb.md | Monthly | Hermes cron — web research + pressure table check |
| Track_Riding_KB_AllTracks_v1.md | On-demand | Manual — track walk / coaching session input |
| KB_*.md track files | On-demand | Manual |

See docs/hermes/CRON_SETUP.md for cron configuration.
