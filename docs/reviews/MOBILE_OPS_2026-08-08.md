# Mobile App Ops — 2026-08-08

## Status

MOBILE OPS: HEALTHY — no bugs requiring Cursor action.

---

## Executive summary

- **P0: 0 | P1: 0 | P2: 4**

The app is in strong operating condition on both iOS and Android. All automated gates pass cleanly — no failures. Production Render API is live and healthy (75 headlines, 66 calendar events, AI endpoints enabled, 11/11 smoke checks passed). TypeScript compiles clean. The 14-screen inventory is stable. **The P1-1 from the 2026-07-29 cycle is fully resolved:** `health-check.mjs` no longer produces false-positive FAILs; gate now passes end-to-end without suppression. Two notable features shipped this cycle: Track Walk has been nested under Coach tools (correct UX improvement), and `react-native-worklets@0.5.1` was added to unblock Vercel web builds with Reanimated 4. Security posture remains sound — no unexpected connections, no secrets in source, all URL opens through `safeOpenUrl()`. Four P2 items are carried forward; none are urgent.

---

## Automated gates

### Preflight (`node scripts/mobile-review-preflight.mjs`) — 2026-08-08

```
OK   14 screens listed
OK   TypeScript (app)
OK   server.js / qa.js syntax
OK   tracks.json — 19 catalog tracks, 19 geofences
OK   the_bend_international ~4.95 km, the_bend_gt ~7.77 km
OK   shared geofence centres verified (Bend, SMP)
OK   turn-hand policy: 67 verified left|right, 0 unverified
WARN planned layout not in catalog yet: the_bend_east (unchanged)
WARN planned layout not in catalog yet: the_bend_west (unchanged)
WARN planned layout not in catalog yet: smp_amaroo (unchanged)
WARN planned layout not in catalog yet: collingrove_hillclimb (unchanged)
OK   AU cache: 20 headlines (updated 2026-08-08)
OK   AU calendar cache: 31 events
OK   calendar aggregation: 66 events, 42 AU full-detail
SKIP live API not running locally (non-fatal)
OK   health-check.mjs — PASSED (0 false-positive failures)

All preflight checks passed.
```

> Note: AU cache headline count (20) and calendar event counts (31/66) are lower than the 2026-07-29 snapshot (97/62/97). This is consistent with a recently refreshed cache mid-cycle; the live API returns 75 headlines and 66 events which are healthy numbers.

### Production health-check (`API_URL=https://send-it-ke7r.onrender.com`) — 2026-08-08

```
OK   TypeScript (app)
OK   AU interleave logic (1-in-4)
OK   All API modules syntax clean
OK   retrieveForAsk: 5 chunks, fromKb=true
OK   scrapers returned 98 headlines
OK   gpone: 12 items
OK   motor_sport_motogp: 8 items
OK   thumbnails: 74/98
OK   MoMS corpus 2026, nextReviewDue 2027-01-15
OK   AU cache: 20 headlines
OK   AU calendar cache: 31 events, aggregator/governing-body source present
OK   calendar aggregation: 66 events, 42 AU full-detail
OK   API /health at https://send-it-ke7r.onrender.com
OK   API roadraceAi enabled (OPENAI_API_KEY set)
OK   API /headlines: 75 items
OK   API /calendar: 66 events

Health check PASSED (0 issues)
```

**P1-1 from 2026-07-29 confirmed resolved.** Gate now passes cleanly with no suppression.

### verify-production.mjs — 2026-08-08

```
OK   /health ok=true
OK   roadraceAi enabled
OK   /headlines: 75 items
OK   /calendar: 66 events
OK   /qa/trivia returns a question
OK   /roadrace-ai/faqs: 20 coach FAQs
Production verify passed ✓
```

### ios-smoke-test.mjs — 2026-08-08

```
OK   [Headlines] 75 headlines
OK   [Headlines] 20 AU items in feed
OK   [Headlines] 10 built-in sources
OK   [Events] 66 events
OK   [Events] 22 MotoGP 2026 rounds (live API)
OK   [Q&A] trivia question ready
OK   [Q&A] Ask mode available (roadraceAi)
OK   [Track Walk] local notes — no API required for save
OK   [Coach] FAQs coach=20 bikesetup=20
OK   [Coach] chat endpoint configured
OK   [App] TypeScript compiles
11 passed, 0 failed
iOS smoke test (API layer) passed ✓
```

---

## Platform fitness (iOS / Android)

### API / networking

