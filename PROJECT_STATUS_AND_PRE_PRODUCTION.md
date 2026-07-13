# RoadRace — Project Status & Pre-Production Brief

**Last updated:** Error-check and cleanup pass. Use this as the status snapshot and pre-production checklist before moving to production.

---

## 1. Error check summary (completed)

| Check | Status |
|-------|--------|
| **App TypeScript** (`cd app && npx tsc --noEmit`) | ✅ Passes |
| **App Linter** (src/) | ✅ No errors |
| **API load** (`cd api && node server.js`) | ✅ Starts on port 3001 |
| **API qa.js** (duplicate `options` variable) | ✅ Fixed (renamed to `choices` in fallback branch) |

### Code fixes applied in this pass

- **priority1Notifications.ts** — `NotificationBehavior` updated: added `shouldShowBanner`, `shouldShowList`; removed deprecated `shouldShowAlert`-only usage.
- **ChangeAvatarScreen.tsx** — `CameraType.Front` → `CameraType.front`; added missing style `optionButtonActiveStyle`; fixed style reference.
- **OnboardingScreen.tsx** — `noFaceFrameId` null coalesced to `undefined` for type; `CameraType.Front` → `CameraType.front`.
- **avatarPhoto.ts / bikePhoto.ts** — Switched to `expo-file-system/legacy` for `documentDirectory`, `getInfoAsync`, `EncodingType` (current expo-file-system main export uses new API).
- **api/qa.js** — Resolved duplicate declaration: inner variable renamed from `options` to `choices` in the knowledge-based trivia fallback.

---

## 2. Cleanup (completed)

- **Removed:** `app/assets/avatars/README.md` (legacy note; avatars are in `app/avatar/` and that folder was unused).
- **Optional:** If `app/assets/avatars` is now empty, you can delete the folder manually.

No other unused or discarded files were found that are referenced by the app or API.

---

## 3. Project brief — what exists today

### 3.1 App (Expo / React Native)

- **Platforms:** iOS, Android, Web (Expo export for web deploy).
- **Entry:** `app/App.tsx` — `NavigationContainer` → bottom tabs → stacks (Headlines, Calendar, Q&A, Track Walk, Rider Coach).
- **Screens:**
  - **Onboarding** — First-run flow: bike, rider, activity, avatar (incl. upload photo), nickname; stored via `onboarding.ts` and `avatarPhoto.ts`.
  - **Headlines** — Home: hero image (bike photo or placeholder), RR logo, avatar + nickname; nav buttons to Headlines list, Calendar, Q&A, Track Walk, Coach, Settings.
  - **Headlines list** — Aggregated headlines from API; priority order and custom sources from Settings; pull-to-refresh; optional “Notify for Priority 1”.
  - **Headlines Settings** — Notify for Priority 1; source priority grid; custom RSS sources.
  - **Change Avatar** — Predefined avatars or “Upload my photo” (frame + camera/library); persisted via onboarding + avatar photo storage.
  - **Calendar** — Events from API + optional static fallback.
  - **Q&A** — “Ask” tab: `POST /roadrace-ai/ask` (OpenAI + PDF knowledge base); “Trivia” tab: `GET /qa/trivia` (quiz from API).
  - **Rider Coach** — Coach & Bike Setup tabs; in-app chat via `/roadrace-ai/chat`.
  - **Track Walk** — Track notes (local storage); optional speech; share.
  - **Import Track Notes** — Shared/import flow for track notes.
- **Config:** `app/constants/api.ts` — If `EXPO_PUBLIC_API_URL` is set, it is used (dev and prod); else dev uses LAN IP or Android emulator URL.
- **Other:** Sentry (non-dev), Expo Fonts (Race Sport), Firebase Analytics (optional), notifications via `expo-notifications`.

### 3.2 API (Node / Express)

- **Location:** `api/` (ESM).
- **Endpoints:** `/health`, `/`, `/sources`, `/headlines`, `/headlines/custom`, `/qa/search`, `/qa/trivia`, `/calendar`, `POST /roadrace-ai/chat`, `POST /roadrace-ai/ask`.
- **Data:** Scrapers for headlines; `api/data/` for calendar/sources; `api/Q&A/` for knowledge/trivia (e.g. `trivia-bank.json`, `Q&A_with_ratings.json`, `AUS_Q&A.json`); RoadRace AI via `OPENAI_API_KEY` and `api/roadraceAi.js`.
- **Scripts:** `ingest-qa`, `scrape-pdfs`, `build-trivia` (see `api/package.json`).

### 3.3 Hosting / deployment (current intent)

- **API:** Deploy `api/` to Render (or similar); set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) in env.
- **Web app:** Build with `EXPO_PUBLIC_API_URL` set to API URL; deploy `app/dist` to Vercel (or Netlify). See `POC_HOSTING_GUIDE.md`.
- **Mobile:** Expo Go for dev; production builds would use EAS Build / stores (not yet in scope for this brief).

---

## 4. What’s left before production

### 4.1 Must-have

- [ ] **API env in production** — `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) set on Render (or host) so Q&A “Ask” and Rider Coach work.
- [ ] **Production API URL** — `EXPO_PUBLIC_API_URL` set at build time for web; for native, config (e.g. env or build-time constant) pointing at the same API.
- [ ] **Smoke test** — After deploy: Headlines load, Trivia starts, Ask a question returns a reply, Calendar loads; optional: Rider Coach, Track Walk, avatar upload.
- [ ] **Trivia data** — Ensure `api/Q&A/` has the expected JSON (e.g. from `build-trivia` / ingest) so `/qa/trivia` never returns “Not enough Q&A pairs” in production.

### 4.2 Should-have

- [ ] **Error handling** — Confirm user-facing messages for API down / timeouts (e.g. Q&A and Headlines) are clear and consistent.
- [x] **Rate limits / cost** — `express-rate-limit` on `/roadrace-ai/*` (30 req / 15 min per IP).
- [ ] **Secrets** — No API keys or secrets in repo or client bundle; all secrets in server env only.

### 4.3 Nice-to-have (post–proof of concept)

- [ ] **Tests** — No automated tests in repo today; add unit or integration tests for API and critical app paths.
- [ ] **Monitoring** — Sentry is wired; ensure project/DSN and env are correct for production.
- [ ] **Accessibility** — Quick pass on headings, labels, and contrast (e.g. WCAG 2.1 AA) for main screens.
- [ ] **Docs** — Update root `README.md` with current layout (e.g. `app/avatar/`, `api/roadraceAi.js`, `EXPO_PUBLIC_API_URL`) and link to `POC_HOSTING_GUIDE.md` and this brief.

---

## 5. Quick reference

| Item | Location |
|------|----------|
| API base URL (app) | `app/constants/api.ts` |
| OpenAI / RoadRace AI | `api/roadraceAi.js`; env: `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Headlines scrapers | `api/scrapers.js` |
| Trivia / Q&A | `api/qa.js`; data: `api/Q&A/` |
| Calendar | `api/calendar.js`; data: `api/data/` |
| Hosting (PoC) | `POC_HOSTING_GUIDE.md` |
| Screen/UX brief | `SCREEN_BRIEF_FOR_VISUALS.md` |
| RoadRace AI setup | `api/ROADRACE_AI_README.md` |

---

**Status:** Error check complete; project builds and API runs. Ready to proceed with production checklist when you are.
