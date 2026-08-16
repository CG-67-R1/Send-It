# App Review notes — Guideline 2.1 (Information Needed)

Paste-ready answers for **RoadRacer - Motorsport_Is_Life** (`com.milroadracer.app`), version **1.0.0**.

Apple asked for a physical-device screen recording plus seven written items. Put the same text in:

1. **App Store Connect → version 1.0.0 → App Review Information → Notes**
2. **Resolution Center** reply (attach the video there)

Do **not** bump the marketing version. Keep `1.0.0`. Demo account: leave blank / “No account required”. Contact email: `projectapex@outlook.com.au` (see [`ASC_LISTING_COPY.md`](ASC_LISTING_COPY.md)).

Record on the **same TestFlight build** attached to 1.0.0 (or a newer production IPA if you uploaded one first). Do not record the Vercel web app or a simulator.

---

## Facts (keep notes accurate)

- **No accounts, login, or account deletion.** On-device profile only. Closest analog: **Profile & settings → Your data & privacy → Delete all local data**.
- **No IAP / subscriptions / paid unlocks.**
- **No App Tracking Transparency** prompt (no tracking).
- **No public social feed.** Track Walk “Private / Team / Community” is a **local label** on device storage — nothing is published to other users, so there is no report/block UI. Leave visibility on **Private** in the video.
- **Permissions that can appear:** camera (avatar), photos (bike / notes / avatar library), calendar (Events → Add reminder), location (Settings → track arrival), notifications (Priority 1 news), speech/mic (Track Walk voice note if the native module is present).
- **Network:** headlines, calendar, Coach / Bike Setup AI / Q&A via `https://send-it-ke7r.onrender.com` (Render) and OpenAI. First API call after idle can take ~30s (cold start) — wait rather than showing an error.
- **Regions:** AU + UK packs. Same features; headlines, calendar, and track catalogs differ by locale. Not a regulated industry. News is headlines + links to publisher sites ([`COPYRIGHT.md`](../legal/COPYRIGHT.md)).

---

## Shot list (physical iPhone, latest iOS)

Aim for **3–5 minutes**. Pause briefly on each screen.

### Setup

1. Install the **TestFlight** build that is on version 1.0.0 (or the new production build if you uploaded one).
2. Optional but useful: **Settings → Your data & privacy → Reset onboarding** so launch shows first-run.
3. iPhone: Control Center → **Screen Recording** (microphone off unless you narrate).
4. Force-quit RoadRacer. Start recording on the **Home Screen**, then tap the RoadRacer icon.

### Record this path

| # | Show | Why Apple asked |
|---|------|-----------------|
| 1 | Cold launch from Home Screen | “Recording must begin with launching the app” |
| 2 | Onboarding: Welcome → favourite bike/rider → **Track days** → nickname. If avatar **Take photo** appears, **Allow Camera**, then Cancel/Align enough to show the prompt | Camera purpose string |
| 3 | Home: tap bike photo area → **Allow Photos** (or Don’t Allow if already granted — still tap the control) | Photos prompt |
| 4 | **Settings** → Open News → scroll 2–3 headlines → tap one so Safari/publisher opens → back to app | Core news; third-party content is links |
| 5 | Tab **Events** → scroll calendar → **Add reminder** on one event → **Allow Calendar** | Calendar prompt |
| 6 | Tab **Rider Coach** → **Track Prep** or **Track Walk** (pick a catalog track, add one short note, keep **Private**) → back → **Track Memory** 10–15s of riding → **RR AI Coach**, send e.g. “How should I approach a slow hairpin?” and wait for a reply | Core coach flow + AI |
| 7 | Tab **Bike Setup** → open **Bike Setup Sheet** (scroll fields) → **Bike Balance** (show first inputs, no need to finish) | Core setup tools; data stays on device |
| 8 | Tab **Q & A** → Ask e.g. “What is a track day?” → wait for reply → open **Trivia**, start one question | Q&A core |
| 9 | **Settings** → enable **track arrival** → **Allow Location While Using** | Location prompt |
| 10 | **Settings → Your data & privacy**: show Privacy Policy link, **Delete all local data** (you do not have to confirm delete on camera) | No-account “access” story |
| 11 | Stop recording. Trim to launch → end. Export **.mov** or **.mp4**. | Attach in Resolution Center |

**Do not** invent login, payments, or a report/block screen. **Do** keep the phone online so Coach/Q&A/News work.

Replace `[MODEL]` and `[VERSION]` in the notes below with the phone you used, e.g. `iPhone 16, iOS 18.6`.