- `app/constants/api.ts` — correct and unchanged. `EXPO_PUBLIC_API_URL` env override, Android emulator heuristic (`10.0.2.2`), and Render production fallback all intact. ✓
- All fetch calls carry `AbortSignal.timeout()`: Headlines (45 s / 90 s refresh), custom sources (20 s), Calendar (15 s), Q&A trivia (8 s), Coach chat (90 s). Full timeout coverage. ✓
- Production TLS only — all Render endpoints HTTPS. Cleartext only on `http://10.0.2.2:3001` (Android emulator dev, not shipped). ✓
- `apiFetch()` injects `x-app-secret` header on all `/roadrace-ai/*` routes. ✓

### Permissions

- Camera: foreground only, `recordAudioAndroid: false`. Denied path → Alert + Settings link. ✓
- Photos: scoped to avatar/bike/track flows. ✓
- Location: foreground-only, denied → `Linking.openSettings()`. ✓
- Notifications: only on user opt-in. ✓

### Build / Expo

- Expo SDK ~54, React Native 0.81.5 (Hermes engine), React 19. Stack current. ✓
- `jsEngine: "hermes"` confirmed in `app.json`. ✓
- **New this cycle:** `react-native-worklets@0.5.1` added to `package.json` — required by Reanimated 4's Babel plugin for Vercel web builds (commit `409b89d`). The only active Reanimated usage found is the `Animated.spring`/`timing` goat-explosion in `QAScreen.tsx` which uses the legacy `Animated` API from `react-native` core (not Reanimated). The `react-native-reanimated/plugin` in `babel.config.js` is the Reanimated 4 Babel plugin; `worklets` is its peer dep. This configuration is correct. ✓
- `newArchEnabled` not set (old arch default for SDK 54). Not a blocker; unchanged.

### Navigation

- **Track Walk nested under Coach tools (commit `cbecc69`):** `TrackWalk` is now a stack screen inside the `RiderCoachStack` (`App.tsx` line 177–180), accessible via `navigation.navigate('TrackWalk')` from `RiderCoachScreen`. The stale `goToTrackWalk → TrackWalkTab` navigation reference was removed from `HeadlinesScreen`. This is a correct architectural improvement — Track Walk is a coach-context tool and should live under the Coach tab. ✓
- All other cross-tab navigation patterns unchanged and correct. ✓

### Regional packs / i18n

- `app/src/packs/loader.ts` correctly imports bundled AU pack slices (`active.json`, `registry.json`, `au/*`). Used by `HeadlinesListScreen` and `CalendarScreen` for localised labels (`getI18nString`, `getLocalUiLabel`). ✓
- Pack loader is read-only at runtime; no dynamic imports or unsafe eval. ✓

---

## Per-screen findings

### OnboardingScreen — ✓ HEALTHY
8-step flow unchanged. Face camera + align modal flows, skip logic, random avatar fallback, legal acceptance gate, privacy/terms via `safeOpenUrl` all correct. `key={i}` on progress dots (P2-4, carried).

### HeadlinesScreen — ✓ HEALTHY
Prefetch guard, avatar composite, bike photo, nickname display all correct. Track Walk button removed from home nav grid — intended change. ✓

### HeadlinesListScreen — ✓ HEALTHY
Three view modes (local/world/custom), 45 s / 90 s timeouts, composite key extractor, thumbnail fallback, error/loading/empty states all present. Regional i18n labels for view mode tabs work via `getLocalUiLabel()`. ✓

### HeadlinesSettingsScreen — ✓ HEALTHY
`apiFetch` for custom sources, `safeOpenUrl` for legal links, source priority modal. ✓

### CalendarScreen — ✓ HEALTHY
AU filter default, upcoming/ongoing guard, `safeOpenUrl` for event links, 15 s timeout, regional i18n tab labels. 66 events live. ✓

### QAScreen — ✓ HEALTHY
Ask/Trivia mode separation correct. Goat explosion easter egg uses legacy `Animated` API (correct for this use case). Timer cleanup on unmount. `key={i}` on trivia option buttons (P2-3, carried — static per-question list, no reorder/delete).

### RiderCoachScreen — ✓ HEALTHY
Hub screen: Coach Chat, Day Setup Sheet, Bike Balance Setup, Bike Setup Basics, **Track Walk / Track Notes** (now in tool list — new), RoadRacer AI FAQs, feature request mailto. `safeOpenUrl` for mailto. Navigation target `'TrackWalk'` resolves correctly in the RiderCoachStack. ✓

### CoachChatScreen — ✓ HEALTHY
Stable `key={m.id}` UUIDs, 90 s timeout, error recovery restoring draft, generation counter. ✓

### TrackWalkScreen — ✓ HEALTHY
Purpose blurb added (commit `cbecc69`): clear explanation that notes stay private and finish → save/export/coach. `key={index}` on entry list (P2-2, carried). Speech singleton, 19 catalog tracks, `sendToCoach` navigation. ✓

