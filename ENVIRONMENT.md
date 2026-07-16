# Send-It — Environments & Deployment

Single reference for GitHub, Render (API), and Vercel (web). Update this file when URLs or project settings change.

## Live services

| Service | URL | Health |
|---------|-----|--------|
| **GitHub** | [CG-67-R1/Send-It](https://github.com/CG-67-R1/Send-It) | Default branch: `main` |
| **API (Render)** | https://send-it-ke7r.onrender.com | `GET /health` → `{"ok":true,"roadraceAi":true}` when OpenAI configured |
| **Web (Vercel)** | https://send-it-cg-67-r1s-projects.vercel.app | Public production URL for testers (no Vercel login) |

**Tester share link:** https://send-it-cg-67-r1s-projects.vercel.app — no install, no Vercel account, no app login. First API call after idle may take ~30s (Render free-tier cold start).

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
| Deployment Protection | Vercel Authentication = **Only Preview Deployments** (`ssoProtection.deploymentType: preview`) so production stays public |

Config in repo: [`app/vercel.json`](app/vercel.json). Local Vercel link: [`app/.vercel/project.json`](app/.vercel/project.json).

## API URL (app)

Defined in [`app/constants/api.ts`](app/constants/api.ts):

- **Production / default dev:** `https://send-it-ke7r.onrender.com`
- **Override:** copy [`app/.env.example`](app/.env.example) → `app/.env` and set `EXPO_PUBLIC_API_URL`
- **Android emulator (local API):** `http://10.0.2.2:3001` when no env override

## OpenAI (Coach / Ask — required for AI tabs)

Set on **Render** → service `send-it-ke7r` → **Environment**:

| Variable | Required | Notes |
|----------|----------|--------|
| `OPENAI_API_KEY` | Yes | From [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |

Verify after save (Render redeploys automatically):

```bash
curl https://send-it-ke7r.onrender.com/health
# Expect: {"ok":true,"roadraceAi":true}
```

Without the key, Headlines/Calendar/Trivia work; **Coach, Bike Setup, and Ask fail**.

## Autonomous monitoring

| Layer | What | How |
|-------|------|-----|
| **GitHub Actions** | Health check + Render warm ping | `.github/workflows/health-check.yml` (every 10 min + on push) |
| **GitHub Actions** | Weekly AU cache refresh | `.github/workflows/refresh-au-caches.yml` (Mondays 06:00 UTC) |
| **Hermes (Nous)** | Daily gate + weekly review | `.\scripts\setup-hermes-cron.ps1` then paste cron blocks in Hermes |
| **Scripts** | Production probe | `node scripts/verify-production.mjs` |
| **Scripts** | iOS tab smoke test | `node scripts/ios-smoke-test.mjs` |

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
