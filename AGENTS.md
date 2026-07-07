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

- **Web/iOS simulator API URL:** In dev, `app/constants/api.ts` uses `http://localhost:3001` for web and iOS simulator. Android emulator uses `10.0.2.2:3001`; physical devices use `EXPO_PUBLIC_DEV_MACHINE_IP` or the `DEV_MACHINE_IP` constant. Set `EXPO_PUBLIC_API_URL` to override in any environment.
- **Onboarding avatar step can stress the browser.** Step 5 loads large PNG avatars; on web this can still crash Chrome with "Aw, Snap!" on low-memory VMs. To skip onboarding for testing, set in the browser console and reload:
  `localStorage.setItem('@roadrace_onboarding_done','true')`
  `localStorage.setItem('@roadrace_onboarding_answers', JSON.stringify({favouriteBike:'Yamaha R1', favouriteRider:'Valentino Rossi', activity:'just_love_bikes', riderNickname:'Tester'}))`
  (AsyncStorage on web = `localStorage`; keys are stored verbatim.)

### Lint / test / build

- **No automated test suite** exists. The project's check is a TypeScript typecheck for the app: `cd app && npx tsc --noEmit`.
- **Build (web):** `cd app && npm run build` (`expo export --platform web`) — production build; prefer the dev server above for development.
