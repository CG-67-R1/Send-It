# Mobile Review — 2026-07-10

**Reviewer:** Hermes mobile-review setup (first run)  
**Policy:** Report only — no code changes in this pass  
**Repo:** `C:\Users\Administrator\.cursor\Send-It`

## Executive summary

- **P0:** 4 | **P1:** 10 | **P2:** 18
- The app is functionally rich (home hub, track walk, in-app coach, profile settings) but has outgrown `SCREEN_BRIEF_FOR_VISUALS.md`. TypeScript and most health gates pass. One scraper failure (peterbom 0 items) failed preflight. Top risks: hardcoded dev API LAN IP, Q&A Ask tab wired to coach GPT instead of KB search, and missing gallery permission checks on Track Walk / Import notes.

## Automated gates

### `node scripts/mobile-review-preflight.mjs`

| Step | Result |
|------|--------|
| Screen inventory (9 screens) | OK |
| TypeScript (`npx tsc --noEmit`) | OK |
| `server.js` syntax | OK |
| `qa.js` syntax | OK |
| Health check (overall) | **FAIL** — `scraper peterbom returned 0 items` |
| Live API `localhost:3001` | OK (health, headlines 158, calendar 41) |

Preflight exited non-zero due to peterbom scraper; audit continued per skill policy.

---

## Per-screen findings

### OnboardingScreen

- **[P2]** `knowsJustSendIt: false` always written — brief’s “Just Send it!” step removed but field remains (`OnboardingScreen.tsx` ~L140).
- **[P2]** Brief says 6 steps; implementation has 7 (welcome, bike, rider, activity, future-racer, avatar+nickname, summary).
- **[P2]** Random mascot on avatar skip is implemented — verify on device (see manual checklist).

### HeadlinesScreen (home hub)

- **[P1]** Tab navigation uses `getParent()?.navigate(... as never)` — untyped, fragile if navigator hierarchy changes (`HeadlinesScreen.tsx` L127–132).
- **[P2]** Avatar/name tap targets nested inside bike-photo `TouchableOpacity` — risk of accidental bike picker (`HeadlinesScreen.tsx` L154–247).
- **[P2]** Branding “RoadRacer” vs brief “RoadRace” inconsistency.

### HeadlinesListScreen

- **[P1]** Custom RSS fetch failures swallowed; partial feed with no user warning (`HeadlinesListScreen.tsx` ~L94–96).
- **[P2]** `keyExtractor` uses `item.url` only — duplicate URLs may confuse list reconciliation.

### HeadlinesSettingsScreen

- **[P1]** `handleRemoveCustom` may persist stale `priority` from closure when removing custom source (`HeadlinesSettingsScreen.tsx` ~L290–306).
- **[P2]** Priority picker modal overlay may intercept taps incorrectly.
- **[P2]** Brief describes news-only settings; screen now includes full profile (name, avatar, face photo).

### CalendarScreen

- **[P1]** `fetchCalendar` does not check `res.ok`; HTTP errors may show empty list without error message (`CalendarScreen.tsx` ~L83–86).
- **[P2]** Australia filter may include `detailTier === 'full'` world events incorrectly.

### QAScreen

- **[P0]** Ask tab POSTs to `ROADRACE_CHAT_URL` with `mode: 'coach'`; `QA_SEARCH_URL` exported but unused — not KB search (`QAScreen.tsx` L140–143, `api.ts` L36).
- **[P1]** UI copy implies open Q&A / research; behavior is coach chat — mismatched intent vs brief §5.
- **[P2]** `contentBlocks` rendering path unused for Ask responses.
- **[P2]** Trivia `setTimeout` for feedback not cleared on unmount/tab switch.
- **[P2]** Goat explosion at 12 correct — 10s overlay; no dismiss.

### RiderCoachScreen

- **[P1]** `seededRef` blocks re-seeding if import-to-coach runs twice in one mount (`RiderCoachScreen.tsx` L38–45).
- **[P2]** `KeyboardAvoidingView` behavior undefined on Android — keyboard may cover input.
- Coach vs `bikesetup` mode switch to API is **correct** (verified in prior audit).

### TrackWalkScreen

- **[P0]** Gallery photo pick missing `requestMediaLibraryPermissionsAsync` (`TrackWalkScreen.tsx` ~L244–249).
- **[P1]** `handleSave` lacks `catch` — AsyncStorage failures silent (`TrackWalkScreen.tsx` ~L324–334).
- **[P1]** Voice recognition often unavailable in Expo Go — fails to “not available” without clear dev-client guidance.
- **[P2]** Coach handoff uses single `getParent()` — correct for this stack; documented for consistency with Import notes fix.

### ImportTrackNotesScreen

- **[P0]** Gallery pick missing media-library permission (`ImportTrackNotesScreen.tsx` ~L77–88).
- **[P2]** Photos on session not sent to coach AI — text-only export (`coachChat.ts`, `formatTrackNotesForCoach`).
- Navigation to Rider Coach: fixed to use single `getParent()` or same-stack navigate (recent commit).

---

## Cross-cutting

