---
name: mobile-review
description: "Send-It (RoadRace) screen-by-screen mobile audit. Use with send-it/rr-app-expert for weekly reviews."
version: 1.1.0
author: Send-It / Hermes setup
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [mobile, expo, react-native, review, qa, send-it, roadrace]
    related_skills: [send-it/rr-app-expert, requesting-code-review]
---

# Send-It Mobile Developer Review

Screen-by-screen **mobile developer / QA review** for the RoadRace Expo app. **Report only** — do not commit, push, or edit source files unless the user explicitly asks.

**Parent skill:** `send-it/rr-app-expert` — use that for scheduled reviews, coding improvements, and daily gates. Load **both** skills for weekly audits.

**Not the React Native Hermes JS engine** — this skill is for the Nous Hermes Agent reviewing the Send-It codebase.

## When to use

- Weekly review (with `send-it/rr-app-expert`)
- Before a major release or after a large feature merge
- When the user asks for a full app audit, mobile review, or "review the app"
- After significant changes under `app/src/screens/`, onboarding, avatar, coach, trivia, or track walk

**Skip for:** API-only changes with no app impact (run `node scripts/health-check.mjs` instead).

## Policy

1. **Read first:** `AGENTS.md`, `ENVIRONMENT.md`, `SCREEN_BRIEF_FOR_VISUALS.md`, `PROJECT_STATUS_AND_PRE_PRODUCTION.md`
2. **Run gates:** `node scripts/mobile-review-preflight.mjs` from repo root
3. **Audit code:** every file in the screen inventory printed by preflight
4. **Write report:** `docs/reviews/MOBILE_REVIEW_YYYY-MM-DD.md` or contribute to `RR_REVIEW_YYYY-MM-DD.md` when run with rr-app-expert
5. **Do not** commit, push, or fix code — hand off to Cursor

## Step 1 — Preflight gates

From repo root (`C:\Users\Administrator\.cursor\Send-It` or equivalent):

```powershell
node scripts/mobile-review-preflight.mjs
```

Capture all output. Record pass/fail in the report even if preflight exits non-zero — continue the audit.

Optional production API check:

```powershell
$env:API_URL="https://send-it-ke7r.onrender.com"; node scripts/health-check.mjs
```

## Step 2 — Screen inventory (tick each)

Audit every screen under `app/src/screens/`:

| Screen | Focus areas |
|--------|-------------|
| `OnboardingScreen.tsx` | Flow steps, avatar skip → random mascot, face capture, validation, finish persistence |
| `HeadlinesScreen.tsx` | Home hero, bike photo, avatar composite, tab navigation, API prefetch |
| `HeadlinesListScreen.tsx` | Headlines feed, priority order, pull-to-refresh, error states |
| `HeadlinesSettingsScreen.tsx` | Profile (name, avatar, face photo), notifications, custom sources |
| `CalendarScreen.tsx` | Events load, cache, error/empty states |
| `QAScreen.tsx` | Ask tab (GPT coach), Trivia (used tracking, correct/wrong flows) |
| `RiderCoachScreen.tsx` | Coach vs Bike Setup tabs, mode switch to API |
| `TrackWalkScreen.tsx` | Entries, save/export, send to coach navigation |
| `ImportTrackNotesScreen.tsx` | Paste/import, track context, navigation to Rider Coach |

Also review shared components used by screens:

- `app/src/components/AvatarFaceCameraModal.tsx`
- `app/src/components/AvatarFaceEllipse.tsx`
- `app/src/storage/onboarding.ts`, `avatarFacePhoto.ts`, `trackWalk.ts`
- `app/constants/api.ts`

Compare behavior to `SCREEN_BRIEF_FOR_VISUALS.md`. Note where the brief is stale vs current code.

## Step 3 — Cross-cutting mobile checks

- **Navigation:** `getParent()` depth (tab vs stack); cross-tab `navigate('RiderCoachTab', …)` patterns
- **AsyncStorage:** keys, migration, reset onboarding dev path
- **Permissions:** camera, photo library, notifications — denied paths and Settings links
- **API URL:** dev emulator vs LAN vs `EXPO_PUBLIC_API_URL`; timeout/error surfaces
- **Images:** face photo cache-bust (`?rev=`), bike photo persistence
- **GPT modes:** `coach` vs `bikesetup` on `/roadrace-ai/chat`; trivia does **not** use GPT
- **Offline / API down:** user-visible errors on Headlines, Q&A Ask, Coach, Calendar

Label runtime-only checks as **Manual verify on Expo Go** with concrete steps.

## Step 4 — Severity rubric

| Level | Meaning |
|-------|---------|
| **P0** | Broken flow, crash risk, data loss, wrong API mode, navigation dead-end |
| **P1** | Major UX gap, silent failure, missing error handling, brief mismatch users will notice |
| **P2** | Polish, copy, accessibility, performance, stale docs |

## Step 5 — Write the report

Path: `docs/reviews/MOBILE_REVIEW_YYYY-MM-DD.md` (or section inside `RR_REVIEW_YYYY-MM-DD.md`)

Use this structure:

```markdown
# Mobile Review — YYYY-MM-DD

## Executive summary
- P0: N | P1: N | P2: N
- One paragraph overall health

## Automated gates
(paste preflight + health-check results)

## Per-screen findings

### OnboardingScreen
- [P1] ...

(repeat for each screen)

## Cross-cutting
- Navigation / storage / permissions / API

## API integration
- Endpoints, modes, error handling

## Suggested fix order (for Cursor)
1. ...

## Manual verify on Expo Go
- [ ] Step-by-step checks that need a device

## Out of scope
- Visual pixel QA, Maestro/E2E (not run)
```

## Step 6 — Handoff

Tell the user:

1. Report path
2. Count of P0/P1/P2
3. Top 3 fixes to do in Cursor first
4. Re-run after fixes: `node scripts/mobile-review-preflight.mjs`

## Limits

Hermes cannot drive iOS/Android simulators or Expo Go without Maestro/detox. Code review + CLI gates only unless the user runs device steps manually.
