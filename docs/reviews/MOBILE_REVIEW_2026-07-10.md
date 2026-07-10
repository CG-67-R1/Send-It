# Mobile Review — 2026-07-10

## Executive summary

- P0: 1 | P1: 8 | P2: 6 (before fixes)
- Preflight passed TypeScript and API syntax; health-check failed on transient GPone RSS timeout. Screen audit found a React hooks violation on Calendar and several coach/headlines integration gaps. **Cursor fixes applied in this pass** for P0/P1 items listed below.

## Automated gates

```
mobile-review-preflight.mjs — FAIL (gpone scraper timeout; all else OK)
health-check.mjs (production API) — FAIL (gpone timeout; Render API cold/timeout)
npx tsc --noEmit — OK
```

## Per-screen findings

### CalendarScreen
- [P0] **Fixed:** `useMemo` after conditional returns (Rules of Hooks violation).

### HeadlinesSettingsScreen
- [P1] **Fixed:** Duplicate "Your profile" section removed.
- [P1] **Fixed:** Stale `priority` closure in `handleAddCustom`.
- [P1] **Fixed:** `SOURCES_URL` fetch now checks `res.ok`.

### HeadlinesListScreen
- [P1] **Fixed:** Silent `openLink` failures now alert user.
- [P2] **Fixed:** `keyExtractor` includes index to avoid duplicate URL collisions.

### QAScreen
- [P1] **Fixed:** Trivia response validated before use (`res.ok`, `options` array).

### ImportTrackNotesScreen
- [P1] **Fixed:** Track photos sent to coach via `photoUrisToCoachPayloads`.
- [P1] **Fixed:** Navigation fallback alert when coach tab unreachable.

### TrackWalkScreen
- [P1] **Fixed:** Corner photos attached to coach chat.

### OnboardingScreen / RiderCoachScreen / HeadlinesScreen
- No P0/P1 code changes required in this pass.

## Cross-cutting

- **API URL:** Physical devices still need `EXPO_PUBLIC_API_URL` or `EXPO_PUBLIC_DEV_MACHINE_IP` (documented in `api.ts`).
- **Permissions:** Camera denied paths remain P2 (Settings shortcut on library only).

## API integration

- [P1] **Fixed:** GPone scraper RSS timeout increased + HTML fallback in `api/scrapers.js`.

## Suggested fix order (completed)

1. Calendar hooks (P0)
2. Headlines settings duplicate + priority (P1)
3. Coach photo attachments (P1)
4. GPone scraper resilience (P1)
5. Trivia + openLink validation (P1)

## Manual verify on Expo Go

- [ ] Onboarding complete flow with face photo
- [ ] Headlines pull-to-refresh on physical device with LAN API
- [ ] Import track notes → Rider Coach with photo
- [ ] Track walk corner photo → Send to coach

## Out of scope

- Visual pixel QA, Maestro/E2E (not run)
