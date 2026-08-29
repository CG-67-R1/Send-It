# Send-It (RoadRace) — Agent Context

Mobile app for motorcycle and racing headlines, plus Q&A, calendar, track walk, and rider coach features.

## Repo layout

- `app/` — Expo client for **Vercel web + iOS EAS**; TypeScript; main entry `App.tsx`
- `android-app/` — Expo **Android / Play** product (separate copy, committed `android/` Gradle). No shared folders with `app/`. See [`android-app/README.md`](android-app/README.md).
- `api/` — Node.js / Express headlines + Q&A API; ESM (`"type": "module"`)
- `packs/` — data-driven regional packs (AU + Regions 01–13); see `packs/README.md`
- `Q&A/` — PDF knowledge base; scrape via `cd api && npm run scrape-pdfs`
- `docs/gpt-knowledge/` — Custom GPT / TrackRider knowledge pack (reference for Coach & Bike Setup integration)

## Stack

- **App:** Expo ~54, React 19, React Navigation 7, AsyncStorage
- **API:** Express, cheerio, rss-parser, pdf-parse, OpenAI SDK (Q&A)
- **Dev:** Node LTS; API default port `3001`

## Commands

```bash
# API (required for headlines)
cd api && npm install && npm start

# App (web / iOS)
cd app && npm install && npx expo start

# Android / Play (separate tree)
cd android-app && npm install && npx tsc --noEmit && npx expo start --android

# Checks before merge to main
cd api && npm run health-check
cd ../app && npx tsc --noEmit
cd ../android-app && npx tsc --noEmit
```

## Configuration

- App API URL: `app/constants/api.ts` and the Android copy `android-app/constants/api.ts` (`getApiBaseUrl()`)
  - Android emulator: `http://10.0.2.2:3001`
  - iOS simulator: `http://localhost:3001`
  - Physical device / Play binary: hosted Render API (default)
- API port: `PORT` env (default 3001)

## Branch workflow

- `main` — stable baseline
- `clean-restart` — working branch for this phase
- Feature branches from `clean-restart`, PR back, then merge to `main` when ready

## Conventions

- Prefer small, focused changes; match existing patterns in each folder
- Do not commit secrets (`.env`, API keys, tokens)
- Do not force-push `main`
- Run TypeScript check in `app/` before claiming app changes are done
- Headlines cache: 15 minutes; `?refresh=1` bypasses cache

## Key docs

- `app/src/avatar/FACE_PHOTO.md` — **avatar face-hole capture ↔ home display invariants** (read before changing leathers art, hole math, or take-photo camera)
- `README.md` — quick start and features
- `ENVIRONMENT.md` — GitHub, Render, and Vercel URLs, branch policy, health checks
- `docs/hermes/CRON_SETUP.md` — Hermes RR app expert cron setup
- `docs/gpt-knowledge/README.md` — Custom GPT knowledge pack + Coach/Bike Setup integration map
- `packs/README.md` — regional pack layout, `active.json` hybrid bundling, validate/sync commands
- `PROJECT_STATUS_AND_PRE_PRODUCTION.md` — health checks and pre-prod work
- `POC_HOSTING_GUIDE.md` — Render / Vercel hosting notes
- `SCREEN_BRIEF_FOR_VISUALS.md` — screen UX intent
- `app/src/data/onboardingRiders.json` + `onboardingBikes.json` — curated onboarding blurbs (aliases + characteristics); Hermes flags gaps only — run `node scripts/test-onboarding-facts.mjs` after edits

## Hermes + Cursor split

- **Hermes (RR app expert):** scheduled gates, full reviews, coding-improvement reports — see below
- **Cursor:** in-editor edits, review, and fast targeted changes in this workspace
- Both read this file; keep project rules here, not duplicated in chat

### Hermes — RoadRace app expert (standing role)

Hermes is the **Send-It / RoadRace app expert**. It runs regular health gates and writes review reports; **Cursor implements fixes**.

| Cadence | Skill | Output |
|---------|-------|--------|
| **Daily** (weekdays) | `send-it/rr-app-expert` (daily-gate) | Short OK / FAIL summary |
| **Weekly** (Monday) | `send-it/rr-app-expert` + `send-it/mobile-review` + `send-it/track-data-analyst` | `docs/reviews/RR_REVIEW_YYYY-MM-DD.md` (includes Track data + Track Memory gate) |
| **Weekly** (Wednesday) | `send-it/mobile-app-expert` + `send-it/mobile-review` | `docs/reviews/MOBILE_OPS_YYYY-MM-DD.md` — HEALTHY or CURSOR ALERT (perf/security/iOS+Android) |
| **Weekly** (Thursday) | `send-it/agent-play` (weekly-skills **and** pre-submit) | Refresh Agent Play `CURRENT.md` + `AGENT_PLAY_SKILLS_YYYY-MM-DD.md` + `PLAY_PREFLIGHT_YYYY-MM-DD.md` (android-app code/security) |
| **Weekly** (Friday) | `send-it/agent-apple` (weekly-skills) | Refresh Agent Apple `CURRENT.md` + `docs/reviews/AGENT_APPLE_SKILLS_YYYY-MM-DD.md` |
| **Weekly** (Sunday 18:00) | `send-it/ai-enterprise-watch` | Short Telegram message + `docs/reviews/AI_ENTERPRISE_WATCH_YYYY-MM-DD.md` (enterprise AI; hype called out) |
| **On-demand** | `/rr-app-expert`, `/mobile-app-expert`, `/track-data-analyst`, `/agent-apple`, `/agent-play`, or `/ai-enterprise-watch` | Full report + top Cursor fixes; Agent Apple = pre-ASC; Agent Play = pre-Play; AI watch = enterprise landscape |

