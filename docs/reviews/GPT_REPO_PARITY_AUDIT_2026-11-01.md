# GPT → Repo Parity Audit — 2026-11-01

**API:** https://send-it-ke7r.onrender.com  
**GPT reference:** [Trackday Rider AI](https://chatgpt.com/g/g-67d6286ffa8c819197902afc89091eeb-trackday-rider-ai)  
**Note:** Live Custom GPT file list is not API-accessible. Pass 1 inventories the **repo mirror** of GPT knowledge plus code prompts.

## Pass 1 — Inventory

### Instruction sections (repo)

| ID | Section | Location | Used by |
|----|---------|----------|--------|
| prompt:coach_system | COACH_SYSTEM | api/roadraceAi.js | Coach chat |
| prompt:bikesetup_system | BIKESETUP_SYSTEM | api/roadraceAi.js | Bike Setup chat |
| prompt:ask_system | ASK_SYSTEM | api/roadraceAi.js | Q&A Ask |
| prompt:shared_rules | SHARED_RULES | api/roadraceAi.js | Coach, Bike Setup |
| faq:global_principles | global_principles | api/data/rider_ai_faqs.json | Coach, Bike Setup |
| faq:novice_guidelines | novice_guidelines | api/data/rider_ai_faqs.json | Coach, Bike Setup |
| gpt:legacy_url | TRACKDAY_RIDER_AI_URL | app/constants/api.ts | None (unused) |

### GPT mirror / knowledge files

| Asset | Path | Count / size |
|-------|------|-------------|
| Rider AI Coach + Setup FAQ export (schema v2) | api/data/rider_ai_faqs.json | coach=20, bikesetup=20 |
| Q&A core JSON | Q&A/*.json (core) | 5 files |
| PDF-derived JSON | Q&A/*.json | 17 total, 16 usable, **1 empty** |

**Empty PDF scrapes (content not in app):**
- `performanceridingtechniques_Andy_Abottts.json`

**Usable PDF-derived files:**
- `Fast women _ pioneering Australian motorcyclists -- Sally-Anne Fowles.json` — 194766 chars, 0 qa pairs
- `Grand Prix Motorcycle Racers _ The American Heroes -- Norman L_ DeWitt .json` — 566744 chars, 0 qa pairs
- `Journal of Sports Sciences_load on riders of top-level.json` — 38358 chars, 0 qa pairs
- `Long Live Motorcycle Racing.json` — 20329 chars, 0 qa pairs
- `MoMS-2026-road-historic.json` — 259175 chars, 9 qa pairs
- `MotoGP source book _ sixty years of world championship .json` — 735914 chars, 0 qa pairs
- `MotoGP source book _ sixty years of world championship.json` — 735914 chars, 0 qa pairs
- `Motorcycle Grand Prix Racing.json` — 39029 chars, 0 qa pairs
- `Pushing The Limits_ Casey Stoner Autobiography.json` — 476126 chars, 0 qa pairs
- `Speed at the TT Races _ Faster and Faster -- David Wright.json` — 742856 chars, 0 qa pairs
- `Superbike (Motorcycle Racing_ the Fast Track) -- by Jim Mezzanotte.json` — 12557 chars, 0 qa pairs
- `The fast stuff _ twenty years of top bike racing tales from -- Oxley, Mat.json` — 987950 chars, 1 qa pairs
- `The Isle of Man TT Races _ Motorcycling, Society and -- Simon Vaukins.json` — 597765 chars, 1 qa pairs
- `Valentino Rossi _ motogenius -- Oxley, Mat.json` — 265277 chars, 0 qa pairs
- `Valentino Rossi_ Portrait Of A Speed God.json` — 153778 chars, 0 qa pairs
- `World Superbikes_ The First 20 Years .json` — 679954 chars, 0 qa pairs

## Pass 2 — Map (GPT item → repo → surfaces)

| GPT / knowledge item | Canonical ID | Repo path | Coach | Ask | Setup | Status | Gap |
|----------------------|--------------|-----------|:-----:|:---:|:-----:|--------|-----|
| COACH_SYSTEM | prompt:coach_system | api/roadraceAi.js | ✓ |  |  | OK |  |
| BIKESETUP_SYSTEM | prompt:bikesetup_system | api/roadraceAi.js |  |  | ✓ | OK |  |
| ASK_SYSTEM | prompt:ask_system | api/roadraceAi.js |  | ✓ |  | OK |  |
| SHARED_RULES | prompt:shared_rules | api/roadraceAi.js | ✓ |  | ✓ | OK |  |
| global_principles | faq:global_principles | api/data/rider_ai_faqs.json | ✓ |  | ✓ | OK |  |
| novice_guidelines | faq:novice_guidelines | api/data/rider_ai_faqs.json | ✓ |  | ✓ | OK |  |
| TRACKDAY_RIDER_AI_URL | gpt:legacy_url | app/constants/api.ts |  |  |  | ORPHAN | Legacy URL not wired to UI |
| Coach + Bike Setup FAQs (20+20) | faq:coach+bikesetup | api/data/rider_ai_faqs.json | ✓ |  | ✓ | OK | Ask mode does not retrieve these FAQs — only injected into Coach/Bike Setup prompts |
| Australian track corner knowledge | track:*:corner:* | (missing) |  |  |  | MISSING | coach_015 references uploaded track knowledge but no structured track/corner store in repo |
| Fast women   pioneering Australian motorcyclists    Sally Anne Fowles | doc:Fast women _ pioneering Australian motorcyclists -- Sally-Anne Fowles | Q&A/Fast women _ pioneering Australian motorcyclists -- Sally-Anne Fowles.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Grand Prix Motorcycle Racers   The American Heroes    Norman L  DeWitt  | doc:Grand Prix Motorcycle Racers _ The American Heroes -- Norman L_ DeWitt  | Q&A/Grand Prix Motorcycle Racers _ The American Heroes -- Norman L_ DeWitt .json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Journal of Sports Sciences load on riders of top level | doc:Journal of Sports Sciences_load on riders of top-level | Q&A/Journal of Sports Sciences_load on riders of top-level.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Long Live Motorcycle Racing | doc:Long Live Motorcycle Racing | Q&A/Long Live Motorcycle Racing.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| 2026 Manual of Motorcycle Sport — Road Race & Historic focus | doc:MoMS-2026-road-historic | Q&A/MoMS-2026-road-historic.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| MotoGP source book   sixty years of world championship  | doc:MotoGP source book _ sixty years of world championship  | Q&A/MotoGP source book _ sixty years of world championship .json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| MotoGP source book   sixty years of world championship | doc:MotoGP source book _ sixty years of world championship | Q&A/MotoGP source book _ sixty years of world championship.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Motorcycle Grand Prix Racing | doc:Motorcycle Grand Prix Racing | Q&A/Motorcycle Grand Prix Racing.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Pushing The Limits  Casey Stoner Autobiography | doc:Pushing The Limits_ Casey Stoner Autobiography | Q&A/Pushing The Limits_ Casey Stoner Autobiography.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Speed at the TT Races   Faster and Faster    David Wright | doc:Speed at the TT Races _ Faster and Faster -- David Wright | Q&A/Speed at the TT Races _ Faster and Faster -- David Wright.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Superbike (Motorcycle Racing  the Fast Track)    by Jim Mezzanotte | doc:Superbike (Motorcycle Racing_ the Fast Track) -- by Jim Mezzanotte | Q&A/Superbike (Motorcycle Racing_ the Fast Track) -- by Jim Mezzanotte.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| The fast stuff   twenty years of top bike racing tales from    Oxley, Mat | doc:The fast stuff _ twenty years of top bike racing tales from -- Oxley, Mat | Q&A/The fast stuff _ twenty years of top bike racing tales from -- Oxley, Mat.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| The Isle of Man TT Races   Motorcycling, Society and    Simon Vaukins | doc:The Isle of Man TT Races _ Motorcycling, Society and -- Simon Vaukins | Q&A/The Isle of Man TT Races _ Motorcycling, Society and -- Simon Vaukins.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Valentino Rossi   motogenius    Oxley, Mat | doc:Valentino Rossi _ motogenius -- Oxley, Mat | Q&A/Valentino Rossi _ motogenius -- Oxley, Mat.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| Valentino Rossi  Portrait Of A Speed God | doc:Valentino Rossi_ Portrait Of A Speed God | Q&A/Valentino Rossi_ Portrait Of A Speed God.json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| World Superbikes  The First 20 Years  | doc:World Superbikes_ The First 20 Years  | Q&A/World Superbikes_ The First 20 Years .json |  | ✓ |  | PARTIAL | Ask retrieval only; Coach does not use PDF corpus |
| performanceridingtechniques Andy Abottts | doc:performanceridingtechniques_Andy_Abottts | Q&A/performanceridingtechniques_Andy_Abottts.json |  |  |  | BROKEN | PDF scrape empty (likely image-only PDF) — content not available to app |
| Seed Q&A + documents | knowledge:seed | Q&A/knowledge.json |  | ✓ |  | OK | Small seed set only (12 qa, 2 docs) |
| Trivia banks | trivia:* | Q&A/Q&A_with_ratings.json, AUS_Q&A.json, trivia-bank.json |  |  |  | OK | Trivia tab only — separate from coach GPT flows |

### Critical gaps (fix Turn 6 in one place)

1. **No `track:{id}:corner:{n}` canonical store** — corner fixes would require hunting FAQs, prompts, and PDFs.
2. **Coach does not RAG the PDF corpus** — Ask-only retrieval; Coach relies on FAQs + model.
3. **1 GPT-linked PDFs scraped empty** — performanceridingtechniques and others may exist in GPT but not in repo text.
4. **Duplicate truth risk** — same topic may exist in FAQ answer + Ask KB + model improvisation.

## Pass 3 — Test (30 questions vs production API)

**Health:** `{"ok":true,"roadraceAi":true}`  
**Scoring:** token overlap vs expected curated answer (≥0.35 PASS, ≥0.20 PARTIAL)

| Surface | PASS | PARTIAL | FAIL | Total |
|---------|------|---------|------|-------|
| Ask | 2 | 3 | 25 | 30 |
| Coach/BikeSetup | 5 | 0 | 15 | 20 |

| ID | Question | Expected source | Ask | Coach |
|----|----------|-----------------|-----|-------|
| coach_003 | Can you help me understand why I keep running wide?… | rider_ai_faqs.coach | PARTIAL (0.324) | PASS (0.559) |
| coach_004 | Can you help me improve braking consistency?… | rider_ai_faqs.coach | PARTIAL (0.222) | PASS (0.407) |
| coach_006 | Can you help me with trail braking?… | rider_ai_faqs.coach | PASS (0.514) | PASS (0.514) |
| coach_007 | Can you explain why I miss apexes?… | rider_ai_faqs.coach | PASS (0.394) | PASS (0.394) |
| coach_008 | Can you help with throttle timing on corner exit?… | rider_ai_faqs.coach | PARTIAL (0.29) | PASS (0.774) |
| coach_011 | Can you give novice-friendly coaching without overloadi… | rider_ai_faqs.coach | FAIL (0) | FAIL (0) |
| coach_012 | Can you help me create a plan for my next track session… | rider_ai_faqs.coach | FAIL (0) | FAIL (0) |
| coach_015 | Can you give corner-specific coaching for Australian ci… | rider_ai_faqs.coach | FAIL (0) | FAIL (0) |
| coach_019 | Can you separate rider technique issues from bike setup… | rider_ai_faqs.coach | FAIL (0) | FAIL (0) |
| coach_020 | What are the limits of AI coaching compared with an in-… | rider_ai_faqs.coach | FAIL (0) | FAIL (0) |
| bikesetup_001 | How can an AI know what setup change my bike needs with… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_002 | What information do you need before giving setup advice… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_003 | Will you give me tyre pressures, or do you need my tyre… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_004 | Can you diagnose tyre wear from a photo?… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_005 | How do I know whether my problem is tyre pressure, susp… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_006 | Why do you check tyre pressure before suspension settin… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_007 | Can you help me choose between softer and harder tyre c… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_008 | Can you tell me what to change if my rear tyre is teari… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_009 | Can you help if the bike runs wide on corner exit?… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| bikesetup_010 | Can you help if the front feels vague or pushes mid-cor… | rider_ai_faqs.bikesetup | FAIL (0) | FAIL (0) |
| ask_seed_1 | What is trail braking?… | knowledge.json seed | FAIL (0) | N/A (ask-only question) |
| ask_seed_2 | What is the apex of a corner?… | knowledge.json seed | FAIL (0) | N/A (ask-only question) |
| ask_seed_3 | What does BP mean in motorcycle riding?… | knowledge.json seed | FAIL (0) | N/A (ask-only question) |
| ask_principle_1 | Should you invent tyre pressure numbers without knowing… | rider_ai_faqs global_principles | FAIL (0) | N/A (ask-only question) |
| ask_principle_2 | What order should bike setup diagnosis follow?… | rider_ai_faqs global_principles | FAIL (0) | N/A (ask-only question) |
| ask_track_gap | What is the coaching advice for turn 6 at Phillip Islan… | GPT track files (expected gap) | FAIL (0) | N/A (ask-only question) |
| ask_track_gap_2 | How do I fix running wide at turn 3 Broadford?… | GPT track files (expected gap) | FAIL (0) | N/A (ask-only question) |
| ask_hist_1 | Who is Casey Stoner?… | Q&A PDF corpus | FAIL (0) | N/A (ask-only question) |
| ask_hist_2 | What is the Isle of Man TT?… | Q&A PDF corpus | FAIL (0) | N/A (ask-only question) |
| ask_setup_cross | My rear tyre is sliding on corner exit — is it setup or… | coach_019 / cross-mode | FAIL (0) | N/A (ask-only question) |

### Track-corner gap tests (expected weak)

- **ask_track_gap:** Ask FAIL — Too many AI requests — try again in a few minutes.
- **ask_track_gap_2:** Ask FAIL — Too many AI requests — try again in a few minutes.

## Recommended canonical model

- **Authoring:** Custom GPT (curated)
- **Production truth:** `knowledge/canonical/` with IDs like `track:phillip_island:corner:06`
- **Derived:** `rider_ai_faqs.json` generated from canonical store (no hand-maintained copies)
- **Runtime:** Coach + Ask both retrieve canonical records; cite ID in responses

