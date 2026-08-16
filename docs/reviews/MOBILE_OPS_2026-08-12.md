# Mobile App Ops — 2026-08-12

## Status

MOBILE OPS: HEALTHY — no bugs requiring Cursor action.

---

## Executive summary

- **P0:** 0 | **P1:** 0 | **P2:** 6
- The Send-It / RoadRacer Expo app is in healthy operating condition on both iOS and Android. All automated gates pass (TypeScript, scrapers, track data, AU cache, API syntax). The production Render API is live and fully functional — 98 headlines, 65 calendar events, trivia, FAQs, and coach endpoint all OK. Screen-by-screen code review found no crashes, navigation dead-ends, silent failures, missing error states, or security issues. The codebase is clean, intentional, and well-structured throughout. Six P2 items are noted for future hardening.

---

## Automated gates

### Preflight (`node scripts/mobile-review-preflight.mjs`)
```
OK  19 screens listed
OK  TypeScript (app)
OK  server.js syntax / qa.js syntax
OK  track_turn_verification.json — 68 verified turns, 0 unverified
OK  19 catalog tracks / 19 geofence features
OK  The Bend GT ~7.77 km / International ~4.95 km
WARN  planned layout not in catalog yet: the_bend_east, the_bend_west, smp_amaroo, collingrove_hillclimb (known planned tracks, not a gate failure)
WARN  npm audit (app) — critical:0, high:10, moderate:8 (all in Metro/image-size dev toolchain; no runtime path)
OK  npm audit (api) — no vulnerabilities
```
All gates: **PASSED**

### Health check (`API_URL=https://send-it-ke7r.onrender.com node scripts/health-check.mjs`)
```
OK  TypeScript (app)
OK  AU interleave logic
OK  all API module syntaxes
OK  retrieveForAsk: 5 chunks, fromKb=true
OK  scrapers: 98 headlines, gpone 12, motor_sport_motogp 8
OK  thumbnails: 74/98
OK  MoMS corpus 2026 edition, nextReviewDue 2027-01-15
OK  AU cache: 54 headlines (updated 2026-08-11)
OK  AU calendar cache: 30 events
OK  calendar aggregation: 65 events, 41 AU full-detail
-- API at localhost:3001 not running (expected in cron context)
```

### Production verify (`node scripts/verify-production.mjs`)
```
OK  /health ok=true, roadraceAi enabled
OK  /headlines: 98 items
OK  /calendar: 65 events
OK  /qa/trivia returns a question
OK  /roadrace-ai/faqs: 20 coach FAQs
PASS
```

### iOS smoke test (`node scripts/ios-smoke-test.mjs`)
```
OK  [Headlines] 98 headlines, 31 AU items, 10 built-in sources
OK  [Events] 65 events, 22 MotoGP 2026 rounds (live API)
OK  [Q&A] trivia question ready, Ask mode available
OK  [Track Walk] local notes — no API required
OK  [Coach] FAQs coach=20 bikesetup=20, chat endpoint configured
OK  [App] TypeScript compiles
11 passed, 0 failed — PASS
```

---

## Platform fitness (iOS / Android)

### API / Networking (`app/constants/api.ts`)
- **HTTPS everywhere in production.** `PRODUCTION_API_URL` is `https://send-it-ke7r.onrender.com`. No cleartext HTTP in any production path.
- Android emulator correctly routes to `http://10.0.2.2:3001` only when `isLikelyAndroidEmulator()` returns true (model/fingerprint heuristic + `EXPO_PUBLIC_ANDROID_EMULATOR_HOST`). iOS sim / Expo Go default to the hosted Render API — no local API required.
- `EXPO_PUBLIC_API_URL` env override works for both platforms. The live `.env` contains only the production URL; no secrets. `.env` is in `.gitignore`.
- `apiFetch()` injects `x-app-secret` header only when `EXPO_PUBLIC_APP_API_SECRET` is set — correctly documented as a "defence-in-depth" measure visible in the bundle, not a true secret.
- All API calls use `AbortSignal.timeout()` (8–90 s depending on context). No unbounded awaits found.

