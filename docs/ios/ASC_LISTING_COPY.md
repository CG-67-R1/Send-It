# App Store Connect — listing copy (en-AU)

Paste-ready values for **RoadRacer - Motorsport_Is_Life** (`com.milroadracer.app`).

## App Privacy

| Field | Value |
|--------|--------|
| Privacy Policy URL | `https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/PRIVACY.md` |

Also complete the **App Privacy** questionnaire to match reality:

- Data linked to user: generally **No** (no account).
- Data used to track: **No**.
- Collected / processed types that apply: **Contact Info** only if you collect support email in-app (you don’t); **User Content** (chat/messages you send to AI — disclosed as processed by API/OpenAI, not stored after response); **Photos or Videos** (on-device; AI attachments only when user sends); **Product Interaction** optional; **Diagnostics** if Sentry is on; **Precise Location** only if track-arrival feature ships and is used (on-device).
- When unsure, match [`docs/legal/PRIVACY.md`](../legal/PRIVACY.md) and the in-app Settings privacy text.

## App Information

| Field | Value |
|--------|--------|
| Primary Category | **Sports** |
| Secondary Category (optional) | **News** |
| Copyright | Paste exactly as below (no URL; Apple adds ©). |
| Content Rights | Does your app contain, display, or access third-party content? → **Yes** (news headlines / links to publisher sites). Do you have the rights? → **Yes** (linking/aggregation; articles open on publisher sites). |
| Age Rating | Complete the questionnaire (no unrestricted web, mild competition themes — typically 4+ or 12+ depending on answers). |

### Copyright (required)

Paste into the **Copyright** field (matches Individual membership **CHRISTOPHER CRAIG GREENE**):

```
2026 Christopher Craig Greene
```

Trading-name alternative (if you prefer): `2026 Motorsport Is Life`

## App Encryption Documentation

RoadRacer only uses **standard HTTPS/TLS** via the OS (API, OpenAI, RSS, Sentry). It does **not** ship proprietary or custom crypto. No CCATS or French encryption declaration upload is required.

Already set in [`app/app.json`](../../app/app.json):

```json
"ITSAppUsesNonExemptEncryption": false
```

### Answers in App Store Connect

If ASC asks under **App Encryption Documentation** or a build shows **Missing Compliance** → **Manage**:

| Question (wording varies) | Answer |
|---------------------------|--------|
| Does your app use encryption? | **Yes** (HTTPS/TLS) — or follow Apple’s flow; the next answers mark it exempt |
| Is encryption limited to that within the Apple operating system / exempt uses (HTTPS, authentication)? | **Yes** |
| Does your app use, contain, or incorporate proprietary or non-standard encryption? | **No** |
| Do you need to upload app encryption documentation? | **No** — none required |

Then **Save**. You should **not** upload a document for this app.

If a build still asks every upload, confirm the production Info.plist includes `ITSAppUsesNonExemptEncryption` = `NO` (Expo sets this from `app.json` above).

## Version 1.0 — English (Australia)

### Description

```
RoadRacer is your motorcycle road-racing companion — news, calendar, track notes, and AI coaching in one place.

Stay across MotoGP, WorldSBK, and more with a headlines feed you can prioritise. Check the race calendar, walk the track with notes and photos, and keep Day Setup Sheets and bike balance tools on your device.

Ask the Rider Coach or Bike Setup AI for practical guidance, or use Q&A and trivia to sharpen your knowledge. Your profile, avatar, setups, and track notes stay private on your device. AI chats you send go to the RoadRacer API and may be processed by OpenAI; chat history is not kept on our server after the reply.

Built for track-day riders and race fans who live motorsport.
```

### Keywords (max 100 characters, comma-separated, no trademark abuse)

```
motorcycle,racing,motogp,superbike,track day,bike setup,coach,calendar
```

(Character count: 78)

### URLs

| Field | Value |
|--------|--------|
| Support URL | `https://github.com/CG-67-R1/Send-It` |
| Marketing URL (optional) | `https://send-it-cg-67-r1s-projects.vercel.app` |
| Privacy Policy URL | (also under App Privacy — same GitHub PRIVACY.md link) |

### Promotional Text (optional, 170 chars)

```
News, calendar, track walk, and AI coach for motorcycle road racing — setups stay on your device.
```

## Contact Information (App Review)

Use a real person Apple can reach:

| Field | Suggested |
|--------|-----------|
| First name | (your first name) |
| Last name | (your last name) |
| Phone | (your mobile with country code, e.g. +61…) |
| Email | `projectapex@outlook.com.au` (same as privacy contact) |

Demo account: not required (no login). Notes for review (optional): “No account required. AI Coach/Bike Setup need network. Camera/photos/location only when user enables those features.”

## Build

You must select a build under **Build** on the version page. That appears only after a successful EAS iOS upload:

```powershell
cd C:\Users\Administrator\.cursor\Send-It\app
npx eas-cli@latest build -p ios --profile production --no-wait
```

Then in ASC: Build → **+** → select the processed build.

## Screenshots (iPhone 6.5")

Required sizes include:

- **1242 × 2688** or **1284 × 2778** (portrait)
- Landscape equivalents if you upload landscape

Upload **at least 3** screenshots for iPhone 6.5" Display. Ready files (all **1284 × 2778**):

| Order | File | Screen |
|-------|------|--------|
| 1 | [`docs/ios/screenshots/iphone-6.5/asc-iphone65-01-news.png`](screenshots/iphone-6.5/asc-iphone65-01-news.png) | News & Events |
| 2 | [`docs/ios/screenshots/iphone-6.5/asc-iphone65-02-track.png`](screenshots/iphone-6.5/asc-iphone65-02-track.png) | Track walk / Bend |
| 3 | [`docs/ios/screenshots/iphone-6.5/asc-iphone65-03-setup.png`](screenshots/iphone-6.5/asc-iphone65-03-setup.png) | Bike Setup |
| 4 | [`docs/ios/screenshots/iphone-6.5/asc-iphone65-04-tyre.png`](screenshots/iphone-6.5/asc-iphone65-04-tyre.png) | Tyre Wear Analysis |

In ASC: **App Store** → version → **iPhone 6.5" Display** → upload 1–4 (minimum three). Do not upload arbitrary promo sizes without resizing.
