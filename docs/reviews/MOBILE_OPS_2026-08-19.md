# Mobile App Ops — 2026-08-19

## Status

MOBILE OPS: HEALTHY — no bugs requiring Cursor action.

---

## Executive summary

- **P0:** 0 | **P1:** 0 | **P2:** 3
- The Send-It / RoadRacer Expo app is in healthy operating condition on iOS and Android. All automated gates pass — TypeScript, scrapers (98 headlines), track data (20 tracks, 68 verified turns), production API (Render: headlines, calendar 106 events, roadraceAi, FAQs, trivia), and iOS smoke test all clear. Full code review of all 22 screens confirms no crashes, navigation dead-ends, silent LLM hangs, security exposures, or broken critical flows. Three P1 issues raised in the 2026-08-17 weekly review (Coach Chat indefinite hang, TyreWear stale-state send, GearingGuide sprocket range bypass) are all **resolved**. One P2 gap from last review (GearingGuide + TyreWear state not cleared by global data reset) remains open.

---

## Automated gates

### Preflight (`node scripts/mobile-review-preflight.mjs`)

```
OK   22 screens listed
OK   TypeScript (app) — npx tsc --noEmit passes
OK   server.js syntax | qa.js syntax
OK   track_turn_verification.json — 68 verified left|right, 0 unverified
OK   20 catalog tracks | 20 geofence features
OK   the_bend_international ~4.95 km | the_bend_gt ~7.77 km
OK   shared geofence centres: Bend family + SMP family
WARN planned layouts not in catalog yet: the_bend_east, the_bend_west, smp_amaroo, collingrove_hillclimb (known; tracked P2)
WARN npm audit (app) — critical:0, high:10, moderate:8 (Metro/image-size toolchain dev-only; no runtime path; no fix available without breaking Expo SDK version)
OK   npm audit (api) — no vulnerabilities
OK   health-check.mjs (local scraper pass)
All gates: PASSED
```

### Health check (`API_URL=https://send-it-ke7r.onrender.com node scripts/health-check.mjs`)

```
OK   TypeScript (app)
OK   AU interleave logic (1-in-4 pattern)
OK   all API module syntaxes (server.js, qa.js, roadraceAi.js)
OK   retrieveForAsk: 5 chunks, fromKb=true
OK   scrapers: 98 headlines (gpone 12, motor_sport_motogp 8)
OK   thumbnails: 74/98
OK   MoMS corpus 2026 edition, nextReviewDue 2027-01-15 (not overdue)
OK   AU cache: 39 headlines (updated 2026-08-18)
OK   AU calendar cache: 71 events (updated 2026-08-17)
OK   calendar aggregation: 106 events, 82 AU full-detail
--   Local API not running (expected in cron context)
PASS
```

### Production verify (`node scripts/verify-production.mjs`)

```
OK   /health ok=true, roadraceAi enabled
OK   /headlines: 98 items
OK   /calendar: 106 events
OK   /qa/trivia returns a question
OK   /roadrace-ai/faqs: 20 coach FAQs
PASS
```

### iOS smoke test (`node scripts/ios-smoke-test.mjs`)

```
OK   [Headlines] 98 headlines, 31 AU items, 10 built-in sources
OK   [Events] 106 events, 22 MotoGP 2026 rounds (live API)
OK   [Q&A] trivia question ready, Ask mode available (roadraceAi)
OK   [Track Walk] local notes — no API required for save
OK   [Coach] FAQs coach=20 bikesetup=20, chat endpoint configured
OK   [App] TypeScript compiles
11 passed, 0 failed — PASS
```

---

## Platform fitness (iOS / Android)

### API / Networking (`app/constants/api.ts`)