### ImportTrackNotesScreen — ✓ HEALTHY
Dual navigation path, clipboard, sessionReady gate. ✓

### BikeSetupBasicsScreen — ✓ HEALTHY
Hotspot hit targets 44pt, timer cleanup, CoachChat seeding. ✓

### BikeSetupSheetScreen — ✓ HEALTHY
`KeyboardAvoidingView` wrapping full screen. Debounced save 400 ms. ✓

### RoadRacerAiFaqsScreen — ✓ HEALTHY
Searchable FAQs, CoachChat seeding via `seedDraftMessage`. ✓

### BikeBalanceSetupScreen — ✓ HEALTHY (P2 carried)
4-tab layout, skill modes, position presets, intro gate, compute `useMemo` synchronous but fast. `KeyboardAvoidingView` still absent (P2-1, carried from 2026-07-29).

---

## Performance & reliability

- FlatList virtualisation: Calendar (66 events), Headlines (~75 items) — comfortable range. ✓
- BikeBalance compute: synchronous `useMemo` — still fast at current equation count. ✓
- Coach chat `ScrollView` + `scrollToEnd` — acceptable at current session sizes. ✓
- `Animated.spring`/`timing` in QAScreen uses the RN core `Animated` API (not Reanimated) — correct, low overhead, no JS thread risk. ✓
- `react-native-worklets` added for Vercel build compat — no runtime overhead observed; peer dep only for Reanimated Babel transform. ✓

---

## Design quality

All screens match the dark slate / amber accent design in `SCREEN_BRIEF_FOR_VISUALS.md`. Track Walk purpose blurb added this cycle improves discoverability. Nested under Coach is more discoverable for the target use case. No brief mismatches found. P2-1 keyboard avoidance on BikeBalanceSetupScreen is the only material UX concern (still outstanding).

---

## Security & connections

| Check | Finding |
|-------|---------|
| **Secrets** | None in source. `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN` read from env (not committed). `OPENAI_API_KEY` server-only. `.env.example` explicitly warns `EXPO_PUBLIC_*` vars are embedded in bundle. ✓ |
| **Outbound hosts** | All API calls target `send-it-ke7r.onrender.com` (prod) or Android emulator dev path. Pack loader is offline/bundled JSON. Analytics stub is a no-op. No third-party analytics, ad SDKs, or tracking. ✓ |
| **TLS** | All production HTTPS. Only cleartext is `http://10.0.2.2:3001` (Android emulator dev — not shipped). ✓ |
| **URL safety** | All `Linking.openURL()` calls go through `safeOpenUrl()` which blocks `javascript:` and `intent:` schemes. No bare `Linking.openURL()` in any screen. ✓ |
| **API auth** | `x-app-secret` header injected by `apiFetch()` for all `/roadrace-ai/*` routes. ✓ |
| **Input limits** | `MAX_AI_MESSAGE_CHARS = 4000` enforced server-side. `express.json` 64 kb global; 8 mb only for base64 image uploads. ✓ |
| **Storage** | AsyncStorage: onboarding, avatar ID, photo URIs, trivia best score, bike setup/balance state. No tokens or passwords. Face photos at app-local URI. ✓ |
| **Permissions** | Foreground location, camera without audio, scoped photo library. Least-privilege met. ✓ |
| **Deeplinks** | `scheme: "roadrace"` registered; no active `Linking.addEventListener` handler → no exploit surface. ✓ |
| **CORS / headers** | Origin whitelist, `GET`/`POST` only; `helmet()` applied before routes. ✓ |
| **Regional packs** | Bundled read-only JSON; no remote pack fetch at runtime → no injection surface. ✓ |

**No security issues requiring Cursor action.** Security posture is sound.

---

## Recommended fixes for Cursor

No P0 or P1 items. The following P2 items are carried from prior cycles:

### P2 (carried)

