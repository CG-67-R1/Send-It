# RoadRace ST – AI Review & Integration Guide

Review of the **ST** (Motorcycle Track Day GPT) AI and how to piece it together with the RoadRace app’s **Rider Coach** and **Bike Setup** tabs.

---

## 1. What You Have (ST Overview)

### 1.1 Role of the AI

- **Single AI, two modes:** Coach (technique, track, session) and Technical (bike setup, suspension, tyres). Same system prompt and knowledge base; the tab in the app can set context (e.g. “coaching” vs “bike setup”).
- **System prompt** (`GPTUpload/system-prompt-core.md` + detailed): Australian track day coach, uses uploaded KB, fallback bike profiles, Quick/Simple vs Detailed/Technical, session tracking if conversation stays open, weather via track→location mapping.
- **Sign-off:** “Your Track Day Guidance Counsellor (who can't be sued — because I don't exist).”

### 1.2 Knowledge Base Layout

| Area | Content | Use in app |
|------|--------|------------|
| **Coach** | `riding-techniques/` (body position, braking, cornering, overtaking, technique-by-improvement), `coaching-index.md`, `session-tracking-guide.md`, `novice-friendly-guidelines.md` | Rider Coach tab |
| **Tracks** | `track-analysis/Track_Riding_KB_AllTracks_v1.md` (+ per-track files). Section-by-section: Shape, Priority, Reference points, Hazards, Bike-class notes, Common mistakes, Overtake, Confidence, Source notes | Coach (track-specific advice) |
| **Bike setup** | `suspension/`, `chassis/geometry-calculations.md`, `equipment/` (tyre wear, Ohlins), `bike-specs/`, tire pressure/weather guides, `bike-category-reference.md` | Bike Setup tab |
| **Cross-cutting** | `technique-by-improvement.md`, `tire-wear-patterns-comprehensive.md`, `tire-pressure-weather-troubleshooting-guide.md`, `capabilities.md` | Both tabs as needed |

### 1.3 “Actions” (Calculations / Tools)

Defined in `GPTUpload/gpt-action-schemas.json` (and suggested in `suggested-gpt-actions.md`):

- **Already schematised:** `convert_units`, `calculate_tire_pressure`, `calculate_spring_rate`, `calculate_suspension_geometry`, `analyze_lap_times`.
- **Suggested:** Track information lookup, pressure rise, time zone, etc.

These are the “tools” the AI can call. For an in-app integration you’ll need to implement them either as:

- Backend API routes (e.g. in `api/`), or  
- Logic inside whatever runs the LLM (e.g. OpenAI Assistants tools / function calling).

### 1.4 How It Runs Today

- **Current setup:** Custom GPT in ChatGPT with uploaded files (GPTUpload + knowledge-base). No REST API yet; conversation is in ChatGPT; session stays “live” only while that chat is open.
- **App today:** Rider Coach and Bike Setup tabs are placeholders; `ROADRACE_AI_BASE_URL` in the app is set for a future API.

So “piecing it together” means: **either** expose this same AI through an API the app can call, **or** link the app to the existing GPT (e.g. deep link / WebView) and later replace with a proper API.

---

## 2. Track Information Data – Fine-Tuning Checks

You mentioned there are still fine-tuning checks to do on the track information data. Here’s where that shows up and what to focus on.

### 2.1 Structure of Track Data

- **Single combined track KB:** `Track_Riding_KB_AllTracks_v1.md` (and `tracks-combined.md` in GPTUpload).
- **Per-track files** in `track-analysis/`: e.g. `KB_Mallala_Motorsport_Park.md`, `KB_Phillip_Island_*`, etc.
- **Per section:** Each section has:
  - **Shape** (e.g. Hairpin, Double-apex, Kink)
  - **Priority / what matters**
  - **Stable reference points** (brake boards, kerbs, marshal posts)
  - **Hazards / surface**
  - **Bike-class notes** (SBK/1000, 600/midsize, 300/small)
  - **Common mistakes**
  - **Overtake / passing**
  - **Confidence** (Low / Medium / High)
  - **Source notes** (PDF, rider corrections, “validate on-track”)

