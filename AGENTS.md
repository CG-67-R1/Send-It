# Send-It (RoadRace) — Agent Context

Mobile app for motorcycle and racing headlines, plus Q&A, calendar, track walk, and rider coach features.

## Repo layout

- `app/` — Expo (React Native) client; TypeScript; main entry `App.tsx`
- `api/` — Node.js / Express headlines + Q&A API; ESM (`"type": "module"`)
- `Q&A/` — PDF knowledge base; scrape via `cd api && npm run scrape-pdfs`

## Stack

- **App:** Expo ~54, React 19, React Navigation 7, AsyncStorage
- **API:** Express, cheerio, rss-parser, pdf-parse, OpenAI SDK (Q&A)
- **Dev:** Node LTS; API default port `3001`

## Commands

```bash
# API (required for headlines)
cd api && npm install && npm start

# App
cd app && npm install && npx expo start

# Checks before merge to main
cd api && npm run health-check
cd ../app && npx tsc --noEmit
```

## Configuration

- App API URL: `app/constants/api.ts` (`getApiBaseUrl()`)
  - Android emulator: `http://10.0.2.2:3001`
  - iOS simulator: `http://localhost:3001`
  - Physical device: LAN IP of dev machine
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

- `README.md` — quick start and features
- `PROJECT_STATUS_AND_PRE_PRODUCTION.md` — health checks and pre-prod work
- `POC_HOSTING_GUIDE.md` — Render / Vercel hosting notes
- `SCREEN_BRIEF_FOR_VISUALS.md` — screen UX intent

## Hermes + Cursor split

- **Hermes:** terminal automation, long sessions, cron, multi-step repo work from CLI
- **Cursor:** in-editor edits, review, and fast targeted changes in this workspace
- Both read this file; keep project rules here, not duplicated in chat

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
| App TypeScript | `npx tsc --noEmit` in `app/` |
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

### Hermes mobile developer review (on-demand)

Full Expo app audit — **report only**; fixes happen in **Cursor**.

**When to run:** before a major release, after large app changes, or when you want a systematic screen-by-screen review.

```powershell
cd C:\Users\Administrator\.cursor\Send-It
hermes
# In Hermes: /skill send-it/mobile-review
```

Or paste:

> Load skill `send-it/mobile-review`. Run preflight, audit every screen in `app/src/screens/`, write `docs/reviews/MOBILE_REVIEW_<date>.md`. Report only — do not commit or fix.

**Preflight only (no full audit):**

```powershell
node scripts/mobile-review-preflight.mjs
```

**Output:** `docs/reviews/MOBILE_REVIEW_*.md` with P0/P1/P2 findings and suggested fix order.

**Workflow:** Hermes writes report → Cursor implements fixes → re-run `npx tsc --noEmit` and `node scripts/health-check.mjs`.

**Skill location:** `%LOCALAPPDATA%\hermes\skills\send-it\mobile-review\SKILL.md`

**Limits:** Hermes reviews code and CLI gates; device/visual QA needs manual Expo Go steps listed in the report.
