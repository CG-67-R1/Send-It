# RoadRace – Motorcycle & Racing Headlines

Mobile app that shows **latest headlines** from motorcycle and racing news sites, with links to open articles. The headlines page **updates when the app opens** and supports **pull-to-refresh**.

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


## Features

- **Headlines page:** Aggregated headlines from 8 built-in sources; tap to open the article; updates when the app opens; pull-to-refresh.
- **Priority order:** In **Settings** (Headlines settings), a numbered priority grid with a dropdown per position. Set which source appears first (e.g. MotoGP = 1), second, and so on. The Headlines list is ordered by this priority.
- **Custom sources:** Add your own source (RSS feed URL + display name). It appears in the priority list and in the headlines feed. Remove custom sources from Settings.
- **Notify for Priority 1:** In Settings, turn on “Notify for Priority 1 news” to get a local notification when new headlines from your #1 source appear (e.g. when you open the app or pull to refresh). Permission is requested when you enable it.

## Quick start

### 1. Install dependencies

From the project root (in a terminal where `node` and `npm` work):

```bash
cd api && npm install && cd ../app && npm install
```

Or install each folder separately: `cd api` → `npm install`, then `cd app` → `npm install`.

### 2. Run the API (required for headlines)

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

### 4. Update when app opens

- The app calls the API when the **Headlines** screen is focused (e.g. app open or tab focus).
- **Pull down** on the list to refresh (bypasses cache and re-scrapes sources).

## Configuration

- **API URL (app)**  
  Edit `app/constants/api.ts`:
  - **Android emulator**: `http://10.0.2.2:3001` (default in dev).
  - **iOS simulator**: `http://localhost:3001` (default in dev).
  - **Physical device**: use your computer’s LAN IP, e.g. `http://192.168.1.100:3001`.
  - **Production**: set the `getApiBaseUrl()` return value to your deployed API URL.

- **API port**  
  Default is `3001`. Override with `PORT=3002 npm start` in `api/`.

## Q&A and PDF scrape

- The **Q&A** tab uses the API and the `Q&A/` knowledge base (see `Q&A/README.md`).
- To scrape PDFs in `Q&A/` into one JSON per file (original format + Q/A):  
  `cd api && npm run scrape-pdfs`  
  (Requires `npm install` in `api/` first – installs `pdf-parse` and other dependencies.)

## Project layout

```
RoadRace/
├── api/                 # Headlines API (Node.js)
│   ├── server.js        # Express server, GET /headlines
│   ├── scrapers.js      # Per-site scrapers, 15-min cache
│   └── package.json
├── app/                 # Expo (React Native) app
│   ├── App.tsx          # Root with Headlines screen
│   ├── index.js         # Entry
│   ├── constants/api.ts # API base URL
│   └── src/
│       ├── screens/HeadlinesScreen.tsx  # List + links + refresh
│       └── types.ts
└── README.md
```

## Deploying the API

To use the app without running the API on your machine, deploy the `api` folder, e.g.:

- **Vercel**: add `api/vercel.json` and export the handler from `api/server.js` (or a serverless `api/headlines.js`).
- **Railway / Render / Fly.io**: run `node server.js` in `api/`.

Then set the production URL in `app/constants/api.ts` and rebuild the app.
