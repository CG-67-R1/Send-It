# RoadRace AI – In-app Rider Coach & Bike Setup

The **Rider Coach** and **Bike Setup** tabs in the app now use an AI that runs **inside your hosted API**. Users never leave the app.

## How it works

1. **Backend** (`api/`): `POST /roadrace-ai/chat` accepts `{ message, mode: 'coach' | 'bikesetup', history }` and calls OpenAI Chat Completions with a system prompt tuned for Coach vs Bike Setup.
2. **App**: The Rider Coach screen has two tab buttons (Coach | Bike Setup) on the same screen. Each tab has its own in-app chat; conversations stay in the app and are kept live while the screen is mounted.
3. **Hosting**: Your existing API (e.g. Render, Vercel, or any Node host) serves both the rest of the API and `/roadrace-ai/chat`. Set `OPENAI_API_KEY` in the server environment so the AI works.

## Setup

1. **Get an OpenAI API key** from [platform.openai.com](https://platform.openai.com/api-keys).
2. **Configure the server**  
   - Local: copy `api/.env.example` to `api/.env` and set `OPENAI_API_KEY=sk-...`.  
   - Production: set `OPENAI_API_KEY` in your host’s environment (e.g. Render dashboard, Vercel env vars). Never put the key in the app or in git.
3. **Deploy** your API as you already do. The app uses `API_BASE_URL` (or `EXPO_PUBLIC_API_URL` in production) to talk to this same server, so `/roadrace-ai/chat` is reached automatically.

## Optional

- **Model**: Default is `gpt-4o-mini`. Set `OPENAI_MODEL=gpt-4o` (or another model) in the server env if you want a different model.
- **Full KB**: This version uses a fixed system prompt (no RAG yet). To add your ST knowledge base (tracks, techniques, setup docs), you can later add RAG or switch to the Assistants API and attach files—see `ST/INTEGRATION-REVIEW.md`.

## Files

- `api/roadraceAi.js` – system prompts and OpenAI chat call.
- `api/server.js` – registers `POST /roadrace-ai/chat`.
- `app/src/screens/RiderCoachScreen.tsx` – two-tab screen with in-app chat for Coach and Bike Setup.