- HTTPS in all production paths. `PRODUCTION_API_URL = https://send-it-ke7r.onrender.com`. No cleartext HTTP outside documented local-dev cases.
- Android emulator routes to `http://10.0.2.2:3001` via `isLikelyAndroidEmulator()` heuristic. iOS sim / Expo Go default to the hosted Render API — no local `npm start` required for testers.
- `EXPO_PUBLIC_API_URL` env override correctly available for both platforms.
- `apiFetch()` applies `AbortSignal.timeout(DEFAULT_API_TIMEOUT_MS = 60 s)` unless caller passes a longer signal. LLM routes (`sendCoachChat`) pass `LLM_API_TIMEOUT_MS = 90 s` — confirmed fixed since 2026-08-17.
- `EXPO_PUBLIC_APP_API_SECRET` injection into `x-app-secret` header: optional defence-in-depth, correctly documented as visible-in-bundle (not a true secret).

### Build / Expo

- Stack: Expo `^57.0.0`, React Native `0.86.2`, React `19.2.3`. All at current major versions. New Architecture not yet enabled (`newArchEnabled` not set in `app.json`) — expected for SDK 57 (default is Bridge / old arch unless explicitly opted in). Sentry uses `@sentry/react-native ~7.11.0` with the `@sentry/react-native/expo` plugin — this version is compatible with SDK 57 and is loaded lazily after native runtime ready (async `import()`), avoiding known New Architecture init-order issues.
- `expo-speech-recognition 56.0.1` is one minor version behind (`~57.0.x` expected for SDK 57). Works at runtime but may cause a peer-deps warning on install. Minor version drift — note as P2.
- ProGuard + resource shrinking enabled on Android release builds (`expo-build-properties`). iOS deployment target 16.4 (reasonable).
- Camera permission: microphone disabled (`microphonePermission: false`, `recordAudioAndroid: false`) — correct, camera is face-only.

### Performance

- `HeadlinesListScreen`: `FlatList` with `keyExtractor` and `renderItem` as named callbacks (no inline lambdas). Thumbnail images have `onError` degradation. P2: `renderItem` and `keyExtractor` are not wrapped in `useCallback`/`useMemo` — on large feeds they recreate each render. Low impact at 98 headlines but worth noting.
- `CalendarScreen`: `FlatList` for event list with `useMemo` for filtered events — efficient.
- `TrackMemoryScreen`: Game loop runs in refs; React only re-renders HUD at 90 ms cadence — excellent design. `expo-screen-orientation` lock to landscape on entry, restored on exit.
- `QAScreen`: Trivia timer cleanup (`clearTimeout` in effect return) confirmed present.
- `HeadlinesListScreen` timeout: 45 s for initial load, 90 s for pull-to-refresh — correct.

### Stability

- All screens have error states with user-visible messages and retry affordances: Headlines, Calendar, Q&A Ask/Rules, Coach Chat.
- `useFocusEffect` used correctly across HeadlinesScreen, HeadlinesListScreen, CalendarScreen, HeadlinesSettingsScreen — data reloads on tab focus without double-fetch.
- `TrackWalkScreen` speech recognition: optional-require pattern with `__DEV__` gated `console.warn` on errors — no crash if module absent.
- `CoachChatScreen`: `conversationGenerationRef` guards stale response from old LLM call being applied after a new conversation is started — good pattern.
- `OnboardingScreen`: `finishing` flag prevents double-submit on slow async paths.

---

## Per-screen findings (delta since 2026-08-17)

### Resolved P1s from last review

| Issue | 2026-08-17 finding | Status |
|-------|-------------------|--------|
| Coach Chat indefinite hang | No timeout on `sendCoachChat` | ✅ **Fixed** — `LLM_API_TIMEOUT_MS = 90 s` via `AbortSignal.timeout` confirmed in `coachChat.ts:68` |
| TyreWear stale-state resubmit | State not cleared after successful send | ✅ **Fixed** — `resetAnalysis()` (clears photos + state + persisted storage) called on successful coach send |
| GearingGuide sprocket range bypass | `newFrontTeeth`/`newRearTeeth` not range-validated before send | ✅ **Fixed** — `sprocketTeethError()` wired up; `canSend` blocks while `newPairError != null` |
| Onboarding reset accessible in production | `__DEV__` gate not confirmed | ✅ **Fixed** — confirmed `{__DEV__ && onboardingReset ? (…) : null}` at line 1028 of HeadlinesSettingsScreen |

