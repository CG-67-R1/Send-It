# RoadRace AI – In-app Rider Coach & Bike Setup

The **Rider Coach** and **Bike Setup** tabs in the app now use an AI that runs **inside your hosted API**. Users never leave the app.

The **Q&A → Ask** tab uses the same OpenAI backend in **Ask mode**: it retrieves curated knowledge-base excerpts first, then synthesizes a single-shot answer.

## How it works

1. **Backend** (`api/`):
   - `POST /roadrace-ai/chat` — Coach and Bike Setup multi-turn chat (`mode: 'coach' | 'bikesetup'`).
   - `POST /roadrace-ai/ask` — single-shot Q&A (`message`, optional `mode: 'ask' | 'rules'`). Default Ask uses general KB; `mode: 'rules'` scopes retrieval to MoMS JSON in `Q&A/` and returns rule locations. Returns `{ reply, sources, fromKb }`.
2. **App**:
   - Rider Coach screen: Coach | Bike Setup tabs with in-app chat.
   - Q&A screen → Ask tab: general Ask plus **Official rule check?** (MoMS) below it.
3. **Hosting**: Your existing API (e.g. Render, Vercel, or any Node host) serves both the rest of the API and RoadRace AI routes. Set `OPENAI_API_KEY` in the server environment so the AI works.

## Setup

1. **Get an OpenAI API key** from [platform.openai.com](https://platform.openai.com/api-keys).
2. **Configure the server**  
   - Local: copy `api/.env.example` to `api/.env` and set `OPENAI_API_KEY=sk-...`. (`server.js` loads `.env` via dotenv on start.)  
   - **Render (production):** [dashboard.render.com](https://dashboard.render.com) → your API service (`send-it-ke7r`) → **Environment** → add `OPENAI_API_KEY` with your key → **Save Changes** (Render redeploys automatically).  
   - Never put the key in the app or in git.
3. **Verify:** `GET /health` should return `{ "ok": true, "roadraceAi": true }`. If `roadraceAi` is `false`, the key is missing on that server.
4. **Deploy** your API as you already do.

## Optional

- **Model**: Default is `gpt-4o-mini`. Set `OPENAI_MODEL=gpt-4o` (or another model) in the server env if you want a different model.
- **FAQs**: Edit `api/data/rider_ai_faqs.json` (and sync to the app bundle). The file has `coach` and `bikesetup` arrays of `{ id, question, answer }`. FAQs appear as dropdowns in the Rider Coach screen and are injected into the AI system prompt for interrogation.
  ```bash
  # From repo root — copy your Downloads file into both API and app:
  node scripts/sync-rider-ai-faqs.mjs "C:\Users\cgreene\Downloads\rider_ai_faqs.json"
  ```
  `GET /roadrace-ai/faqs` returns the same data from the API.
- **Full KB**: Coach/Bike Setup use `rider_ai_faqs.json` in the system prompt. **Ask mode** uses `retrieveForAsk()` in `api/qa.js` to pull excerpts from `Q&A/knowledge.json` and PDF-derived JSON before calling OpenAI. Web search fallback is planned for a later phase.
- **MoMS Official rule check**: `npm run scrape-moms` → `Q&A/MoMS-<year>-road-historic.json`. Rules mode (`mode: 'rules'`) retrieves **only** that local JSON (no internet). Full: chs 1–5, 6 Road Race, 7 Historic, 17 Appendices; other disciplines are reference pointers. Hermes health-check warns when `nextReviewDue` passes.

## Files

- `api/roadraceAi.js` – system prompts, Coach/Bike Setup chat, and Ask-mode `askChat()`.
- `api/qa.js` – `retrieveForAsk()` KB retrieval for Ask mode.
- `api/server.js` – registers `POST /roadrace-ai/chat` and `POST /roadrace-ai/ask`.
- `app/src/screens/RiderCoachScreen.tsx` – two-tab screen with in-app chat for Coach and Bike Setup.
- `app/src/screens/QAScreen.tsx` – Ask tab calls `/roadrace-ai/ask`.
