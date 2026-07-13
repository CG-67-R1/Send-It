# Send-It — Environments & Deployment

Single reference for GitHub, Render (API), and Vercel (web). Update this file when URLs or project settings change.

## Live services

| Service | URL | Health |
|---------|-----|--------|
| **GitHub** | [CG-67-R1/Send-It](https://github.com/CG-67-R1/Send-It) | Default branch: `main` |
| **API (Render)** | https://send-it-ke7r.onrender.com | `GET /health` → `{"ok":true}` |
| **Web (Vercel)** | https://send-it-cg-67-r1s-projects.vercel.app | Production deploys from `main` |

**Note:** GitHub repo homepage may still list an older Vercel alias (`send-it-rosy.vercel.app`). The active project is **send-it** under team **cg-67-r1s-projects**.

## Vercel project settings

| Setting | Value |
|---------|--------|
| Project | `send-it` (`prj_BR4EQilkm4kTjDbAtGtNjsxyPPKn`) |
| Team | `cg-67-r1s-projects` |
| Root directory | `app` |
| Build command | `npm run build` (`expo export --platform web`) |
| Output directory | `dist` |
| Install command | `npm install --legacy-peer-deps` |
| Env var | `EXPO_PUBLIC_API_URL` = `https://send-it-ke7r.onrender.com` |

Config in repo: [`app/vercel.json`](app/vercel.json). Local Vercel link: [`app/.vercel/project.json`](app/.vercel/project.json).

## API URL (app)

Defined in [`app/constants/api.ts`](app/constants/api.ts):

- **Production / default dev:** `https://send-it-ke7r.onrender.com`
- **Override:** copy [`app/.env.example`](app/.env.example) → `app/.env` and set `EXPO_PUBLIC_API_URL`
- **Android emulator (local API):** `http://10.0.2.2:3001` when no env override

## Git branches

| Branch | Status |
|--------|--------|
| `main` | **Source of truth** — local and `origin/main` should match |
| `feat/calendar-au-timely-ics` | Stale; superseded by `main` (safe to delete after review) |
| `cursor/setup-dev-environment-412e` | Open PR #1 |
| `cursor/hermes-project-review-412e` | Open PR #2 |
| `feature/avatars` | Stale feature branch |

Local `main` should track `origin/main`:

```bash
git branch --set-upstream-to=origin/main main
```

## Health checks

```powershell
# Full gate (TypeScript, scrapers, caches, optional live API)
node scripts/health-check.mjs

# Production API only
$env:API_URL='https://send-it-ke7r.onrender.com'; node scripts/health-check.mjs

# App TypeScript only
cd app && npx tsc --noEmit
```

## Deploy flow

1. Merge to **`main`** on GitHub.
2. **Render** redeploys API if connected to `main` (or manual deploy in Render dashboard).
3. **Vercel** auto-deploys `app/` on push to `main`.
4. Confirm: Vercel deployment **READY**, `GET /health` on Render OK, web app loads headlines.

PoC details and troubleshooting: [`POC_HOSTING_GUIDE.md`](POC_HOSTING_GUIDE.md).

## Hermes (RR app expert)

Hermes runs scheduled app reviews and coding-improvement audits. Setup: [`docs/hermes/CRON_SETUP.md`](docs/hermes/CRON_SETUP.md). Reports: `docs/reviews/`.