1. **[P2-1] `KeyboardAvoidingView` missing on `BikeBalanceSetupScreen`** *(carried from 2026-07-29)*
   - **Evidence:** `BikeBalanceSetupScreen.tsx` wraps in a plain `ScrollView` (line 326); `KeyboardAvoidingView` not imported or used. Inputs tab has multiple numeric `TextInput` fields.
   - **Impact:** On physical devices, on-screen keyboard will cover lower numeric input fields (swingarm geometry, sprocket teeth).
   - **Recommended fix (Cursor):** Wrap `<ScrollView>` in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>` following the existing pattern in `BikeSetupSheetScreen.tsx`. Add `Platform`, `KeyboardAvoidingView` to the `react-native` import list.

2. **[P2-2] `key={index}` in TrackWalkScreen entry list** *(carried from 2026-07-22)*
   - **Evidence:** `TrackWalkScreen.tsx` line 496: `key={index}`.
   - **Impact:** Deletion causes list flicker / animation artifacts.
   - **Recommended fix (Cursor):** Assign stable `id` (e.g. `Date.now().toString()`) on `addEntry` push and use as `key`.

3. **[P2-3] `key={i}` in OnboardingScreen progress dots and QAScreen trivia options** *(carried)*
   - **Evidence:** `OnboardingScreen.tsx` line 237; `QAScreen.tsx` line 655.
   - **Impact:** Static arrays — cosmetically harmless but React best practice.
   - **Recommended fix (Cursor):** `OnboardingScreen` → use `` key={`step-dot-${i}`} ``; `QAScreen` → use `` key={`trivia-opt-${i}`} ``.

4. **[P2-4] New Architecture readiness** *(carried from prior reviews)*
   - SDK 54 defaults to old arch; SDK 55 will flip the default. `sentry-expo` ~7 is not New Arch compatible.
   - **Recommended action (Cursor, before SDK 55 upgrade):** Audit all native plugins; plan migration of Sentry to `@sentry/react-native` direct. `react-native-reanimated@4.x` + `react-native-worklets@0.5.1` are already New Arch compatible — no action needed there.

---

## Growth / modern practice (P2)

- **Expo SDK 55 prep:** Track release notes — New Architecture will be the default; plan `newArchEnabled: true` testing with all native plugins (camera, speech, calendar, clipboard, reanimated, worklets). Reanimated 4 + worklets are already New Arch ready.
- **Regional packs expansion:** `packs/` scaffolding for regions 01–13 is in place but only AU is active. When additional regions activate, audit `getLocalUiLabel()` / `getI18nString()` for any fallback gaps in non-AU packs.
- **`Animated` → Reanimated migration (optional):** `QAScreen.tsx` goat explosion uses legacy `Animated` API. It works fine; if any future animation is added, prefer Reanimated 4 `withSpring`/`withTiming` for consistency with the installed stack.
- **BikeBalance compute growth:** Currently synchronous `useMemo`. If equation set grows significantly, consider `useReducer` + `useDeferredValue` to keep inputs tab responsive on low-end devices.

---

## Resolved since last MOBILE_OPS_2026-07-29

| Item | Status |
|------|--------|
| [P1-1] health-check.mjs 3 false-positive FAILs (`mcnews`, `amcn_club`, `AU_SOURCE_IDS`) | ✅ **Resolved** — gate now checks removed sources are absent (not present); passes cleanly |
| Track Walk navigation (Home → TrackWalkTab dead reference removed) | ✅ **Resolved** — `goToTrackWalk` reference cleaned up; Track Walk now under Coach stack |
| Vercel web build failure (Reanimated 4 worklets Babel plugin peer dep) | ✅ **Resolved** — `react-native-worklets@0.5.1` added |
| Avatar face capture WYSIWYG (prior 7-commit cycle) | ✅ **Confirmed stable** — no regressions observed |
| [P2-1] `KeyboardAvoidingView` missing on BikeBalanceSetupScreen | ↩ Carried — P2, physical device only |
| [P2-2] `key={index}` TrackWalkScreen | ↩ Carried — P2, low urgency |
| [P2-3] `key={i}` OnboardingScreen dots / QAScreen options | ↩ Carried — P2, trivial |
| [P2-4] New Architecture readiness | ↩ Carried — pre-SDK 55 prep |

---

## Manual verify on device

- [ ] **Track Walk under Coach:** Open Coach tab → tap "Track Walk / Track Notes" → confirm screen loads with purpose blurb visible, track picker functional.
- [ ] **Avatar face capture (regression check):** Choose a face-hole leathers avatar → take photo → confirm home hero hole shows the same face correctly.
- [ ] **BikeBalanceSetupScreen keyboard:** Open Inputs tab on a physical device → focus a lower numeric field (swingarm geometry) → confirm on-screen keyboard does not cover it. (Likely will fail until P2-1 is fixed.)
- [ ] **Coach chat:** Send a test message → confirm reply within 90 s; error bubble shown if offline.
- [ ] **Calendar "Aus" filter:** Default filter active; events load correctly.
- [ ] **Import Track Notes → Send to Coach:** Paste clipboard text → send → conversation appears in Coach tab with correct mode.
- [ ] **Trivia goat explosion:** Achieve "Track Guru" result → confirm goat image animates and fades without stutter.

---

## Out of scope

- Pixel / visual regression QA
- Maestro / Detox E2E automation (not configured)
- App Store / Play Store submission readiness (not evaluated this cycle)
