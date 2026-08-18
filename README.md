# RoadRace – Rider Coach & Bike Setup

Mobile app for **trackday learners and club racers**: Rider Coach, Bike Setup (balance calculator, day sheet), track prep, calendar, and Q&A. Home switches Learn vs Setup from how you ride. Headlines stay in the API and behind **Settings → Open News** (not a product tab).

## Requirements

- **Node.js** (LTS recommended) – [nodejs.org](https://nodejs.org/)  
  Required for the API, the app, and the Q&A/PDF scripts. After installing, open a **new** terminal so `node` and `npm` are on your PATH.

## Sources (aggregated)

- **AMCN** (Australian Motorcycle News)
- **mcnews.com.au**
- **ASBK** (Australian Superbike Championship)
- **MotoGP.com**
- **Motor Sport Magazine** (F1 & MotoGP)
- **gpone.com**
- **Bennetts BikeSocial**
- **MCN** (Motorcycle News UK)


## Features (current)

- **Home:** Bike photo + avatar. Learn home (track days) shows last Track Prep and Coach / Q&A shortcuts. Setup home (race) shows last day-sheet session and Bike Balance / Sheet shortcuts. Switch “How you ride” in Profile.
- **Rider Coach:** RR AI Coach, Track Prep, Bike Setup Basics, Tyre Wear Analysis.
- **Bike Setup:** Bike Setup AI, day sheet with session history, Bike Balance calculator, Gearing Guide, Tyre Wear Analysis, Bike Setup Basics.
- **Events / Q&A:** Calendar; Ask, Trivia, and FAQs on one tab.
- **News (archived):** Aggregated headlines remain in Settings → Open News (source order, custom RSS, Priority 1 notify). Not on Home or the tab bar.

## Quick start

### 1. Install dependencies

From the project root (in a terminal where `node` and `npm` work):

```bash
cd api && npm install && cd ../app && npm install
```

Or install each folder separately: `cd api` → `npm install`, then `cd app` → `npm install`.

### 2. Run the API (required for headlines, calendar, Q&A, Coach)

```bash
cd api
npm start
```

API runs at **http://localhost:3001**. Headlines are cached for 15 minutes; use `?refresh=1` to bypass cache.

### 3. Run the mobile app

```bash
cd app
npm install
npx expo start
```

- Press **i** for iOS simulator or **a** for Android emulator.
- On a **physical device**: install “Expo Go” and scan the QR code. Set your machine’s LAN IP in `app/constants/api.ts` (see below) so the device can reach the API.

### 4. News feed (archived)

- Open **Settings → Open News**, then **pull down** on the list to refresh (bypasses cache and re-scrapes sources).

## Configuration

- **API URL (app)**  
  Default is the hosted API (`https://send-it-ke7r.onrender.com`) for Expo Go, physical devices, and production — **no local `npm start` required** for testers.
  - **Android emulator** (no override): `http://10.0.2.2:3001` when running the API locally.
  - **Local API override:** copy `app/.env.example` to `app/.env` and set `EXPO_PUBLIC_API_URL` (e.g. `http://localhost:3001` or your LAN IP).
  - See [`app/constants/api.ts`](app/constants/api.ts).

- **API port**  
  Default is `3001`. Override with `PORT=3002 npm start` in `api/`.

## Q&A and PDF scrape

- The **Q&A** tab uses the API and the `Q&A/` knowledge base (see `Q&A/README.md`).
- To scrape PDFs in `Q&A/` into one JSON per file (original format + Q/A):  
  `cd api && npm run scrape-pdfs`  
  (Requires `npm install` in `api/` first – installs `pdf-parse` and other dependencies.)

## Project layout (simplified)

```
RoadRace/
├── api/                 # Headlines + Q&A API (Node.js / Express)
│   ├── server.js        # Express server, GET /headlines
│   ├── scrapers.js      # Per-site scrapers, 15-min cache
│   └── package.json
├── app/                 # Expo (React Native) app
│   ├── App.tsx                 # Root navigation (tabs + stacks)
│   ├── constants/api.ts        # API base URL + EXPO_PUBLIC_API_URL support
│   └── src/
│       ├── screens/            # All main screens (Headlines, Calendar, Q&A, Track Walk, Rider Coach, Onboarding)
│       ├── storage/            # AsyncStorage helpers (onboarding, avatar, bike photo, settings)
│       ├── notifications/      # Priority-1 headline notifications
│       └── components/         # Shared UI components (e.g. AppLogo)
└── README.md

For more detail, see:

- `PROJECT_STATUS_AND_PRE_PRODUCTION.md` – current health checks, remaining work before production, and quick reference.
- `POC_HOSTING_GUIDE.md` – notes on hosting API (Render) and web build (Vercel).
- `SCREEN_BRIEF_FOR_VISUALS.md` – per-screen UX and visual intent.

## Branch & workflow (for learning)

- Keep `main` (and tag `v0.1-poc-stable`) as your **stable baseline**.
- Use `clean-restart` as your **working branch** for this phase while you tidy and add features.
- For new work, create short-lived branches from `clean-restart`, e.g.:
  - `feature/onboarding-future-racer`
  - `feature/headlines-views`
  - `feature/qa-goat-celebration`
- Open a PR from each feature branch back into `clean-restart`, review the diff, then merge.
- When you’re happy with `clean-restart`, fast-forward or merge it into `main` and push so Vercel/Render can deploy from `main`.

Before merging into `main`, run:

```bash
cd api && npm test || npm start   # basic health / manual check
cd ../app && npx tsc --noEmit     # TypeScript check
node scripts/health-check.mjs     # full repo health gate
```

**Mobile app review (Hermes):** on-demand deep audit via Hermes Agent — `hermes` then `/skill send-it/mobile-review`. Writes `docs/reviews/MOBILE_REVIEW_*.md` (report only; fix in Cursor). See `AGENTS.md` → Hermes mobile developer review.

## Deploying the API

To use the app without running the API on your machine, deploy the `api` folder, e.g.:

- **Vercel**: add `api/vercel.json` and export the handler from `api/server.js` (or a serverless `api/headlines.js`).
- **Railway / Render / Fly.io**: run `node server.js` in `api/`.

Then set the production URL in `app/constants/api.ts` and rebuild the app.
