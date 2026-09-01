# Hermes — RoadRace App Expert (scheduled reviews)

Hermes is the **standing RR app expert**: daily health gates + weekly full reviews with coding-improvement suggestions. Fixes happen in **Cursor**; Hermes writes reports only.

## One-time setup

### 1. Install skills into Hermes

From repo root (PowerShell):

```powershell
.\scripts\install-hermes-skills.ps1
```

Or use the all-in-one helper (installs skills, creates cron jobs, starts gateway):

```powershell
.\scripts\setup-hermes-cron.ps1
```

Optional delivery override: `.\scripts\setup-hermes-cron.ps1 -Deliver local`

This creates:
- **Send-It daily gate** — weekdays 8:00, script-only (no Nous tokens on pass), delivers to Telegram
- **Send-It weekly review** — Mondays 9:00, uses `rr-app-expert` + `mobile-review` + `track-data-analyst` skills
- **Mobile app expert cron** — paste the Wednesday block below after install (not auto-created by this script yet)
- **Agent Play** — Thursdays 9:00: weekly-skills **and** android-app code/security preflight (`PLAY_PREFLIGHT`). Created by `setup-hermes-cron.ps1` (or paste the Thursday block)
- **Agent Apple skill growth** — paste the Friday block below after install
- **AI enterprise watch** — paste the Sunday 18:00 block below after install (not auto-created by this script yet)

Manual CLI alternative (if you prefer chat-based setup):