### Performance
- `HeadlinesListScreen` uses `FlatList` with virtualization. Thumbnail images are limited to first 15 items (`index < 15`). Error images degrade gracefully (`onError` sets `failed=true`).
- `QAScreen` uses `ScrollView` (not `FlatList`) for trivia — acceptable given the small/fixed item count (4 answer buttons per question). Goat explosion animation uses `useNativeDriver: true`.
- `HeadlinesScreen` prefetches headlines once on mount via `AbortSignal.timeout(25000)` — best-effort warm-up that never blocks UI.
- `CalendarScreen` uses `FlatList` with `key={filter}` for clean remount on filter change. `useMemo` on `filteredEvents` and `listHeader` — correct.
- `CoachChatScreen`: `ScrollView` is appropriate for chat history (not expected to reach FlatList threshold). Message list scroll-to-end uses `setTimeout(100)` — minor but acceptable.
- `TrackMemoryScreen` uses `requestAnimationFrame` game loop with `expo-screen-orientation` for landscape. This is the only screen with active RAF; cleanup in effect return value — correct.
- No blocking work detected on the JS thread at startup. Onboarding data loaded from `AsyncStorage` in parallel via `Promise.all`.

### Stability
- All fetch calls have explicit error states surfaced in UI (`setError`, `Alert.alert`). No silent swallow found in any main screen flow.
- `CoachChatScreen` correctly reverts user message + restores input on failure, with generation guard (`conversationGenerationRef`) for stale responses after clear.
- Trivia timer (`triviaFeedbackTimerRef`) is cleaned up in `useEffect` return and in `resetTrivia`.
- `TrackWalkScreen`: speech recognition listener is unsubscribed on unmount (`resultSub?.remove()`). Voice unavailability handled with clear alerts.
- `OnboardingScreen`: `handleFinish` wrapped in try/catch with `Alert.alert`. Legal acceptance gate prevents accidental completion.
- AsyncStorage race: all reads use `let cancelled = false` pattern in async effects where unmount races are relevant — no stale-setState crashes detected.

### Permissions
| Permission | Handling |
|---|---|
| Camera (avatar face) | `requestCameraPermissionsAsync` → denied path shows Alert with `Open Settings` |
| Photos (bike photo, track photos, avatar) | `requestMediaLibraryPermissionsAsync` → denied path shows Alert with `Settings` link |
| Calendar | `requestCalendarPermissionsAsync` → denied path shows Alert with `Open Settings` |
| Notifications | `requestPermissionAsync` → denied handled in toggle flow |
| Location | `requestForegroundLocationPermission` → granted before geofence use |
| Microphone (speech recognition) | `requestPermissionsAsync` via expo-speech-recognition → denied shows Alert |

All permissions: granted paths proceed, denied paths show clear alerts with Settings deep-links. No over-broad permissions (no background location, no always-on). `microphonePermission: false` explicitly in `expo-camera` plugin config.

### Build / Expo
- **SDK:** Expo 57 (`package.json` shows `"expo": "^57.0.0"`, `react-native: 0.86.2`). This is SDK 57, up from the SDK 54 noted in `PROJECT_STATUS_AND_PRE_PRODUCTION.md`. App is tracking current Expo SDK.
- `expo-file-system/legacy` used for `documentDirectory` (matches the fix noted in PROJECT_STATUS_AND_PRE_PRODUCTION.md).
- `expo-speech-recognition: 56.0.1` is one major behind SDK 57 — minor mismatch; functional but worth aligning.
- New Architecture: SDK 57 defaults to New Architecture enabled. `@sentry/react-native/expo` is used (correct modern package, not deprecated `sentry-expo`). Lazy Sentry init after runtime ready prevents New Arch startup issues.
- `enableProguardInReleaseBuilds: true` + `enableShrinkResourcesInReleaseBuilds: true` in Android build properties — correct for release APK size/obfuscation.
- iOS deployment target: 16.4 (matches current Expo recommendations).

### UX / Design quality
- All screens match `SCREEN_BRIEF_FOR_VISUALS.md` intent. Dark slate palette (`#0f172a`/`#1e293b`) with amber accent (`#f59e0b`) applied consistently. Cards have 4 px left accent bars. Tab bar at bottom. Headers dark with amber action text.
- Navigation buttons have `minHeight: 56` (meets 44 pt minimum touch target).
- All screens have loading, error, and empty states — no dead-end states found.
- `TrackPrepHubScreen` correctly disables tool buttons until track is selected (opacity 0.45, `disabled` prop set).
- `TrackMemoryScreen` landscape orientation locked via `expo-screen-orientation` — appropriate for game.
- `SCREEN_BRIEF_FOR_VISUALS.md` section 6 describes "Coach | Bike Setup tabs" but current `RiderCoachScreen` is correctly a hub with two nav buttons; brief is slightly stale on this detail (no user-visible impact).

