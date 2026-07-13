# Hermes — RoadRace App Expert (scheduled reviews)

Hermes is the **standing RR app expert**: daily health gates + weekly full reviews with coding-improvement suggestions. Fixes happen in **Cursor**; Hermes writes reports only.

## One-time setup

### 1. Install skills into Hermes

From repo root (PowerShell):

```powershell
.\scripts\install-hermes-skills.ps1
```

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
- skills: ["send-it/rr-app-expert", "send-it/mobile-review"]
- prompt: Run weekly-review mode. Full preflight, production health-check (API_URL=https://send-it-ke7r.onrender.com), screen audit, coding improvements scan. Write docs/reviews/RR_REVIEW_<today>.md. Compare to prior RR_REVIEW_*.md. Report only — no commits. End with P0/P1/P2 counts and top 3 Cursor fixes.
- continuable: true
```

### 3. Verify

In Hermes:

```
/skill send-it/rr-app-expert
Run on-demand weekly-review now. Write the report to docs/reviews/.
```

Then open the report in Cursor and implement P0/P1 items.

## Manual commands

| Task | Command |
|------|---------|
| Preflight only | `node scripts/mobile-review-preflight.mjs` |
| Daily gate script | `node scripts/hermes-daily-gate.mjs` |
| Full health (prod) | `$env:API_URL='https://send-it-ke7r.onrender.com'; node scripts/health-check.mjs` |
| On-demand expert | In Hermes: `/skill send-it/rr-app-expert` then ask for weekly-review |

## Reports

Written to `docs/reviews/`:

- `RR_REVIEW_YYYY-MM-DD.md` — full expert review (Hermes)
- `MOBILE_REVIEW_YYYY-MM-DD.md` — legacy name if mobile-review skill runs alone

## Cursor ↔ Hermes split

| Hermes | Cursor |
|--------|--------|
| Scheduled gates & audits | Implement fixes from reports |
| `docs/reviews/*.md` | `npx tsc --noEmit`, commit, push |
| AU cache refresh (`npm run refresh-au-headlines`) | App UI, types, navigation |

See `AGENTS.md` for the full workflow.