This copies `docs/hermes/skills/send-it/*` → `%LOCALAPPDATA%\hermes\skills\send-it\`.

### 2. Create cron jobs in Hermes

Open Hermes (`hermes` in a terminal). Paste **one block at a time** and confirm delivery target (Telegram, local, etc.) when prompted.

**Daily gate** (weekdays 8:00 AM ACST — `0 8 * * 1-5` in server local time; adjust if your Hermes host uses UTC):

```
Create a cron job:
- schedule: 0 8 * * 1-5
- workdir: C:\Users\Administrator\.cursor\Send-It
- skills: ["send-it/rr-app-expert"]
- prompt: Run daily-gate mode for Send-It. Execute scripts/hermes-daily-gate.mjs from repo root. If exit 0 and no output, reply "Send-It daily gate: OK". If output or non-zero exit, summarize failures and top Cursor action items. Do not edit code.
- continuable: false
```

**Weekly full review** (Mondays 9:00 AM):

```
Create a cron job:
- schedule: 0 9 * * 1
- workdir: C:\Users\Administrator\.cursor\Send-It
- skills: ["send-it/rr-app-expert", "send-it/mobile-review", "send-it/track-data-analyst"]
- prompt: Run weekly-review mode. Full preflight (includes validate-track-data.mjs), production health-check (API_URL=https://send-it-ke7r.onrender.com), screen audit, track-data-analyst pass (catalog/geofences/corners/Bend+SMP layouts, plus Track Memory geometry + elevation + diagnose-track-memory.mjs + compact info maps). Write docs/reviews/RR_REVIEW_<today>.md with a Track data section that includes a Track Memory subsection. Compare to prior RR_REVIEW_*.md, TRACK_GPX_ALIGN_*.md, and TRACK_MEMORY_REVIEW_*.md. Report only — no commits, no bake. End with P0/P1/P2 counts and top 3 Cursor fixes.
- continuable: true
```

**Mobile app expert — iOS/Android ops** (Wednesdays 10:00 AM):

Paste this block into Hermes to create the standing mobile developer role (health, performance, design quality, security). Install skills first (`.\scripts\install-hermes-skills.ps1`) so `send-it/mobile-app-expert` is available.

```
Create a cron job:
- schedule: 0 10 * * 3
- workdir: C:\Users\Administrator\.cursor\Send-It
- skills: ["send-it/mobile-app-expert", "send-it/mobile-review"]
- prompt: You are the Send-It expert mobile app developer for iOS and Android. Maintain a high skill level and stay current with Expo, React Native, iOS, and Android practices. Run health-ops (full-review depth). Execute mobile-review-preflight.mjs; production checks with API_URL=https://send-it-ke7r.onrender.com (health-check.mjs, verify-production.mjs, ios-smoke-test.mjs when available). Review the RR app for iOS and Android build fitness, performance (slow/hang), reliability, design quality, and security (secrets, unexpected/malicious connections, TLS, permissions, untrusted input). Write docs/reviews/MOBILE_OPS_<today>.md. If healthy with no material bugs: open with "MOBILE OPS: HEALTHY — no bugs requiring Cursor action." If poor design, unhealthy, slow, hanging, crash-prone, or insecure: open with "MOBILE OPS: CURSOR ALERT — action required." Recommend concrete Cursor fixes for every P0/P1. Compare to prior MOBILE_OPS_*.md. Report only — no commits. End with HEALTHY or CURSOR ALERT, P0/P1/P2 counts, and top Cursor fixes (or none).
- continuable: true
```

**Agent Play — Android/Play skills + code/security** (Thursdays 9:00 AM):

Paste this block so Agent Play refreshes dated Android/Play/Expo knowledge **and** reviews `android-app/` (tsc, secrets, permissions, Play policy). Install skills first (`.\scripts\install-hermes-skills.ps1`) so `send-it/agent-play` is available.

```
Create a cron job:
- schedule: 0 9 * * 4
- workdir: C:\Users\Administrator\.cursor\Send-It
- skills: ["send-it/agent-play"]
- prompt: You are Agent Play. First run weekly-skills. Fetch Android security bulletins, Play target API requirements, 16 KB page-size docs, Play policy center, and Expo Android/Skia issues. Rewrite docs/hermes/skills/send-it/agent-play/CURRENT.md (As of today; keep last 8 weeks of changelog). Write docs/reviews/AGENT_PLAY_SKILLS_<today>.md summarizing what changed. Then run .\\scripts\\install-hermes-skills.ps1. Second, run pre-submit against android-app/ (not app/). Execute mobile-review-preflight.mjs and npx tsc --noEmit in android-app. Audit secrets, TLS/hosts, permissions (blocked RECORD_AUDIO / background location / FGS vs SYSTEM_ALERT_WINDOW), Data safety vs PRIVACY.md, targetSdk 36, 16 KB ELF. Write docs/reviews/PLAY_PREFLIGHT_<today>.md with SUBMIT or HOLD. Do not invent a Play app id. Do not edit android-app/, app/, or api/. Do not bake. End with P0/P1/P2 and top Cursor fixes.
- continuable: true
```

**Agent Apple — grow iOS/ASC skillset** (Fridays 9:00 AM):

Paste this block so Agent Apple refreshes dated iOS/Xcode/ASC knowledge. Install skills first (`.\scripts\install-hermes-skills.ps1`) so `send-it/agent-apple` is available.

```
Create a cron job:
- schedule: 0 9 * * 5
- workdir: C:\Users\Administrator\.cursor\Send-It
- skills: ["send-it/agent-apple"]
- prompt: You are Agent Apple. Run weekly-skills. Fetch Apple security releases, App Store Review Guidelines, Developer News, WWDC iOS guide, and Expo/Xcode 27 UIScene issues. Rewrite docs/hermes/skills/send-it/agent-apple/CURRENT.md (As of today; keep last 8 weeks of changelog). Write docs/reviews/AGENT_APPLE_SKILLS_<today>.md summarizing what changed. Then run .\\scripts\\install-hermes-skills.ps1. Do not edit app/ or api/. Do not bake. End with what testers should know this week.
- continuable: true
```

**AI enterprise watch** (Sundays 6:00 PM):

Paste this block so Hermes monitors enterprise-approvable AI platforms (OpenAI, Anthropic, Google, Microsoft, Bedrock, GitHub Copilot, Cursor) and delivers a **short Telegram message**. Install skills first (`.\scripts\install-hermes-skills.ps1`) so `send-it/ai-enterprise-watch` is available.

```
Create a cron job:
- schedule: 0 18 * * 0
- workdir: C:\Users\Administrator\.cursor\Send-It
- skills: ["send-it/ai-enterprise-watch"]
- prompt: You are the AI enterprise watch. Run weekly-watch. Fetch official sources in docs/hermes/skills/send-it/ai-enterprise-watch/resources.md. Compare to CURRENT.md and the latest docs/reviews/AI_ENTERPRISE_WATCH_*.md. Assess new releases only for real capability, enterprise approval path, and local fit (Send-It Coach/Ask, Cursor, GitHub/GHE, defensive cybersecurity). If a platform made no significant progress, say so. Include an unsubstantiated-hype section. Rewrite docs/hermes/skills/send-it/ai-enterprise-watch/CURRENT.md (As of today; keep last 8 weeks of changelog). Write docs/reviews/AI_ENTERPRISE_WATCH_<today>.md. Then run .\\scripts\\install-hermes-skills.ps1. Do not edit app/ or api/. The delivered message must be the short form only (headline, relevant outcomes, no-progress, hype, 0-2 actions). Do not pad with model scoreboards.
- continuable: true
```

### 3. Verify

In Hermes:

```
/rr-app-expert
Run on-demand weekly-review now. Write the report to docs/reviews/.
```

Or for the mobile expert role:

```
/mobile-app-expert
Run on-demand full-review now. Write docs/reviews/MOBILE_OPS_<today>.md. Notify Cursor if unhealthy; otherwise report HEALTHY.
```

Or for Track Memory (geometry + elevation + info maps):

```
/track-data-analyst
Run track memory review. Geometry + elevation + diagnose + compact info maps. Report only.
```

Or for Agent Apple (pre-App Store Connect iOS review):

```
/agent-apple
Review this app before submitting to App Store Connect. Identify iOS issues. Report only.
```

Or for Agent Play (pre-Google Play Android review):

```
/agent-play
Review this app before submitting to Google Play. Identify Android issues. Report only.
```

Or for AI enterprise watch:

```
/ai-enterprise-watch
Run weekly-watch now. Relevant outcomes only. Flag hype. Report only.
```

Then open the report in Cursor and implement P0/P1 items.

## Manual commands

| Task | Command |
|------|---------|
| Preflight only | `node scripts/mobile-review-preflight.mjs` |
| Track data validator | `node scripts/validate-track-data.mjs` |
| Track Memory diagnose | `node scripts/diagnose-track-memory.mjs` |
| Track Memory info maps | `node scripts/build-track-info-maps.mjs` |
| Daily gate script | `node scripts/hermes-daily-gate.mjs` |
| Hermes cron setup | `.\scripts\setup-hermes-cron.ps1` |
| Production verify | `node scripts/verify-production.mjs` |
| iOS smoke test | `node scripts/ios-smoke-test.mjs` |
| Android smoke test | `node scripts/android-smoke-test.mjs` |
| Full health (prod) | `$env:API_URL='https://send-it-ke7r.onrender.com'; node scripts/health-check.mjs` |
| On-demand expert | In Hermes: `/rr-app-expert` then ask for weekly-review |
| On-demand mobile expert | In Hermes: `/mobile-app-expert` then ask for full-review |
| On-demand Track Memory | In Hermes: `/track-data-analyst` then ask for track memory review |
| On-demand Agent Apple | In Hermes: `/agent-apple` then ask for pre-ASC iOS review |
| On-demand Agent Play | In Hermes: `/agent-play` then ask for pre-Play Android review |
| On-demand AI enterprise watch | In Hermes: `/ai-enterprise-watch` then ask for weekly-watch |

## Reports

Written to `docs/reviews/`:

- `RR_REVIEW_YYYY-MM-DD.md` — full expert review (Hermes; includes Track data + Track Memory subsection)
- `MOBILE_OPS_YYYY-MM-DD.md` — iOS/Android ops, perf, security (mobile-app-expert); HEALTHY or CURSOR ALERT
- `MOBILE_REVIEW_YYYY-MM-DD.md` — legacy name if mobile-review skill runs alone
- `TRACK_DATA_REVIEW_YYYY-MM-DD.md` / `TRACK_GPX_ALIGN_*.md` — deep track/GPX audits when track-data-analyst runs standalone
- `TRACK_MEMORY_REVIEW_YYYY-MM-DD.md` — on-demand Track Memory geometry / elevation / ride-test review
- `ASC_PREFLIGHT_YYYY-MM-DD.md` — Agent Apple pre-App Store Connect iOS review (SUBMIT / HOLD)
- `AGENT_APPLE_SKILLS_YYYY-MM-DD.md` — weekly Agent Apple CURRENT.md refresh
- `PLAY_PREFLIGHT_YYYY-MM-DD.md` — Agent Play pre-Google Play Android review (SUBMIT / HOLD)
- `AGENT_PLAY_SKILLS_YYYY-MM-DD.md` — weekly Agent Play CURRENT.md refresh
- `AI_ENTERPRISE_WATCH_YYYY-MM-DD.md` — enterprise AI landscape (relevant outcomes + hype); Telegram gets the short form

## Cursor ↔ Hermes split

| Hermes | Cursor |
|--------|--------|
| Scheduled gates & audits | Implement fixes from reports |
| `docs/reviews/*.md` | `npx tsc --noEmit`, commit, push |
| AU cache refresh (`npm run refresh-au-headlines`) | App UI, types, navigation |

See `AGENTS.md` for the full workflow.
