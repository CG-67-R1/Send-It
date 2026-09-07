# Staged scale-up by active app users

Ops guide for growing RoadRacer (Send-It) without rebuilding the stack. Follow the current stage; advance when a **trigger** fires, even if user count is still below the next band.

This pass is documentation only. Do not add Redis, a GPT queue, or login until the matching stage is explicitly requested.

## Definitions

| Term | Meaning |
|------|---------|
| **Active user** | A person using the app that month. Not a paid plan. The app has no IAP yet. |
| **Concurrent GPT** | Coach / Bike Setup / Ask requests in flight at the same second. |
| **Expected GPT load** | About **10–30%** of active users hit Coach or Ask on a given day. Peak concurrent chats ≈ **1–3%** of active users. A race weekend on shared Wi‑Fi can spike higher. |

**1,000 active users is not 1,000 simultaneous GPT chats.** Peak concurrent GPT at that band is typically tens of requests. True “1,000 chats at once” belongs at Stage 5 (or a special event mode).

```mermaid
flowchart LR
  s50[UpTo_50]
  s200[UpTo_200]
  s1k[UpTo_1000]
  s5k[UpTo_5000]
  s10k[UpTo_10000]
  s50 --> s200 --> s1k --> s5k --> s10k
```

## Advance a stage when any of these fire

- Shared-IP limiter blocking a venue (paddock Wi‑Fi: “Too many AI requests”)
- Render OOM or repeated 90s client timeouts
- OpenAI 429s in a rolling hour
- GPT spend above that stage’s expected band (especially Ask + web search)
- Need a second API instance

## Current baseline

Request path: **app → Render API → OpenAI** (`gpt-4o-mini`). The OpenAI key is server-side only. See [`ENVIRONMENT.md`](../ENVIRONMENT.md) and [`api/roadraceAi.js`](../api/roadraceAi.js).

| Item | Today |
|------|--------|
| AI limiter | **10 requests / 15 minutes / IP** — `roadraceAiLimiter` in [`api/server.js`](../api/server.js). Shared paddock Wi‑Fi trips this before OpenAI does. |
| Client GPT timeout | **90s** — `LLM_API_TIMEOUT_MS` in [`app/constants/api.ts`](../app/constants/api.ts) |
| Identity | None. Optional `APP_API_SECRET` is bundle-visible (`EXPO_PUBLIC_APP_API_SECRET`). |
| Headlines / calendar / trivia | Cached or static. Not the GPT bottleneck. |
| Expensive GPT path | Ask + hosted web search (~$0.01 per search plus tokens). Official rule check can be 2–3 OpenAI calls per question. |
| Coach photos | JSON body up to **8mb** on `POST /roadrace-ai/chat`. |
| PoC hosting | Render + Vercel free-tier notes: [`POC_HOSTING_GUIDE.md`](../POC_HOSTING_GUIDE.md). |

---

## Stage 0 — testers (now, under ~20)

**Trigger to enter:** development and a handful of testers.

| Area | Action |
|------|--------|
| Hosting | Keep PoC hosting (Render + Vercel). Cold start after idle (~30s) is expected. |
| OpenAI | Stay on `gpt-4o-mini`. Set a **billing alert and a hard monthly cap** in the OpenAI dashboard. |
| Rate limits | Leave 10 / 15 min / IP as-is. |
| App / API work | Confirm `APP_API_SECRET` on Render if AI routes are public. No architecture change. |
| Monthly cost band | OpenAI typically a few dollars; Render free or idle. |
| Do not do yet | Redis, user accounts, streaming, multi-instance, GPT queue. |

---

## Stage 1 — up to 50 users

**Trigger to enter:** testers or a small club group (or any Stage 0 trigger that is already hurting testers).

| Area | Action |
|------|--------|
| Hosting | **Paid, always-on Render.** Stop free-tier spin-down. One instance is enough. |
| OpenAI | Stay on `gpt-4o-mini`. Keep the spend cap. Watch 429s in Render logs. |
| Rate limits | Keep 10 / 15 min / IP, but treat **shared-IP as a known failure**. For a planned track-day test, temporarily raise `max` or add a tester bypass header. |
| App / API work | None required beyond hosting and the secret. |
| Monthly cost band | Render on the order of tens of $/mo + OpenAI typically **under ~$20/mo**. |
| Do not do yet | Redis, user accounts, streaming, multi-instance. |

---

## Stage 2 — up to 200 users

**Trigger to enter:** ~50 active users **or** the first paddock/Wi‑Fi complaints of “Too many AI requests”.