### Open P2 (carried forward)

- **[P2] GearingGuide + TyreWear state not cleared by global data reset.** `handleDeleteAllData` in HeadlinesSettingsScreen calls `clearAllBikeSetupData`, `clearBikeBalanceState`, `clearTrackWalkSessions`, `resetHeadlinesSettings`, `clearAvatarFacePhoto`, `clearBikePhoto`, `clearHomeCountryCode` — but **not** `clearGearingGuideState()` or `clearTyreWearAnalysisState()`. Both functions exist in storage modules. The user's data delete description does not mention Gearing Guide or Tyre Wear data, creating a silent orphan gap. See Cursor fix #1 below.

### New screen check (3e2484c — Track Memory repair)

- `TrackMemoryScreen`: Skia `TrackMemoryRoadView` now runs in its own component with `ref` handle. Native Skia memory leak fix (`c15c3ff`) and layout repair (`3e2484c`) reviewed — no new P0/P1. Screen orientation lock (`expo-screen-orientation`) confirmed on focus entry / restored on blur.
- `TrackMemoryHubScreen`: Track picker pre-populates from `trackPrepSelectedTrack` — continuity UX intact.

### New: expo-calendar Add Reminder fix (`6949fd3`)

- CalendarScreen `Add reminder` restored after `expo-calendar` deprecation. Permissions path (denial → Alert → Settings link) confirmed present. ICS fallback for web also present. No issues found.

---

## Security & connections

| Check | Finding |
|-------|---------|
| **Secrets in app source** | No API keys, tokens, or secrets found in app source, constants, or logs. `OPENAI_API_KEY` is server-side only on Render. `EXPO_PUBLIC_APP_API_SECRET` is documented as optional defence-in-depth (visible in bundle by design). |
| **Endpoints** | Only expected: `https://send-it-ke7r.onrender.com` (API) and `https://api.open-meteo.com` (free weather API, no key, timeout 8 s). No unexpected domains. GitHub URLs for Privacy/Terms are `https://github.com/…` — correct. |
| **TLS / HTTP** | No cleartext HTTP in production. Emulator uses `http://10.0.2.2:3001` — localhost-only, expected. |
| **URL / deeplink handling** | `safeOpenUrl` wrapper blocks all non-`http:`, non-`https:`, non-`mailto:` schemes (`javascript:`, `intent:`, etc.) — properly validated with `new URL()` parse. All external link openings go through this wrapper. |
| **User input → coach** | Track notes, onboarding text, custom RSS URLs, and Q&A queries are passed to the server API as JSON strings — no direct eval or injection path client-side. Custom RSS URL is validated as `http://` or `https://` before being accepted (HeadlinesSettingsScreen line 411). |
| **Storage** | Face photos stored in app document directory (not photo library / gallery), cleared on data reset. AsyncStorage contains only non-sensitive preferences and setup data. No PII beyond user-chosen nickname/bike/rider. |
| **Permissions** | Camera (face only, microphone disabled), photo library, calendar, notifications, location (foreground-only, circuit-arrival). All denial paths handled with Alert + Settings deep-link. Least-privilege: no background location. |
| **`@sentry/react-native` DSN** | Loaded from `EXPO_PUBLIC_SENTRY_DSN` env — correctly absent from repo. If not set, Sentry is disabled with a dev-only warning. |

No security issues found.

---

## Performance & reliability

- No unbounded `await` paths found. All network calls have explicit timeouts (8–90 s).
- `TrackMemoryScreen` Skia render loop decoupled from React state — JS thread not blocked during game. Memory leak from prior report is resolved.
- No heavy JSON parsing on main thread at startup. Scrapers run server-side; app receives pre-processed arrays.
- `HeadlinesListScreen` `renderItem` not memoised — minor, 98-item list (P2 below).

---

## Design quality