### API / network

- **[P0]** `DEV_MACHINE_IP = '192.168.1.13'` hardcoded in `app/constants/api.ts` — wrong IP breaks all API calls on physical devices.
- **[P1]** No centralized offline/network error copy; users see raw `Network request failed` / timeout strings.

### Permissions

- **[P0]** Track Walk + Import notes gallery paths (see above).
- Camera face capture and bike photo flows generally handle permissions with Settings fallback.

### Storage

- **[P2]** `getOnboardingAnswers` swallows parse errors (`onboarding.ts`).
- **[P2]** `deleteTrackWalkSession` does not remove persisted photo files.
- **[P2]** Unbounded track-walk session list in AsyncStorage.

### Navigation

- **[P1]** `getParent()` pattern across Headlines hub, Track Walk, Import notes — prefer typed nested navigation.
- **[P2]** `ImportTrackNotes` duplicated in RiderCoachStack and TrackWalkStack (`App.tsx`).

### Avatar / face capture

- **[P2]** `AvatarFaceCameraModal` — no Open Settings on denied camera; silent return when `!photo?.uri`.
- **[P2]** `AvatarFaceEllipse` — no fallback if SVG face image fails to load.

---

## API integration

| Feature | Endpoint | Mode / notes | Status |
|---------|----------|--------------|--------|
| Headlines | `GET /headlines` | Cache 15m | OK |
| Q&A Ask | `POST /roadrace-ai/chat` | `coach` only | **Mismatch** — brief expects `/qa/search` |
| Trivia | `GET /qa/trivia` | No GPT; JSON banks | OK (dedup by question text in API) |
| Rider Coach | `POST /roadrace-ai/chat` | `coach` / `bikesetup` | OK |
| Calendar | `GET /calendar` | — | OK with error-handling gap |

---

## SCREEN_BRIEF_FOR_VISUALS.md — stale sections

| Brief | Actual |
|-------|--------|
| 6-step onboarding + “Just Send it!” | 7 steps; avatar; future-racer branch |
| Headlines tab = feed | Home hub + separate Bike News list |
| Settings = headlines only | Profile & settings |
| 4 bottom tabs | 5 tabs (incl. Track Walk) |
| Q&A Ask = KB search | Coach GPT chat |
| Rider Coach placeholders | Live in-app chat |
| “RoadRace” naming | “RoadRacer” in several places |

Recommend updating the brief or adding `SCREEN_BRIEF_DELTA.md` after next UX pass.

---

## Suggested fix order (for Cursor)

1. **P0:** Gallery permissions on Track Walk + Import notes.
2. **P0:** Document or env-drive `DEV_MACHINE_IP` / `EXPO_PUBLIC_API_URL` for physical devices.
3. **P0:** Decide Q&A Ask product intent — wire `QA_SEARCH_URL` or rename UI to “Ask coach”.
4. **P1:** Calendar `res.ok` + error state; HeadlinesSettings priority stale closure; Track Walk save `catch`.
5. **P1:** Typed tab navigation; RiderCoach `seededRef` for repeat imports.
6. **P2:** Refresh `SCREEN_BRIEF_FOR_VISUALS.md`; nested touch targets on home hero; trivia timeout cleanup.
7. **API:** Investigate peterbom scraper returning 0 items (health-check failure).

---

## Manual verify on Expo Go

- [ ] **Onboarding** — Complete all 7 steps; skip avatar → confirm random mascot on summary and home; optional face photo in leathers.
- [ ] **Home hub** — Tap bike vs avatar/name; hub buttons reach Events, Q&A, Track Walk, Coach; bike photo add/remove.
- [ ] **Bike News on device** — Headlines load with correct API URL; World/Aus/Custom; pull refresh; open article link.
- [ ] **Q&A** — Ask returns coach-style reply; trivia 3-strike fail, rating tiers, best score, goat at 12 correct.
- [ ] **Rider Coach** — Coach vs Bike Setup different advice; keyboard on iOS and Android.
- [ ] **Track Walk** — Corners, notes, camera + **gallery** photos, save, export, ask coach → seeded thread on Coach tab.
- [ ] **Import notes** — From Coach header and Track Walk; paste; send to coach; navigation with reply.
- [ ] **Events** — Load, AU/World filters, add calendar reminder permission flow.

---

## Out of scope

- Visual pixel QA on device
- Maestro / Detox E2E automation
- App Store / Play Store build review
- Production Render API load testing (optional: `API_URL=https://send-it-ke7r.onrender.com node scripts/health-check.mjs`)

---

## Hermes setup artifacts (this implementation)

| Artifact | Path |
|----------|------|
| Review skill | `%LOCALAPPDATA%\hermes\skills\send-it\mobile-review\SKILL.md` |
| Preflight script | `scripts/mobile-review-preflight.mjs` |
| Playbook | `AGENTS.md` → Hermes mobile developer review |
| Hermes `max_turns` | Bumped to 80 in `%LOCALAPPDATA%\hermes\config.yaml` |

**Next run:** `hermes` → `/skill send-it/mobile-review`
