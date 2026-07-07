# AGENTS.md

## Cursor Cloud specific instructions

RoadRace is a monorepo with two Node.js services:

- **`api/`** — Express (ESM) headlines/Q&A/calendar API. Serves on **http://localhost:3001**.
- **`app/`** — Expo (React Native) client. Runs on iOS/Android/Web; use the **web** target for headless testing.

Dependencies for both are installed by the update script (`npm ci` in each). Node 22 is fine.

### Running the services

- **API:** `cd api && npm start` (or `npm run dev` for `node --watch`). It scrapes live news sites for `/headlines`, so it needs outbound network access. `OPENAI_API_KEY` (see `api/.env.example`) is only required for the Rider Coach / Bike Setup AI chat (`POST /roadrace-ai/chat`); headlines, calendar, and trivia work without it.
- **App (web):** `cd app && npx expo start --web` (Metro dev server on **http://localhost:8081**).

### Non-obvious caveats

- **Web app → API URL in dev is hardcoded.** `app/constants/api.ts` returns `http://192.168.1.13:3001` (the `DEV_MACHINE_IP`) for web/dev regardless of `EXPO_PUBLIC_API_URL` (that env var is only honored in production builds). To let the web app reach the local API without editing code, alias that IP onto loopback for the session:
  `sudo ifconfig lo:0 192.168.1.13 netmask 255.255.255.255 up`
  Then the browser on this VM reaches the API the app expects. (This is a per-session network setup, not a dependency.)
- **Onboarding avatar step can crash the browser renderer.** Onboarding step 5 (avatar picker) renders ~14 large PNGs (~15MB total, from `app/avatar/`) at once, which can crash the Chrome renderer with "Aw, Snap! (Error code: 4)" even on a 15GB VM. To skip the first-run onboarding gate for testing, set these in the browser console and reload:
  `localStorage.setItem('@roadrace_onboarding_done','true')`
  `localStorage.setItem('@roadrace_onboarding_answers', JSON.stringify({favouriteBike:'Yamaha R1', favouriteRider:'Valentino Rossi', activity:'just_love_bikes', riderNickname:'Tester'}))`
  (AsyncStorage on web = `localStorage`; keys are stored verbatim.)

### Lint / test / build

- **No automated test suite** exists. The project's check is a TypeScript typecheck for the app: `cd app && npx tsc --noEmit`.
- **Build (web):** `cd app && npm run build` (`expo export --platform web`) — production build; prefer the dev server above for development.
