# RoadRace AI – In-app Rider Coach & Bike Setup

The **Rider Coach** and **Bike Setup** tabs in the app now use an AI that runs **inside your hosted API**. Users never leave the app.

The **Q&A → Ask** tab uses OpenAI **Responses API + web search** (Australia-first, then world road racing). **Official rule check** uses local MoMS JSON only (no internet).

## How it works

1. **Backend** (`api/`):
   - `POST /roadrace-ai/chat` — Coach and Bike Setup multi-turn chat (`mode: 'coach' | 'bikesetup'`).
   - `POST /roadrace-ai/ask` — single-shot Q&A (`message`, optional `mode: 'ask' | 'rules'`).
     - Default Ask: Responses API with `web_search` (`user_location` AU). Returns `{ reply, sources, fromKb: false }`.
     - `mode: 'rules'`: MoMS local JSON retrieval only; returns `{ reply, sources, fromKb, momsOnline? }`.
2. **App**:
   - Rider Coach screen: Coach | Bike Setup tabs with in-app chat.
   - Q&A screen → Ask tab: general Ask (web) plus **Official rule check?** (MoMS) below it.
3. **Hosting**: Your existing API (e.g. Render) serves both the rest of the API and RoadRace AI routes. Set `OPENAI_API_KEY` in the server environment so the AI works.

## Setup

1. **Get an OpenAI API key** from [platform.openai.com](https://platform.openai.com/api-keys).
2. **Configure the server**  
   - Local: copy `api/.env.example` to `api/.env` and set `OPENAI_API_KEY=sk-...`. (`server.js` loads `.env` via dotenv on start.)  
   - **Render (production):** [dashboard.render.com](https://dashboard.render.com) → your API service (`send-it-ke7r`) → **Environment** → add `OPENAI_API_KEY` with your key → **Save Changes** (Render redeploys automatically when `main` updates).  
   - Never put the key in the app or in git.
3. **Verify:** `GET /health` should return `{ "ok": true, "roadraceAi": true }`. If `roadraceAi` is `false`, the key is missing on that server.
4. **Deploy:** push to `main` so Render picks up Ask web-search changes (cloud-only; no local API required).

## Optional

- **Model**: Default is `gpt-4o-mini`. Set `OPENAI_MODEL=gpt-4o` (or another Responses-capable model) in the server env if you want a different model.
- **FAQs**: Edit `api/data/rider_ai_faqs.json` (and sync to the app bundle). The file has `coach` and `bikesetup` arrays of `{ id, question, answer }`. FAQs appear as dropdowns in the Rider Coach screen and are injected into the AI system prompt for interrogation.
  ```bash
  # From repo root — copy your Downloads file into both API and app:
  node scripts/sync-rider-ai-faqs.mjs "C:\Users\cgreene\Downloads\rider_ai_faqs.json"
  ```
  `GET /roadrace-ai/faqs` returns the same data from the API.
- **Ask web search**: Implemented in `askChat()` via `client.responses.create` + `{ type: 'web_search' }` with AU `user_location` and blocked low-signal domains. Sources come from URL citations.
- **MoMS Official rule check**: `npm run scrape-moms` → `Q&A/MoMS-<year>-road-historic.json`. Rules mode retrieves **only** that local JSON (no internet). Full: chs 1–5, 6 Road Race, 7 Historic, 17 Appendices; other disciplines are reference pointers. Hermes health-check warns when `nextReviewDue` passes.

## Files

- `api/roadraceAi.js` – system prompts, Coach/Bike Setup chat, Ask web search, and Rules `askChat()`.
- `api/qa.js` – MoMS `retrieveForRules()`; `retrieveForAsk()` remains for health/trivia KB checks.
- `api/server.js` – registers `POST /roadrace-ai/chat` and `POST /roadrace-ai/ask`.
- `app/src/screens/RiderCoachScreen.tsx` – two-tab screen with in-app chat for Coach and Bike Setup.
- `app/src/screens/QAScreen.tsx` – Ask tab calls `/roadrace-ai/ask`.
