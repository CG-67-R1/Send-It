---
name: coach-kb-safety
description: Edit Rider Coach, Bike Setup, Ask, Q&A, and MoMS knowledge without inventing pressures, rule clauses, or turn hands, and without putting API keys on device. Use when changing roadraceAi, Coach prompts, PDF scrape, GPT knowledge, trivia, or legal disclaimer text.
---

# Coach / Q&A / knowledge safety

Coach, Bike Setup, and Ask call OpenAI from the **Render API**. The app bundle must not contain `OPENAI_API_KEY`.

## When to use

- User mentions Coach, Bike Setup AI, Ask, Q&A, MoMS, trivia, rider-AI knowledge, or GPT pack
- Edits under `api/roadraceAi.js`, `Q&A/`, `docs/gpt-knowledge/`, `ST/`, or client chat helpers (`app/src/utils/coachChat.ts`, `askChat.ts` and android-app twins)

## Liability and facts

- Legal: `docs/legal/TERMS.md` — Coach / Bike Setup / Balance / Q&A / rules are **informational only**
- Authority order: `docs/gpt-knowledge/README.md`
- Racing line in the UI is a suggestion; no modelled lap time
- Turn hands still follow `track_turn_verification.json` — this skill must not invent L/R

Never:

- Invent tyre pressures from category tables
- Invent MoMS / ACU / rule **clause numbers**
- Put keys, tokens, or system prompts in the Expo client
- Drop technician caveats (no travel-shortening / internal shock work without bike details)

`docs/gpt-knowledge/` is a reference / GPT upload set, not live API retrieval.

## Keys and spend

- Key lives on Render (`ENVIRONMENT.md`). Leave it unset in repo `.env` examples.
- Chat is user content → API → OpenAI. Do not log full prompts into git.
- Do not add unauthenticated load tests against production `/roadrace-ai/chat`
- Re-verify whether that route is still open before raising any autonomy on Coach

## Knowledge rebuilds (when files change)

```powershell
cd api
npm run scrape-pdfs
npm run scrape-moms
npm run ingest-qa
npm run test-moms-rules
```

Repo parity (does not replace a Hermes skill — there is no `gpt-knowledge-pack-audit` SKILL.md):

```powershell
node scripts/gpt-repo-parity-audit.mjs
```

Related: `node scripts/build-rider-ai-knowledge.mjs`, `node scripts/sync-rider-ai-faqs.mjs`.

Apply dual-tree if you change client chat helpers (`app/src` and `android-app/src`).

## Do not

- Create a Hermes `gpt-knowledge-pack-audit` or `ui-designer` skill
- Treat Custom GPT files as the runtime catalog
- Commit `Q&A` scrape output that embeds secrets