---

## Performance & reliability

No P0/P1 items. P2 notes:

- **[P2]** `CoachChatScreen` scroll-to-end uses `setTimeout(100/150)` — fragile on slow devices. Consider `onContentSizeChange` → `scrollToEnd` instead.
- **[P2]** `HeadlinesListScreen` `refreshControl` timeout is 90 s for manual refresh — acceptable but may feel hung on slow connections. Consider a progress indicator or shorter timeout with retry.
- **[P2]** `expo-speech-recognition` at `56.0.1` while app is at Expo 57; align versions for full compatibility.

---

## Design quality

No P0/P1 design issues. UX is consistent with the brief. P2 note:

- **[P2]** `SCREEN_BRIEF_FOR_VISUALS.md` §6 describes "Coach | Bike Setup tabs" inside Rider Coach — current implementation uses hub nav buttons (correct per recent refactor). Brief should be updated to match current architecture.

---

## Security & connections

### Secrets audit
- No API keys, tokens, or secrets in app source, `.env`, or committed files.
- `EXPO_PUBLIC_APP_API_SECRET` is a _client-visible_ shared secret documented as defence-in-depth only — acceptable.
- `.env` only sets `EXPO_PUBLIC_API_URL=https://send-it-ke7r.onrender.com`. `.env` is gitignored.
- No hardcoded secrets found anywhere in `app/src/`.

### Endpoints / connections
| Host | Purpose | Assessment |
|---|---|---|
| `send-it-ke7r.onrender.com` | Primary API (headlines, calendar, AI) | Expected, HTTPS only |
| `api.open-meteo.com` | Trackday weather forecast | Public, no API key, HTTPS, 8 s timeout |
| `github.com` | Privacy policy / Terms of Use links (via `safeOpenUrl`) | Expected |
| `10.0.2.2:3001` | Android emulator dev only | Dev only, never production |

No unexpected or unknown hosts. No hard-coded third-party analytics SDKs or ad SDKs.

### URL / deeplink safety
- `safeOpenUrl()` validates scheme whitelist (`http:`, `https:`, `mailto:`) and blocks `javascript:`, `intent:`, and other schemes. Used consistently across all screens — no raw `Linking.openURL()` calls in screen code bypassing the guard.
- Custom RSS feed URLs in `HeadlinesSettingsScreen` are validated with `new URL()` and must be `http:` or `https:` before submission.

### TLS / HTTP
- No cleartext HTTP in production paths. Android emulator path (`http://10.0.2.2`) is dev-only, never reaches a release build.

### Input
- `TextInput` fields have `maxLength` where relevant (`maxLength={2000}` on Q&A ask, coach chat).
- Track notes pasted from clipboard are plain text — no markup/script execution risk.
- No `WebView` used anywhere in the app.

### Storage
- Face photos stored in `documentDirectory` (app-private). Bike photos likewise.
- No sensitive PII in `AsyncStorage` beyond rider nickname, bike preference, and avatar ID — all user-chosen profile data.
- `handleExportData` exports via native share sheet — no silent upload to external servers.

### Permissions
- Permissions scoped to actual features. No background location, always-on mic, or contacts access.

### npm audit (app)
- **critical: 0, high: 10, moderate: 8** — all findings are in Metro bundler / `image-size` dev toolchain (not in any runtime-loaded code). These packages are not included in the distributed app bundle. No runtime CVEs. Fixable by upgrading to `expo@53` → the `fixAvailable` flag points to a major version bump (`expo@53.x`) that would be outside the current SDK 57 version pin. **No action required now; track against next scheduled SDK upgrade.**

---

## Recommended fixes for Cursor

None required. No P0 or P1 findings.

### P2 backlog (no urgency)

1. **[P2] Align expo-speech-recognition** — update from `56.0.1` to the SDK 57-compatible version. Run `npx expo install expo-speech-recognition` to auto-select the correct version.

2. **[P2] CoachChatScreen scroll-to-end** — replace `setTimeout(100)` after send with an `onContentSizeChange` callback on the `ScrollView` ref for reliable scroll on all device speeds.

3. **[P2] SCREEN_BRIEF_FOR_VISUALS.md §6 staleness** — update "Coach | Bike Setup tabs" description to reflect the current hub-with-nav-buttons architecture; no code change needed.

