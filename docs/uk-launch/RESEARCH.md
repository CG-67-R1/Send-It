# UK launch research notes

**Date:** 2026-08-11  
**Pack:** `uk` (Region 01)  
**Status:** Research complete for seed → launch fill

## 1. Federation / licensing

| Body | Scope | Notes |
|------|--------|--------|
| **ACU** | England & Wales (centres) | Road race competition licence: join affiliated club → CTC (classroom) + BRA (on-track) → Novice → Clubman → National. Track days do **not** require an ACU race licence. |
| **SACU** | Scotland | Separate national federation; Scottish championship / club pathway. Cross-border start permission when racing ACU events. |
| **MCUI** | Northern Ireland / Ireland road race | Short-circuit and public-road racing culture; verify start permission for GB events. |

Official refs: [acu.org.uk](https://www.acu.org.uk), [sacu.co.uk](https://www.sacu.co.uk), [mcui-uc.org.uk](https://www.mcui-uc.org.uk)

## 2. Circuit inventory (pack tracks)

| ID | Venue | Layout focus | Direction | Length (approx) |
|----|--------|--------------|-----------|-----------------|
| `brands-hatch` | Brands Hatch | GP (BSB / track days also Indy) | Clockwise | GP 3.916 km |
| `donington` | Donington Park | National + GP (Melbourne Loop) | Clockwise | Nat ~3.19 km |
| `silverstone` | Silverstone | National / International / GP | Clockwise | Nat 2.64 km |
| `cadwell-park` | Cadwell Park | Full / Bike | Clockwise | Bike ~3.52 km |
| `snetterton` | Snetterton | 300 | Clockwise | ~4.78 km |
| `oulton-park` | Oulton Park | International | Clockwise | ~4.33 km |
| `thruxton` | Thruxton | Full | Clockwise | ~3.79 km |
| `knockhill` | Knockhill | International | Clockwise | ~2.09 km |
| `anglesey` | Anglesey (Trac Môn) | Coastal / International | Clockwise | varies |
| `mallory-park` | Mallory Park | Full | Clockwise | ~2.18 km |

## 3. Turn verification policy

Same P0 as AU: left/right only from rider- or official-map-verified sources. Complexes stay `complex` when hand is ambiguous.  
Verified for launch fill: Brands Hatch GP, Donington National (named corners), Snetterton 300. Cadwell / Oulton / Silverstone GP / Thruxton / Knockhill start with named corners + `forceAllComplex` or partial verification until on-site confirmation.

## 4. Calendar feeds

| Source | Type | URL / approach |
|--------|------|----------------|
| BSB | Series page + static rounds | https://www.britishsuperbike.com |
| ACU | Governing body events | https://www.acu.org.uk |
| MSV Bike Trackdays | Track-day operator | https://bike.msvtrackdays.com |
| No Limits | Track days + club racing | https://www.nolimitstrackdays.com |

Full Timely-style ICS (AU pattern) is not yet published for BSB; use series + static.json rounds and operator pages until ICS exists.

## 5. Headline scrapers

Already implemented in `api/scrapers.js`:

- `mcn` → https://www.motorcyclenews.com/news/
- `bennetts` → https://www.bennetts.co.uk/bikesocial/news-and-views

Pack `headlines/sources.json` already lists both. No new scraper code required for launch.

## 6. Legal / storefront

- ASC primary locale remains **en-AU** (home market). Add **UK (English) localization** copy (en-GB spelling).
- Terms: keep South Australia governing law; add UK/GDPR notice that UK users retain mandatory UK consumer rights and ICO-style privacy expectations; contact remains `projectapex@outlook.com.au`.

## 7. Coach track facts (priority)

Minimum coaching coverage for GPT + pack prompts: Brands Hatch GP, Donington National/GP, Silverstone National, Cadwell Full, Snetterton 300.
