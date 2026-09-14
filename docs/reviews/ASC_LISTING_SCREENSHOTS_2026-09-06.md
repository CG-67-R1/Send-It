# Agent Apple — ASC listing screenshot review 2026-09-06

Review + categorisation of 13 device screenshots supplied for the App Store Connect
app-information update before release. Report only — no app edits.

App: RoadRacer - Motorsport_Is_Life · `com.milroadracer.app` · ASC Apple ID 6799806571

## Verdict

Screenshots are usable. **Retake recommended for 2 items (P1)** before upload; the rest
is ordering/metadata work in ASC.

## Categorisation (feature pillars)

ASC allows max 10 screenshots per device size — 13 supplied, so 3 drop. Suggested
order (story: coach → track → setup → events → knowledge):

| # | Screenshot | Pillar | Use |
|---|------------|--------|-----|
| 1 | AI Coach — question (Phillip Island T1) | Rider Coach / AI | **Hero** |
| 2 | AI Coach — braking advice reply | Rider Coach / AI | Keep (pairs with 1) |
| 3 | Track Details map — One Raceway (Wakefield), 2.17 km, numbered turns + line | Track Details | Keep |
| 4 | Track Prep — One Raceway (Trackday Prep / Walk Notes / Track Details) | Rider Coach | Keep |
| 5 | Bike Setup hub (6 tools) | Bike Setup | Keep |
| 6 | Bike Setup Basics — interactive bike diagram + parts list | Bike Setup | Keep |
| 7 | Tyre Wear Analysis — 3-photo capture flow | Bike Setup | Keep |
| 8 | Events list — Morgan Park, AU/World/All filters | Events | Keep |
| 9 | Events — Morgan Park Thu / Austrian GP / Mac Park cards | Events | Keep or drop (similar to 8) |
| 10 | Q&A — FAQs tab with search | Q&A | Keep |
| — | Rider Coach hub (5 buttons) | Rider Coach | Drop (menu-only; 1–4 show it better) |
| — | Bike Setup Basics — sag text screen | Bike Setup | Drop (text-heavy; 6 covers Basics) |
| — | Bike Balance Setup — intro text | Bike Setup | Drop (text-only disclaimer screen) |

Rule of thumb applied: action screens over menu/text screens; every tab represented.

## Findings

### P1 — tab labels truncate in every screenshot
"Rider Coach" renders as **"Rider C..."** and "Bike Setup" as **"Bike Se..."** in the
tab bar on this device size. Every ASC screenshot ships that clipped text.
**Recommended Cursor fix:** shorten tab labels (e.g. `Coach`, `Setup`) or reduce tab
font size, then retake. If not fixing pre-release, crop marketing captions over the
tab bar area.

### P1 — racing line must be captioned as a suggestion
The Track Details capture shows the coloured line segments (brake/release/throttle).
Repo invariant: the line is a **suggestion, never instruction**, and no modelled lap
time is shown. ASC description/captions must use wording like "suggested racing line"
— do not market it as instruction ("where to brake"). Screenshot itself is fine.

### P2 — status-bar hygiene
Times vary across the set (6:23–6:47, 79–80% battery). Not an Apple requirement, but
retaking the final set in one pass (or framing captures) reads more polished.

### P2 — consistency confirmed (no action)
Tab bar verified identical across captures (Home / Events / Rider Coach / Bike Setup /
Q&A) — one build, no stale-navigation screenshots. Wakefield 2.17 km matches the
catalog. Vision-model artefacts from intake ("Rider Community", "Bike Service",
"horse logo") were misreads of the truncated labels and RR shield — ignore.

## App-information metadata implications (update alongside screenshots)

- **Description pillars** (match the set): AI rider coach · Track prep + walk notes ·
  Track Details maps with suggested racing line · Bike setup tools (sheet, balance,
  gearing, tyre wear photo analysis) · AU + world race events calendar · Q&A/FAQs.
- **Photos purpose string (known P1 from agent-apple-ops):** Tyre Wear Analysis and
  Coach photo-attach are both visible in these screenshots, so the single-use
  photosPermission string ("picture of your bike on the home screen") is provably
  stale vs the marketed features. Fix before this binary ships.
- **Privacy nutrition:** "Private on this device" claim (Track Prep) must match the
  label — coach chat + photos go to the API/OpenAI, so keep on-device claims scoped
  to notes/photos storage only.
- **Age rating / AI disclosure:** AI chat is front-and-centre in the hero shots —
  confirm the age-rating questionnaire answers regarding generated content are set
  accordingly.
- **Events cards name third parties** (Champions Ride Days, MA) with external booking
  links — description should say "links to organiser booking", not imply in-app
  ticketing (no IAP).

## Handoff

- P0: 0 · P1: 2 · P2: 2
- Top Cursor fixes: 1) tab label truncation, 2) photosPermission scope string.
- Re-verify: retake final 10 screenshots on one build/pass after tab-label fix, on a
  physical iPhone (6.9" and 6.5" sizes for ASC).