- Screens match `SCREEN_BRIEF_FOR_VISUALS.md` themes: dark slate, amber accent, rounded cards.
- Home (`HeadlinesScreen`) pivot to Learn/Setup mode confirmed. Avatar composite, bike photo, last-session card, CTA buttons all present per brief.
- `QAScreen` three-tab structure (Ask | Trivia | FAQs) with MoMS rule check under Ask matches brief.
- `RiderCoachScreen` hub buttons and `BikeSetupHubScreen` hub buttons match brief §6 / §6b exactly.
- No material brief mismatches found this cycle.

---

## Recommended fixes for Cursor

### P2 items (no P0/P1 this cycle)

1. **[P2] Add `clearGearingGuideState()` and `clearTyreWearAnalysisState()` to `handleDeleteAllData`** in `HeadlinesSettingsScreen.tsx` — import both functions and add to the `Promise.all([…])` array alongside the existing clears. Update the Alert message body to mention "Gearing Guide and Tyre Wear data" or use the generic phrasing "setup tool data". This completes the data-reset invariant for all feature storage.

2. **[P2] Memoize `renderItem` and `keyExtractor` in `HeadlinesListScreen`** with `useCallback` — prevents unnecessary FlatList re-renders when parent state changes (e.g., `refreshing` flag). One-line fix each.

3. **[P2] Pin `expo-speech-recognition` to `~57.0.x`** — currently at `56.0.1` (one major minor behind SDK 57 peer). Check `expo-speech-recognition` changelog for 57.x and update `app/package.json`. If no 57.x is published, document the intentional pin.

---

## Growth / modern practice (P2 backlog, no action required)

- **New Architecture (before SDK 58):** SDK 57 defaults to Bridge (old arch). Before enabling `newArchEnabled: true`, audit `react-native-draggable-flatlist` and `@sentry/react-native` for full New Arch compatibility. `@sentry/react-native` 7.x has partial New Arch support; v8.x is the full-support release.
- **FlatList → FlashList:** For HeadlinesListScreen and CalendarScreen, `@shopify/flash-list` is already a dependency (`@shopify/react-native-skia` is present). FlashList outperforms FlatList on long lists and recycles cells more aggressively. Worth evaluating if feed length grows beyond 150.
- **`isSessionLengthPreset()` dead pattern** in `TyreWearAnalysisScreen` (single-use array `.includes()` wrapper) — inline or remove. Cosmetic.

---

## Resolved since last MOBILE_OPS (2026-08-12 / RR_REVIEW_2026-08-17)

| Issue | Resolution |
|-------|-----------|
| [P1] Coach Chat indefinite LLM hang | Fixed — `LLM_API_TIMEOUT_MS` = 90 s applied |
| [P1] TyreWear stale state resubmit | Fixed — `resetAnalysis()` called on successful coach send |
| [P1] GearingGuide sprocket range bypass | Fixed — `sprocketTeethError()` wired; `canSend` blocks on error |
| [P1] Onboarding reset accessible in production | Fixed — `{__DEV__ && …}` gate confirmed |
| Track Memory memory leak (Skia) | Fixed — `c15c3ff` / `3e2484c` |
| expo-calendar Add Reminder deprecated | Fixed — `6949fd3` |

---

## Manual verify on device

- [ ] **GearingGuide + TyreWear data after delete-all:** Open Profile & settings → Your data & privacy → Delete all local data → complete. Re-open Gearing Guide and Tyre Wear Analysis — confirm both are empty (state cleared).
- [ ] **Coach Chat timeout surface:** Kill network mid-conversation — confirm UI shows "Request timed out — please retry" within 90 s (not indefinite spinner).
- [ ] **Track Memory Lakeside:** Select Lakeside Park in Track Memory Hub — confirm layout loads and bike moves correctly on the repaired GPX.
- [ ] **HeadlinesListScreen thumbnails:** Open News with 98 headlines — confirm images load, failed images degrade gracefully (no broken-image icons).

---

## Out of scope

- Pixel / visual QA, Maestro / detox E2E (not configured in repo).
- iOS Simulator / Android Emulator automation (not available in cron context).
- App Store / Play Store submission review status.
