# Vercel Review — 2026-07-10

## Executive summary

- P0: 1 | P1: 1 | P2: 0
- Target URL `https://send-it-cg-67-r1s-projects.vercel.app/` returns **HTTP 200** with **Vercel login page** (`<title>Login – Vercel</title>`), not the Send-It Expo web app. User confirmed the app should be **public**.

## HTTP probes

| Check | Result |
|-------|--------|
| `GET /` | 200 — Vercel login wall |
| Alternative URLs (`send-it.vercel.app`, etc.) | 404/500 — not found |
| Expo bundle markers | Absent on target URL |

## Config cross-check (repo)

| Setting | Expected | Repo |
|---------|----------|------|
| Root Directory | `app` | Documented in `VERCEL_SETUP.md` |
| Build | `npm run build` | `app/vercel.json` |
| Output | `dist` | `app/vercel.json` |
| `EXPO_PUBLIC_API_URL` | `https://send-it-ke7r.onrender.com` | `VERCEL_SETUP.md`, `api.ts` fallback |

## Findings

### [P0] Login wall on production URL
**Cause (likely):** Deployment Protection enabled on the Vercel project and/or using a team preview hostname (`*-r1s-projects.vercel.app`) that requires authentication.

**Fix (dashboard — cannot be done from repo alone):**
1. Vercel → Project → **Settings → Deployment Protection** → disable for **Production**.
2. Confirm **Settings → Domains** production URL.
3. Redeploy production from `main`.

**Repo changes in this pass:**
- `VERCEL_SETUP.md` §5 — public access checklist
- `scripts/vercel-deploy-check.mjs` — repeatable HTTP probe

### [P1] Vercel MCP / CLI auth not available in CI session
Vercel MCP requires Cursor user auth; CLI `vercel ls` blocked on device OAuth. Use dashboard or authenticate MCP to inspect build logs.

## Post-push verification

After push to `main` and dashboard protection fix:

```powershell
node scripts/vercel-deploy-check.mjs
```

Pass criteria: title is not "Login – Vercel"; `_expo` markers present.

## Out of scope

- Render API cold-start latency (separate from Vercel)