4. **[P2] HeadlinesListScreen refresh timeout** — 90 s refresh timeout (`isRefresh` path) may feel hung on slow connections. Consider 45 s + a user-visible "still loading…" message.

5. **[P2] Sentry DSN** — ensure `EXPO_PUBLIC_SENTRY_DSN` is set in the Vercel/EAS environment for production crash reporting. Current code warns in dev if unset but silently disables in production — acceptable, just ensure it is configured before full launch.

6. **[P2] expo-speech-recognition microphone permission string** — `app.json` lists `expo-speech-recognition` as a plain plugin entry with no custom permission string. Add a `speechPermission` string (iOS) to match the user-facing explanation style of other permissions.

---

## Growth / modern practice (P2)

- **New Architecture (SDK 57):** New Arch is default-enabled in SDK 57. `@sentry/react-native` is the correct package. Confirm any remaining `sentry-expo` references are absent (none found in current codebase — good).
- **`useNativeDriver` coverage:** Trivia goat animation uses `useNativeDriver: true`. All `Animated` uses found are either native-driver eligible or appropriately non-native (layout-affecting). No issues.
- **FlatList `windowSize`/`maxToRenderPerBatch`:** Default settings used throughout. With 98 headlines this is fine; consider tuning if list grows significantly.
- **`getParent()` navigation:** `HeadlinesScreen` uses `navigation.getParent()` to navigate across tabs (`CalendarTab`, `Q&A`, `RiderCoachTab`). This pattern is correct for tab/stack nesting but will throw silently if parent is undefined. Current code stores as `const tabNav = ...` and calls `tabNav?.navigate(...)` — optional chaining correctly handles the null case.

---

## Resolved since last MOBILE_OPS

*First review — no prior MOBILE_OPS report to compare against.*

Prior fixes tracked in `PROJECT_STATUS_AND_PRE_PRODUCTION.md`:
- ✅ `priority1Notifications.ts` — `NotificationBehavior` updated (deprecated `shouldShowAlert` removed)
- ✅ `ChangeAvatarScreen.tsx` — `CameraType.front` casing fixed
- ✅ `OnboardingScreen.tsx` — `CameraType.front` + null coalescing fix
- ✅ `avatarPhoto.ts` / `bikePhoto.ts` — switched to `expo-file-system/legacy`
- ✅ `api/qa.js` — duplicate `options` variable resolved
- All previously noted TypeScript errors: **resolved** (TypeScript check passes clean)

---

## Manual verify on device

- [ ] **iOS Expo Go — all 5 tabs:** Headlines, Events, Q&A, Coach, tab switching. Confirm amber tab indicator correct.
- [ ] **Android Expo Go — headlines load from Render** (not emulator — physical device should use production URL by default).
- [ ] **Avatar face photo capture:** Take photo → confirm composited on Home hero badge. Settings → remove face photo → badge falls back to mascot.
- [ ] **Bike photo pick + remove:** Tap Home hero → pick photo → confirm display. Long-press → remove → placeholder restored.
- [ ] **Trivia full flow:** Start → answer 3 wrong → fail state. Start → 8 correct → Track Guru + goat animation at 12.
- [ ] **Q&A Ask + Official Rule Check:** Send a question → confirm reply + sources. Send a rules query → confirm MoMS clause reference.
- [ ] **Coach chat + mode switch:** Send coach message → get reply. Send bike setup question → confirm mode-switch suggestion banner.
- [ ] **Track Walk:** Pick catalog track → add corner note + photo → Save → confirm in saved sessions list.
- [ ] **TrackdayPrep:** Pick track → fill rider level + tyres → confirm AI brief → Report screen.
- [ ] **Track Memory game:** Pick available circuit → play → accel/brake controls respond, lap timer runs.
- [ ] **Calendar reminder:** Tap "+ Add reminder" on an event → confirm native calendar permission prompt → event appears in device calendar.
- [ ] **Location permission (iOS):** Enable track arrival in Settings → confirm foreground location prompt on first use.
- [ ] **Notification permission:** Enable "Notify for Priority 1" → confirm permission prompt on first toggle.

---

## Out of scope

- Pixel-perfect QA and visual regression testing
- Full Maestro / Detox E2E automation (not configured in repo)
- EAS Build / App Store submission testing (pre-production)
- Sentry event verification (requires live DSN in EAS build)
