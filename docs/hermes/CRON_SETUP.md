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
- prompt: Run weekly-review mode. Full preflight (includes validate-track-data.mjs), production health-check (API_URL=https://send-it-ke7r.onrender.com), screen audit, track-data-analyst pass (catalog/geofences/corners/Bend+SMP layouts), coding improvements scan. Write docs/reviews/RR_REVIEW_<today>.md with a Track data section. Compare to prior RR_REVIEW_*.md and TRACK_GPX_ALIGN_*.md. Report only — no commits. End with P0/P1/P2 counts and top 3 Cursor fixes.
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

Then open the report in Cursor and implement P0/P1 items.

## Manual commands

| Task | Command |
|------|---------|
| Preflight only | `node scripts/mobile-review-preflight.mjs` |
| Track data validator | `node scripts/validate-track-data.mjs` |
| Daily gate script | `node scripts/hermes-daily-gate.mjs` |
| Hermes cron setup | `.\scripts\setup-hermes-cron.ps1` |
| Production verify | `node scripts/verify-production.mjs` |
| iOS smoke test | `node scripts/ios-smoke-test.mjs` |
| Full health (prod) | `$env:API_URL='https://send-it-ke7r.onrender.com'; node scripts/health-check.mjs` |
| On-demand expert | In Hermes: `/rr-app-expert` then ask for weekly-review |
| On-demand mobile expert | In Hermes: `/mobile-app-expert` then ask for full-review |

## Reports

Written to `docs/reviews/`:

- `RR_REVIEW_YYYY-MM-DD.md` — full expert review (Hermes; includes Track data section)
- `MOBILE_OPS_YYYY-MM-DD.md` — iOS/Android ops, perf, security (mobile-app-expert); HEALTHY or CURSOR ALERT
- `MOBILE_REVIEW_YYYY-MM-DD.md` — legacy name if mobile-review skill runs alone
- `TRACK_DATA_REVIEW_YYYY-MM-DD.md` / `TRACK_GPX_ALIGN_*.md` — deep track/GPX audits when track-data-analyst runs standalone

## Cursor ↔ Hermes split

| Hermes | Cursor |
|--------|--------|
| Scheduled gates & audits | Implement fixes from reports |
| `docs/reviews/*.md` | `npx tsc --noEmit`, commit, push |
| AU cache refresh (`npm run refresh-au-headlines`) | App UI, types, navigation |

See `AGENTS.md` for the full workflow.