---

## Paste into Notes and Resolution Center

Fill the device line first, then paste this entire block.

```
RoadRacer — App Review notes (version 1.0.0)

1) SCREEN RECORDING
Attached in this Resolution Center reply: physical-device recording starting at app launch, then onboarding/Home, News, Events, Rider Coach (Track Walk + Track Memory + AI Coach), Bike Setup, Q&A, and permission prompts (camera/photos/calendar/location as they appear).

No account registration, login, or account deletion — there is no user account.
No paid content, IAP, or subscriptions.
No App Tracking Transparency prompt — the app does not track users.
User-created track notes and photos are stored only on the device. The Track Walk Private/Team/Community control is a local label only; sessions are not published to other users. There is no public feed, so there is no content reporting or blocking UI.

2) DEVICES AND OS TESTED BEFORE SUBMISSION
- iPhone [MODEL], iOS [VERSION] (physical device; this recording)
Minimum iOS: 16.4. iPad is supported (same binary); primary testing is iPhone.

3) WHAT THE APP DOES AND WHO IT IS FOR
RoadRacer is a motorcycle road-racing companion for track-day riders, club racers, and fans.
It solves scattered prep: race news, a calendar, on-device track notes and setup sheets, and optional AI coaching.
Target audience: adults interested in motorcycle road racing (not children). Informational only — not professional race or mechanical advice.

4) HOW TO ACCESS MAIN FEATURES (NO LOGIN)
- No demo account. Open the app; complete or skip through onboarding (any bike/rider names; choose Track days or Race).
- Home: identity (bike photo/avatar) and shortcuts.
- Settings → Open News: headlines. Articles open on the publisher site.
- Events: race calendar. Add reminder uses the device calendar (permission).
- Rider Coach: RR AI Coach, Track Prep/Walk, Track Memory. Needs network for AI.
- Bike Setup: Bike Setup AI, Day Setup Sheet, Bike Balance (local). Needs network for AI only.
- Q & A: Ask, Official rule check, Trivia, FAQs. Needs network for Ask/rules.
- Settings → track arrival: optional foreground location near a known circuit.
- Settings → Your data & privacy: export/delete local data; Privacy Policy and Terms.
If AI/news is slow after idle, wait ~30s for the API to wake (Render). Privacy: https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/PRIVACY.md

5) EXTERNAL SERVICES
- RoadRacer API (Render): https://send-it-ke7r.onrender.com — headlines, calendar, Q&A, Coach/Bike Setup proxy
- OpenAI — AI replies; chat is not kept on our server after the response
- Third-party publishers via RSS/scraped headlines (e.g. AMCN, ASBK, MotoGP, MCN, BikeSocial); full articles on their sites
- Sentry — crash diagnostics only if configured in the build
- Apple: calendar, camera, photos, location, notifications, speech recognition as the user enables them
No authentication provider. No payment processor.

6) REGIONAL DIFFERENCES
Same features worldwide. Bundled content packs are Australia and United Kingdom (headlines mix, calendar series, track catalogs). No geo-locked paid features. Primary listing locale: English (Australia).

7) REGULATED INDUSTRY / PROTECTED MATERIAL
Not a regulated industry (not finance, health, gambling, or legal practice).
Not official championship software. Series names are used for identification/news.
Third-party news: headlines and links only; copyright stays with publishers (see in-app Content Rights / COPYRIGHT.md).
Coach, Bike Setup, and Official rule check are informational aids, not a licensed rule book substitute.
No extra credentials to attach.
```

---

## App Store Connect steps

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **RoadRacer - Motorsport_Is_Life**.
2. If status is **Waiting for Review** / **In Review** and you need to change Notes or the build: **Remove from Review** first.
3. Version **1.0.0** → **App Review Information** → **Notes**: paste the block. Sign-in required: **No**.
4. **Resolution Center** (the 2.1 message): **Reply**, paste the same notes, **attach the video**.
5. Confirm the **Build** is the one you recorded. Do not create 1.0.1.
6. **Add for Review** → **Submit to App Review**.

A new EAS build is **not required** to answer 2.1. Only rebuild if you want newer code in this review — then record **that** TestFlight and keep version `1.0.0` in [`app/app.json`](../../app/app.json) (`autoIncrement` already bumps the build number).

**Optional later (not needed to answer this letter):** widen the Photos purpose string in [`app/app.json`](../../app/app.json) so it also mentions track notes and Coach attachments (Apple’s 5.1.1 warning). That change needs a new binary.