### 2.2 Where to Do Fine-Tuning

1. **Confidence and “validate” notes**  
   Many sections say **“Confidence: Medium”** or **“Low–Medium”** with “validate on-bike” / “validate exact markers/lines” / “rider correction”.  
   **Check:**  
   - Which sections are now validated by you or other riders? Bump those to **Confidence: High** and remove “validate” where no longer needed.  
   - Which sections are still guesswork? Keep Confidence lower and maybe add a short “TODO: verify brake marker at X”.

2. **Naming and numbering**  
   - **Mallala:** Source notes say “rider correction—Mallala T1 described as right kink with dip → double-apex left; no 2–3 esses”. Ensure the rest of the doc (and any combined file) consistently uses the corrected turn description and numbering.  
   - **Broadford:** Source says “Source: Sydney Motorsport Park (NSW) Track Guide (1).pdf” for Broadford – confirm that’s intentional (copy-paste from another track guide?) and that turn/section labels match the actual Broadford map.

3. **Brake markers and numbers**  
   - Mallala: “200m marker for 1000cc”, “100m/50m”, “600cc ~75m, literbike 100m”.  
   - **Check:** Do current track boards match (e.g. 200/150/100/50)? If not, update numbers and add a one-line note like “As of [date], boards at 200, 150, 100, 50m”.

4. **Duplication and single source of truth**  
   - Same content appears in: `motorcycle-track-gpt/TRackDayAI-data/tracks/`, `motorcycle-track-gpt/knowledge-base/track-analysis/`, and `GPTUpload/` (e.g. `tracks-combined.md`, `Track_Riding_KB_AllTracks_v1.md`).  
   - **Recommendation:** Pick one canonical set (e.g. `knowledge-base/track-analysis/`). Generate or sync `tracks-combined.md` / `Track_Riding_KB_AllTracks_v1.md` from that (script or manual pass), so fine-tuning is done in one place.

5. **Missing tracks**  
   - Coaching index lists 10 Australian tracks; if you add more (e.g. The Bend East only as .txt), fold them into the same section format and add to the combined track file so the AI can use them.

### 2.3 Suggested Track Data Checklist

- [ ] Run through each track section and set **Confidence** from actual rider feedback.
- [ ] Resolve **Mallala** turn numbering and T1 description everywhere (KB + combined).
- [ ] Confirm **brake marker distances** (and board positions) for each track that mentions them.
- [ ] Decide **canonical track source** (one folder); remove or auto-generate duplicates.
- [ ] Add **“Last validated: YYYY-MM”** or “As of [date]” where you lock in numbers/markers.

---

## 3. Piecing It Together With the App

### 3.1 Option A – OpenAI Assistants API (recommended if you want in-app chat)

- **Idea:** Recreate the same behaviour in the app using the **Assistants API**: one Assistant (or two: Coach vs Bike Setup) with the same system prompt and knowledge.
- **Knowledge:** Upload the same Markdown/files as **files** on the Assistant, or use a **vector store** (chunk + embed the KB and attach to the Assistant).
- **Tools:** Implement the action schemas as **Assistant tools** (e.g. “calculate_tire_pressure” calls your backend or a serverless function that returns the result; the Assistant gets the result and continues).
- **App:** Coach tab and Bike Setup tab each send messages to the same Assistant (or to two Assistants with different system-prompt emphasis). Show conversation in a chat UI; keep the tab “live” by not unmounting (you already do that).
- **Session:** Session is “live” as long as the app keeps the same thread_id; no need to keep a ChatGPT tab open.

**Pros:** Full control in your app, same UX as current Rider Coach/Bike Setup. **Cons:** Need to host the tools (or use Code Interpreter for some maths) and manage API keys/costs.

