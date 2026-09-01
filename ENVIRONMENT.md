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

Scale-up by active user count (50 / 200 / 1,000 / 5,000 / 10,000): [`docs/SCALE_UP_PLAN.md`](docs/SCALE_UP_PLAN.md).

## Sentry (crash diagnostics)

JS exceptions, React render crashes, and native crashes are sent to Sentry when a DSN is present. Leave the DSN unset and reporting stays off (no outbound Sentry traffic).

1. Create a **React Native** project at [sentry.io](https://sentry.io/) (free Developer plan is enough).
2. Copy the project **DSN**.
3. Set env (do not commit the auth token):

| Where | Variable | Purpose |
|-------|----------|---------|
| Vercel (web) + EAS iOS (`app/.env`) + EAS Android (`android-app/.env`) | `EXPO_PUBLIC_SENTRY_DSN` | Enables the SDK. Public; it is inlined into the bundle. |
| EAS secrets only | `SENTRY_AUTH_TOKEN` | Uploads source maps / dSYMs on production EAS builds. |
| EAS secrets only | `SENTRY_ORG` | Sentry org slug (for symbol upload). |
| EAS secrets only | `SENTRY_PROJECT` | Sentry project slug (for symbol upload). |

Vercel: Project **send-it** → Settings → Environment Variables → Production. EAS: `npx eas-cli secret:create` from `app/`, or Expo dashboard → Environment variables.

Production EAS uses `SENTRY_ALLOW_FAILURE=true` so a missing token does not fail the build. Development/preview profiles skip upload (`SENTRY_DISABLE_AUTO_UPLOAD`). After the token is set, the next production build symbolicates native crashes.

Do **not** add the `@sentry/react-native/expo` config plugin until `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are set on EAS. The plugin wraps Xcode’s “Bundle React Native code and images” phase; without those values the build can still succeed (`SENTRY_ALLOW_FAILURE`) while the IPA has no `main.jsbundle`, which crashes immediately from the home screen (build 13). JS `initSentry()` is enough for JS/React reports once a DSN is set.

Privacy: `sendDefaultPii` is off; Coach / Q&A request bodies are not attached; screenshots are not sent. [`docs/legal/PRIVACY.md`](docs/legal/PRIVACY.md) already discloses crash reporting. If the DSN is in a store build, include **Diagnostics / Crash Data** on the App Store nutrition label and Play Data safety form.

## Autonomous monitoring

| Layer | What | How |
|-------|------|-----|
| **GitHub Actions** | Health check + Render warm ping | `.github/workflows/health-check.yml` (every 10 min + on push) |
| **GitHub Actions** | Weekly AU cache refresh | `.github/workflows/refresh-au-caches.yml` (Mondays 06:00 UTC, `[skip render]` so Render does not redeploy) |
| **Hermes (Nous)** | Daily gate + weekly review | `.\scripts\setup-hermes-cron.ps1` then paste cron blocks in Hermes |
| **Scripts** | Production probe | `node scripts/verify-production.mjs` |
| **Scripts** | iOS tab smoke test | `node scripts/ios-smoke-test.mjs` |
| **Scripts** | Android tab smoke test | `node scripts/android-smoke-test.mjs` |

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

# App TypeScript only (web / iOS tree)
cd app && npx tsc --noEmit

# Android / Play TypeScript
cd android-app && npx tsc --noEmit
```

## Render API (`send-it-ke7r`)

Live `/health` can stay OK while **new** deploys fail — Render keeps the last good instance and emails every failed build.

Do **autodeploy AU calendar cache commits** so the live `/calendar` endpoint serves the refreshed JSON. Do not autodeploy from `app/` / `android-app/` changes. Config in repo: [`render.yaml`](render.yaml) (Blueprint, optional). Dashboard equivalent:

| Setting | Value |
|---------|--------|
| Root Directory | `api` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Auto-Deploy include | `api/**` |
| Auto-Deploy ignore | none for `api/data/au-road-race-events.json` |

Cache JSON is what the live API reads for AU events. Refresh it in git weekly and let Render redeploy the API after the cache commit.

## Deploy flow

1. Merge to **`main`** on GitHub.
2. **Render** redeploys the API when `api/` code or AU calendar cache changes (see above), or via **Manual Deploy** in the dashboard.
3. **Vercel** auto-deploys `app/` on push to `main` (web only — **not** the Android binary).
4. Confirm: Vercel deployment **READY**, `GET /health` on Render OK, web app loads headlines.
5. **Android / Play** is built from [`android-app/`](android-app/) via EAS (`npx eas-cli@latest build -p android`). It is **not** verified on Vercel. Install the APK/AAB on a physical phone or Play Internal testing.

PoC details and troubleshooting: [`POC_HOSTING_GUIDE.md`](POC_HOSTING_GUIDE.md).

## iOS / App Store (RoadRacer)

| Item | Value |
|------|--------|
| App name | RoadRacer - Motorsport_Is_Life |
| Bundle ID | `com.milroadracer.app` |
| Apple Team ID | `UAWP5NV4NQ` |
| Enrollment | Individual (public App Store seller name = your legal name) |
| Expo account | [motorsport-is-life](https://expo.dev/accounts/motorsport-is-life) |
| EAS plan | **Starter** (high-priority queue, 2h timeout, large workers, $45/mo build credit) |
| EAS project | `@motorsport-is-life/roadracer` (`c3447188-53ab-4806-96af-6eb1b5417de3`) |
| EAS config | [`app/eas.json`](app/eas.json) (`credentialsSource: remote`; production/preview `resourceClass: large`) |
| Setup guide | [`docs/ios/APPLE_DEVELOPER_SETUP.md`](docs/ios/APPLE_DEVELOPER_SETUP.md) |

Register Identifier + App Store Connect app (requires ASC API key env):

```powershell
node scripts/register-apple-app.mjs
node scripts/setup-eas-ios-credentials.mjs
```

Seller/developer name = Program membership entity (not a Development profile nickname). Prefer **Organization** if the public store name should be a company/brand.

## Android / Play (RoadRacer)

Play Android lives in **`android-app/`** — a separate Expo copy with a committed Gradle project. It does **not** share folders with `app/`. Vercel is not the Android binary.

| Item | Value |
|------|--------|
| App name | RoadRacer - Motorsport_Is_Life |
| Package | `com.milroadracer.app` |
| targetSdk / compileSdk | 36 |
| Expo account | [motorsport-is-life](https://expo.dev/accounts/motorsport-is-life) |
| EAS project | `@motorsport-is-life/roadracer` (`c3447188-53ab-4806-96af-6eb1b5417de3`) |
| EAS config | [`android-app/eas.json`](android-app/eas.json) (Android-only profiles; production AAB, preview APK) |
| Play submit | **Not wired** — no `submit.production.android` (no Play service-account JSON in repo). Do not invent a Play app id. |
| Setup | [`android-app/README.md`](android-app/README.md) |
| Play listing / Data safety | [`docs/play/PLAY_LISTING_COPY.md`](docs/play/PLAY_LISTING_COPY.md) |
| Play Console how-to | [`docs/play/PLAY_CONSOLE_SETUP.md`](docs/play/PLAY_CONSOLE_SETUP.md) |
| Local IDE | Android Studio — SDK **36**, emulator or USB; `cd android-app && npx expo run:android`. Not the store binary. |

```powershell
cd android-app
npx tsc --noEmit
npx eas-cli@latest build -p android --profile preview --non-interactive --no-wait
npx eas-cli@latest build -p android --profile production --non-interactive --no-wait
```

Verify on a **physical Android phone**, Studio emulator, or Play Internal testing — **not** Vercel: cold launch, Track Memory landscape, permission denied paths, Coach/Q&A after Render cold start.

## Hermes (RR app expert)

Hermes runs scheduled app reviews and coding-improvement audits. Setup: [`docs/hermes/CRON_SETUP.md`](docs/hermes/CRON_SETUP.md). Reports: `docs/reviews/`.