| Area | Action |
|------|--------|
| Hosting | Stay on one paid Render instance. |
| Identity | Anonymous **device id** (install UUID in AsyncStorage) sent as a header. Rate-limit **per device**; keep IP as a coarse backstop only. |
| Rate limits | Separate caps: Coach / Bike Setup looser; **Ask / web-search tighter** (cost spike). Count Official rule check as 2–3 OpenAI calls toward quota. |
| OpenAI | Concurrency cap in [`api/roadraceAi.js`](../api/roadraceAi.js) (about **20–30 in-flight**). Retry 429 **once** using `Retry-After`. |
| Photos | Cap Coach image size below the current 8mb JSON path so one instance cannot OOM. |
| Observability | Log route, latency, status, estimated tokens. **No prompt or PII.** |
| Monthly cost band | Render still tens of $/mo. OpenAI often **tens of $/mo**; Ask can dominate if used heavily. |
| Do not do yet | Full login, Redis cluster, GPT queue. |

---

## Stage 3 — up to 1,000 users

**Trigger to enter:** ~200 active users **or** OpenAI 429s / 90s timeouts under load.

Peak GPT concurrent at this band is typically **tens**, not 1,000. Design for about **30–80 in-flight**, not 1,000 sockets.

| Area | Action |
|------|--------|
| Hosting | Larger Render instance (**1–2 GB**). Still **one** process until Redis exists. |
| OpenAI | Confirm paid **Tier 2+** as spend grows. Keep `gpt-4o-mini`; do not default to `gpt-4o`. |
| Prompts | Stop stuffing full FAQ blobs into every Coach call (token × user multiplier). Retrieve **1–3** FAQs per request. |
| UX | Optional: stream Coach replies (SSE) so the 90s spinner is not the only wait state. |
| Abuse | Device id is not enough if the app secret leaks. Add a lightweight attested token or signed request — still not full accounts. |
| Monthly cost band | Render higher tens–low hundreds $/mo. OpenAI: text Coach often tens of $/mo; **Ask/web search can be ~$100/mo** at a few thousand searches. |
| Do not do yet | Second API replica (needs Redis first). Dedicated GPT workers. |

---

## Stage 4 — up to 5,000 users

**Trigger to enter:** ~1,000 active users **or** need for a second API replica.

| Area | Action |
|------|--------|
| Backing store | **Redis** for rate limits and a small GPT job queue. In-process `express-rate-limit` cannot be shared across replicas. |
| Scale-out | **Two** Render (or equivalent) API instances behind the existing URL. |
| GPT | Queue + worker. Per-user concurrent chats = **1**. Under load, **degrade Ask** (no web search) before Coach. |
| Cost control | Daily per-user GPT budget. Kill-switch for `POST /roadrace-ai/ask`. |
| Headlines / web | Unchanged: cached headlines/calendar; Vercel static web is still fine. |
| Monthly cost band | Render ×2 + Redis: low hundreds $/mo plus OpenAI (Ask still the spike). |
| Do not do yet | Split GPT workers onto a separate service unless scrapes starve chat. |

---

## Stage 5 — up to 10,000 users

**Trigger to enter:** ~5,000 active users **or** a national race weekend where thousands open Coach at once.

True “1,000 simultaneous GPT chats” only belongs here (or a special event mode), not at 1,000 monthly users.

| Area | Action |
|------|--------|
| OpenAI | Tier **3–5**; reserved TPM headroom. Optional second project/key for Ask vs Coach. |
| Workers | Dedicated GPT workers separate from the headlines API so scrapes cannot starve chat. |
| Product | If IAP appears later, map Free vs Paid onto the **same** quota machinery — do not rebuild limits. |
| Ops | On-call on 429 rate, p95 latency, and $ per day. |
| Monthly cost band | Infra mid-hundreds $/mo; OpenAI scales with Ask volume. Put a hard cap and Ask kill-switch before marketing spikes. |

---

## What stays the same at every stage until proven otherwise

- Expo app on Vercel (static web) and EAS for stores — 10,000 users do not require a new front-end host.
- Headlines and calendar caches; trivia JSON.
- Server does not persist GPT chat history after the reply (privacy posture in [`docs/legal/PRIVACY.md`](legal/PRIVACY.md)).
- Default model remains `gpt-4o-mini` unless a stage explicitly says otherwise.

## Related

- Hosting URLs and OpenAI env: [`ENVIRONMENT.md`](../ENVIRONMENT.md)
- PoC Render/Vercel: [`POC_HOSTING_GUIDE.md`](../POC_HOSTING_GUIDE.md)
- AI routes: [`api/server.js`](../api/server.js), [`api/roadraceAi.js`](../api/roadraceAi.js)
- Client timeouts: [`app/constants/api.ts`](../app/constants/api.ts)