### 3.2 Option B – Your Own Backend (RoadRace API) + LLM + RAG

- **Idea:** Add a **RoadRace AI** backend under `api/` (or a separate service): REST endpoint that accepts a message and optional “mode” (coach | bikesetup).
- **Backend:**  
  - Load system prompt (from ST) and, by mode, emphasise coaching vs technical.  
  - RAG: Embed the relevant KB (tracks, techniques, suspension, tyres, etc.) and retrieve chunks for each query.  
  - Call an LLM (OpenAI, or another provider) with system prompt + retrieved context + conversation history; return the reply.  
  - Implement the “actions” as API routes (e.g. `POST /roadrace-ai/tools/calculate_tire_pressure`). Either the LLM does function calling and your backend runs the tool and re-calls the LLM, or the app calls the tool when the user asks for a calculation.
- **App:** Coach and Bike Setup tabs POST to this API and display the streamed or final reply. `ROADRACE_AI_BASE_URL` points here.

**Pros:** No dependency on ChatGPT product; you own data and prompts. **Cons:** More work (RAG pipeline, tool routing, possibly streaming).

### 3.3 Option C – Link to the Existing GPT (fastest)

- **Idea:** Keep using the Custom GPT in ChatGPT. In the app, **Rider Coach** and **Bike Setup** tabs open the GPT conversation (e.g. deep link or in-app WebView to the GPT URL). No backend AI yet.
- **Session:** “Live” only while the ChatGPT conversation is open; if the user leaves ChatGPT, the app can’t show that history (unless you later add a “last reply” cache or similar).

**Pros:** No backend, no API; your ST GPT is already the coach + bike setup. **Cons:** Not fully in-app; UX is “open browser / WebView” rather than native chat.

---

## 4. Recommended Next Steps

1. **Track data (short term)**  
   - Do the track fine-tuning checks above (confidence, Mallala numbering, brake markers, single source of truth).  
   - Keeps the AI accurate regardless of how you integrate.

2. **Decide integration path**  
   - **Quick:** Option C (link/WebView to GPT) so the app “uses” the AI immediately.  
   - **Proper in-app:** Option A (Assistants API) or B (your API + RAG).  
   - If you choose A or B, next step is: one backend route (e.g. `POST /roadrace-ai/chat`) that accepts `{ "message", "mode": "coach" | "bikesetup" }` and returns the AI reply (and later: tool calls for pressure, spring rate, etc.).

3. **App wiring**  
   - When you have an endpoint: in the app, call `ROADRACE_AI_BASE_URL` from the Rider Coach and Bike Setup tabs (e.g. chat input → POST → show reply).  
   - Keep both tabs mounted so state stays live (already done).

4. **Actions/tools**  
   - Implement at least: `convert_units`, `calculate_tire_pressure`, `calculate_spring_rate` (and optionally `calculate_suspension_geometry`, `analyze_lap_times`) as backend routes or Assistants tools, so the in-app AI can do the same things as your current GPT.

---

## 5. Summary

- **ST** = one Motorcycle Track Day GPT (coach + bike setup) with a strong KB (tracks, techniques, suspension, tyres) and defined tools. It’s currently used as a Custom GPT in ChatGPT.
- **Track data:** Focus fine-tuning on confidence levels, Mallala corrections, brake marker accuracy, and a single canonical source for track files.
- **App:** Rider Coach = coach/technique/track; Bike Setup = technical/setup. Same AI, context can be set by tab or by first message.
- **Integration:** Either link the app to the existing GPT (fast) or expose the same behaviour via Assistants API or your own RoadRace API (full in-app experience). Then implement the calculation actions as tools so the in-app AI matches what you have in the GPT.

If you tell me which option you prefer (C for now vs A or B), I can outline the exact API shape and app changes (screens, API client, env) for the next step.