**Setup (one-time):** `.\scripts\install-hermes-skills.ps1` then follow [`docs/hermes/CRON_SETUP.md`](docs/hermes/CRON_SETUP.md) to create Hermes cron jobs.

**On-demand in Hermes:**

```powershell
cd C:\Users\Administrator\.cursor\Send-It
hermes
# /rr-app-expert
# Ask: "Run weekly-review. Write docs/reviews/RR_REVIEW_<date>.md. Report only."
# /mobile-app-expert
# Ask: "Run full-review. Write docs/reviews/MOBILE_OPS_<date>.md. HEALTHY or CURSOR ALERT. Report only."
# /track-data-analyst
# Ask: "Run track data review. Include Bend GT/International/West/East lengths. Report only."
# Ask: "Run track memory review. Geometry + elevation + diagnose + test:track-frames. Report only."
# /agent-apple
# Ask: "Review this app before submitting to App Store Connect. Identify iOS issues. Report only."
# Ask: "Update your skillset. weekly-skills. Refresh CURRENT.md from Apple/Expo sources."
# /agent-play
# Ask: "Review this app before submitting to Google Play. Identify Android issues. Report only."
# Ask: "Update your skillset. weekly-skills. Refresh CURRENT.md from Android/Play/Expo sources."
# /ai-enterprise-watch
# Ask: "Run weekly-watch. Relevant outcomes only. Flag hype. Report only."
```

Track structural gate (also part of mobile-review preflight):

```powershell
node scripts/validate-track-data.mjs
```

Track Memory gate (weekly / on-demand track-data-analyst — report only, do not bake):

```powershell
node scripts/diagnose-track-memory.mjs
cd app
npm run test:track-frames
npx tsc --noEmit
```

**Turn hands are P0:** wrong left/right must not ship. Allowed hands live in `app/src/data/track_turn_verification.json`. After catalog edits run `node scripts/enforce-turn-verification.mjs --write` then the validator. GPX alone must never set turn direction.

**Skill sources (in repo):** `docs/hermes/skills/send-it/` — installed to `%LOCALAPPDATA%\hermes\skills\send-it\` by the install script.

**Reports:** `docs/reviews/` — Hermes writes; Cursor reads P0/P1 and fixes.

**Workflow:** Hermes report → Cursor fixes → `node scripts/mobile-review-preflight.mjs` → merge to `main`.

### Hermes health check (review / repair gate)

Run after headline or app changes, on a schedule, or before deploy:

```powershell
# From repo root (Windows — Hermes)
.\scripts\health-check.ps1

# Or cross-platform
node scripts/health-check.mjs

# From api folder
cd api && npm run health-check
```

**What it checks**

| Step | Pass criteria |
|------|----------------|
| App TypeScript | `npx tsc --noEmit` in `app/` and `android-app/` |
| AU interleave | World feed 1-in-4 AU pattern |
| Scrapers | Required sources present; Peterbom, GPone, Motor Sport MotoGP return items |
| AU cache | `api/data/au-headlines.json` exists with 10+ headlines |
| Live API (optional) | `GET /health` and `/headlines` if API is running |

**Environment**

- `API_URL` — default `http://localhost:3001` (set to Render URL to test production)
- `SKIP_TSC=1` — skip TypeScript step
- `SKIP_SCRAPERS=1` — skip live scrape (faster; uses cache checks only)

**If health check fails**

1. Read the `FAIL` lines in output
2. **Cursor:** fix code in workspace (scrapers, types, app UI)
3. **Hermes:** re-run `npm run refresh-au-headlines` if AU cache is stale; restart API if live checks fail
4. **Ollama (optional):** paste `git diff` + failure log for a second opinion — install Ollama locally first; it does not auto-fix files

**Refresh AU cache manually**

```bash
cd api && npm run refresh-au-headlines
```

**Autonomous monitoring (GitHub + Hermes)**

```powershell
# Hermes skills + cron blocks
.\scripts\setup-hermes-cron.ps1

# Production probe / iOS API smoke test
node scripts/verify-production.mjs
node scripts/ios-smoke-test.mjs
node scripts/android-smoke-test.mjs
```

GitHub Actions (on push to `main`): health-check every 10 min + weekly AU cache refresh — see `.github/workflows/`.
