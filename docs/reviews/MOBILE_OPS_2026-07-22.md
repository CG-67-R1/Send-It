# Mobile App Ops — 2026-07-22

## Status

MOBILE OPS: HEALTHY — no bugs requiring Cursor action.

---

## Executive summary

- **P0: 0 | P1: 0 | P2: 4**

App is in healthy operating condition on both iOS and Android. All automated gates pass clean (13 screens, TypeScript, API modules, track data). Production API (Render) is fully live — headlines, calendar, Q&A trivia, Ask, coach FAQs, and AI chat all respond correctly. Security posture remains solid: no secrets in source, no unexpected outbound hosts, `.env` gitignored, all permissions well-scoped, no cleartext HTTP to production hosts. Four P2s remain from the prior review; three are unchanged backlog items. One new resolution: `expo-firebase-analytics` has been removed and `analytics.ts` is now a lightweight stub — **P2-1 from 2026-07-17 is resolved**. Replacement P2-1 is `sentry-expo` now sitting dormant (same structural pattern as the old firebase dep — installed but never initialised). Track data grew from 17 → 19 catalog tracks and geofences; turn-hand verification is clean (72 verified, 0 unverified). One scraper note: `mcnews` returned 0 items in this run (non-critical; other 7 sources healthy).

---

## Automated gates

### Preflight (`node scripts/mobile-review-preflight.mjs`) — 2026-07-22

```
OK  13 screens listed
OK  TypeScript (app)
OK  server.js / qa.js syntax
OK  tracks.json parses — 19 catalog tracks, 19 geofence features
OK  the_bend_international ~4.95 km, the_bend_gt ~7.77 km
OK  shared geofence centres verified (Bend, SMP)
OK  turn-hand policy: 72 verified left|right, 0 unverified
WARN planned layout not in catalog yet: the_bend_east (unchanged)
WARN planned layout not in catalog yet: the_bend_west (unchanged)
WARN planned layout not in catalog yet: smp_amaroo (unchanged)
WARN planned layout not in catalog yet: collingrove_hillclimb (unchanged)
OK  AU cache: 97 headlines (updated 2026-07-21)
OK  AU calendar cache: 62 events
OK  calendar aggregation: 97 events, 73 AU full-detail
SKIP live API not running locally (non-fatal)
PASS health-check.mjs
All preflight checks passed.
```

### Production health-check (`API_URL=https://send-it-ke7r.onrender.com`) — 2026-07-22

```
OK  TypeScript (app)
OK  AU interleave logic (1-in-4)
OK  All API modules syntax clean
OK  retrieveForAsk: 5 chunks, fromKb=true
OK  scrapers returned 160 headlines
OK  gpone: 12 items
OK  motor_sport_motogp: 8 items
OK  thumbnails: 126/160
WARN mcnews returned 0 items (non-critical; intermittent)
OK  MoMS corpus 2026, nextReviewDue 2027-01-15
OK  AU cache: 97 headlines
OK  AU calendar cache: 62 events, aggregator/governing-body source present
OK  calendar aggregation: 97 events, 73 AU full-detail
  -- API not reachable at http://localhost:3001 (non-fatal; tested production separately)
Health check passed
```

### verify-production.mjs — 2026-07-22

```
OK  /health ok=true
OK  roadraceAi enabled
OK  /headlines: 138 items
OK  /calendar: 97 events
OK  /qa/trivia returns a question
OK  /roadrace-ai/faqs: 20 coach FAQs
Production verify passed
```

### ios-smoke-test.mjs — 2026-07-22

```
OK  [Headlines] 138 headlines, 41 AU items, 20 built-in sources
OK  [Events] 97 events, 22 MotoGP 2026 rounds
OK  [Q&A] trivia question ready, Ask mode available
OK  [Track Walk] local notes — no API required for save
OK  [Coach] FAQs coach=20 bikesetup=20, chat endpoint configured
OK  [App] TypeScript compiles
11 passed, 0 failed
iOS smoke test passed
```

---

## Platform fitness (iOS / Android)

**API / networking**

- `app/constants/api.ts` — unchanged and correct. `EXPO_PUBLIC_API_URL` override supported; Android emulator heuristic intact; default falls through to Render production. No cleartext HTTP to any production host.
- All fetch calls carry `AbortSignal.timeout()`: Headlines (45 s / 90 s refresh), custom sources (20 s), Calendar (15 s), Q&A trivia (8 s), Coach chat (90 s). Full timeout coverage.
- Production TLS only — HTTPS for all Render endpoints.

**Permissions**

- Camera: foreground, `recordAudioAndroid: false`. Denied path shows Alert + Settings link. ✓
- Photos: scoped to avatar/bike/track photo flows. Permission string user-friendly. ✓
- Location: foreground-only via `requestForegroundPermissionsAsync`. Triggered in Settings when geofence enabled. Denied → `Linking.openSettings()`. ✓
- Notifications: only when user enables Priority 1 alerts. ✓
- Speech recognition: `getSpeechRecognition()` is now a module-scope singleton (cached after first `require` call — P2-3 from 2026-07-17 is **resolved**). ✓
- `expo-calendar`: write permission clear. ✓

**Build / Expo**

- Expo SDK ~54, React Native 0.81.5, React 19. Stack current.
- `jsEngine: "hermes"` in `app.json`. ✓
- New Architecture: `newArchEnabled` still not set (old arch default for SDK 54). Unchanged from prior review — not a blocker at this stage.
- `expo-speech-recognition ^3.1.0` — loaded via module-scope singleton (`getSpeechRecognition()`); now called once and cached. P2-3 resolved.

**Navigation**

- RiderCoachScreen correctly uses `navigation.replace('CoachChat', …)` on seed/draft handoff — prevents stacked Coach screens on back. ✓
- ImportTrackNotesScreen has dual-path navigation (stack vs tab parent); graceful fallback to `Alert.alert` if neither path is available. ✓
- HeadlinesScreen `getParent()` for cross-tab navigation — same pattern as before; low-risk for current tab structure. ✓

---

## Per-screen findings

### OnboardingScreen
- ✓ 8-step flow with skip logic (step 4→6 when not `race_one_day`; back from 6→4). Correct.
- ✓ `pickRandomNoPhotoAvatar()` on step 7 if no avatar chosen.
- ✓ Face photo cleared if preset switched away from hasFaceHole avatar.
- ✓ Email sent via `mailto:` to `projectapex@outlook.com.au` — expected internal contact, not a leak.
- Progress dots use `key={i}` — static, never reordered. Low-risk (P2, no urgency).
- Step 3 "Taste bridge" calls `getRiderFact` / `getBikeFact` — offline curated JSON, no network call. ✓

### HeadlinesScreen
- ✓ Prefetch guard (`hasPrefetchedHeadlines`) prevents duplicate warm-up on remount.
- ✓ Avatar composite (`AvatarFaceEllipse`) shown when face hole + face URI both present.
- ✓ Bike photo add/remove flows correct; denied path shows Alert + Settings link.
- ✓ `RaceSport` custom font used for nickname and nav buttons.

### HeadlinesListScreen
- ✓ `keyExtractor` uses `${url}-${index}` composite — avoids duplicate-key warnings.
- ✓ Three view modes (Aus / World / Custom) with `useMemo` filtering.
- ✓ Thumbnail lazy-load with error fallback (`onError → setFailed(true)`).
- ✓ Loading / error / empty states all present. Error text displays raw API message.
- Note: error message still says "Start the API server (in /api run: npm start)" — fine for dev; acceptable for PoC. Not user-facing in production path.

### CalendarScreen
- ✓ Default filter `australia` — matches brief intent.
- ✓ `isUpcomingOrOngoing` filters past events.
- ✓ `keyExtractor` uses `${series}-${startDate}-${title}` — stable composite. ✓
- ✓ `addReminder` gracefully handles `Calendar.isAvailableAsync()` false.
- ✓ `fetchCalendar` timeout message distinguishes network error vs API error.

### QAScreen
- ✓ Ask tab uses `sendAskChat` (rules-aware); Rules tab uses `mode: 'rules'`; Trivia does **not** use GPT. Modes correct.
- ✓ Trivia question `key={i}` on answer options — safe, static list per question, never reordered mid-question.
- ✓ Timer cleanup on unmount (`triviaFeedbackTimerRef.current`).
- ✓ Goat explosion animation uses native driver. ✓
- ✓ Best score persisted to AsyncStorage via `STORAGE_KEYS.TRIVIA_BEST_SCORE`.
- `analytics.ts` is now a lightweight stub — no outbound connections. ✓ (P2-1 resolved)

### RiderCoachScreen
- ✓ Hub screen with `navigation.replace` for seed/draft handoff — avoids stacked screens.
- ✓ Clean separation: "AI dialog" (CoachChat) vs "Tools" (DaySheet, Basics, FAQs).
- `RaceSport` font on nav buttons. ✓

### CoachChatScreen
- ✓ Message bubbles now use `key={m.id}` (stable UUIDs from `createChatMessage`). P2-2 from 2026-07-17 is **resolved**.
- ✓ Generation counter prevents stale reply injection after `clearConversation`.
- ✓ Error recovery: on API failure, user message is removed, draft+attachments restored.
- ✓ Mode suggestion banner shown when AI detects wrong mode; one-tap switch.
- ✓ `sendCoachChat` carries 90 s timeout (configured in `coachChat.ts`).
- ✓ Attachment handling: image preview thumbnails in bubble; file shown as chip.

### TrackWalkScreen
- ✓ `getSpeechRecognition()` is module-scope singleton — P2-3 resolved.
- ✓ Speech listener subscribed once on mount; cleanup on unmount.
- ✓ 19 catalog tracks; "Other track" path with direction + name validation.
- ✓ `sendToCoach` navigates to RiderCoachTab with seeded conversation. ✓
- TrackWalk entry list uses `key={index}` — entries are append-only/delete-only (no reorder), so not a practical bug. Low-risk P2.

### ImportTrackNotesScreen
- ✓ Paste from clipboard, photo attach, track selector, send to coach. All paths correct.
- ✓ Dual navigation path (stack or tab parent); fallback Alert if neither available. ✓
- ✓ Session ready check via `sessionReadyForCoach` before sending.

### BikeSetupBasicsScreen
- ✓ Hotspot diagram with labeled callouts; tap opens AI coach with seeded draft.
- ✓ Timer cleanup on unmount (`labelTimerRef`). ✓
- ✓ Hit-target HOTSPOT_HIT = 44 — meets 44pt minimum. ✓

### BikeSetupSheetScreen
- ✓ Debounced auto-save (400 ms) on field change.
- ✓ Session history with load/delete. `key={item.updatedAt}` — stable timestamp key. ✓
- ✓ "Send to AI" formats sheet and opens CoachChat with seeded content.

### RoadRacerAiFaqsScreen
- ✓ Searchable FAQ list for Coach and Bike Setup modes.
- ✓ Tap question → opens CoachChat with seedDraftMessage. ✓

---

## Performance & reliability

- **Headlines prefetch**: guard prevents duplicate warm-up. ✓
- **FlatList virtualization**: Calendar (97 events), Headlines (~138 items) both within FlatList comfort zone. No perf concerns.
- **CoachChatScreen scroll**: `ScrollView` with manual `scrollToEnd` after reply — acceptable for a chat-sized list (no thousands of items expected). `FlatList` would be better at scale but not needed now.
- **BikeSetupSheetScreen save debounce**: 400 ms debounce prevents rapid AsyncStorage writes during typing. ✓
- **QAScreen timer**: feedback timer ref cleared on unmount. ✓
- **No large synchronous JSON on startup**: Avatar PNGs bundled, tracks JSON loaded async, MoMS JSON loaded server-side only. ✓
- **TrackWalkScreen sendToCoach**: fires `sendCoachChat` in `finally { setSendingCoach(false) }` — not in `catch` — which means if `tabNav?.navigate` throws, `sending` state is still cleared. Navigation throw is unlikely; low risk.

---

## Design quality

All screens match `SCREEN_BRIEF_FOR_VISUALS.md` intent (dark slate `#0f172a`, amber `#f59e0b` accent, rounded cards). No material brief mismatches observed. Screen brief mentions "Rider Coach" as a placeholder with tabs — code now has a full hub + dedicated chat screens. Brief is intentionally simplified; no action needed.

The `mcnews` returning 0 items (noted in health-check output) is a scraper-level intermittent issue, not an app-level concern — the other 7 sources are healthy and the user-facing feed remains well-populated.

---

## Security & connections

| Check | Finding |
|-------|---------|
| **Secrets in source** | None. `EXPO_PUBLIC_API_URL` in `.env` gitignored. No API keys, tokens, DSNs hardcoded. `sentryDsn` reads `${EXPO_PUBLIC_SENTRY_DSN}` (env substitution) — not hardcoded. No `google-services.json` / `GoogleService-Info.plist`. |
| **Outbound hosts** | All API calls target `send-it-ke7r.onrender.com` (prod) or `http://10.0.2.2:3001` (Android emulator dev). No third-party analytics, ad SDKs, or tracking. `analytics.ts` is a no-op stub. |
| **Sentry** | `sentry-expo ~7.0.0` in `package.json` but `Sentry.init()` is not called anywhere in source (`App.tsx`, screens, utils — none). No `EXPO_PUBLIC_SENTRY_DSN` in any committed file. Sentry makes zero outbound connections without init. Pattern is the same as the now-removed firebase dep — dormant but adds bundle weight. See P2-1. |
| **TLS** | All production fetch calls HTTPS. Cleartext only on `http://10.0.2.2:3001` (Android emulator dev path — not shipped). |
| **Input** | Coach chat sends user text to `/roadrace-ai/chat`; API rate-limited (30 req/15 min). No client-side eval/injection patterns. Track notes sent as strings — server-side validation applies. |
| **`projectapex@outlook.com.au` mailto** | Used only in OnboardingScreen "future racer" email opt-in path — expected internal contact. Not a secret; it's a contact address. ✓ |
| **Storage** | AsyncStorage stores onboarding answers, avatar ID, bike/face photo URIs, trivia best score, BikeSetupDaySheet. No tokens or passwords. Face photos stored at app-local URI (not shared directory). ✓ |
| **Deeplinks** | `scheme: "roadrace"` registered. No deeplink handler active (`Linking.addEventListener` / `getInitialURL` not called in `App.tsx`). No exploit surface. ✓ |
| **Permissions** | Foreground-only location, camera without audio, scoped photo library access. Least-privilege met. ✓ |

---

## Recommended fixes for Cursor

None at P0/P1. **All previous P0/P1 items remain at zero.** P2 backlog (no urgency):

1. **[P2-1] `sentry-expo` dormant dependency** — Sentry is not initialised; adds ~400 KB to bundle, increases attack surface. Recommended fix (Cursor): either (a) wire up Sentry properly (`Sentry.init(...)` in `App.tsx` with `EXPO_PUBLIC_SENTRY_DSN`) and test that it silently no-ops without a DSN, OR (b) remove `sentry-expo` from `package.json` if crash reporting is not needed yet. Option (b) keeps bundle lean. Before choosing, note P2-4 (New Arch): `sentry-expo` ~7 is not New Arch compatible — migrating to `@sentry/react-native` directly is cleaner when/if Sentry is adopted.

2. **[P2-2] `key={index}` in TrackWalkScreen entry list (line 496)** — Append-only/deletable list using array index as key. No practical bug today, but deletion causes flicker. Recommended fix (Cursor): assign a stable `id` (e.g. `Date.now().toString()` or nanoid) on `addEntry` push and use that as key.

3. **[P2-3] `key={i}` in OnboardingScreen progress dots (line 235)** — Static fixed-length array, never reordered. Truly harmless but easily fixed. Recommended fix (Cursor): use `key={`step-dot-${i}`}`.

4. **[P2-4] New Architecture readiness** — SDK 54 defaults to old arch; SDK 55 will flip the default. `sentry-expo` ~7 is not New Arch compatible (another reason to switch to `@sentry/react-native` direct). Recommended action (Cursor, before SDK 55 upgrade): audit all native plugin compatibility and switch Sentry to the direct package.

---

## Growth / modern practice (P2)

- **`mcnews` scraper**: returned 0 items in two consecutive health-check runs. Low priority (not a P0/P1 — other sources are healthy), but worth an API-side check. Cursor/Hermes can monitor this over the next week; if it consistently returns 0, the scraper may need updating.
- **CoachChatScreen scroll**: currently uses `ScrollView` with `scrollToEnd`. For very long sessions this is fine. If user plans to persist chat history across app restarts (a future feature), migrating to `FlatList` with `inverted` would be worth planning.
- **`RaceSport` font**: loaded via `useFonts` in `App.tsx` — good. No font-flash risk since app waits for `fontsLoaded` before rendering.
- **SDK 55 prep**: track Expo SDK 55 release notes for New Architecture defaults and any managed-workflow migration steps.

---

## Resolved since last MOBILE_OPS_2026-07-17

| Item | Status |
|------|--------|
| [P2-1] `expo-firebase-analytics` orphaned dep | ✅ **Resolved** — removed from package.json; analytics.ts is now a no-op stub |
| [P2-2] `key={i}` in CoachChatScreen message list | ✅ **Resolved** — now uses `key={m.id}` (stable UUID from `createChatMessage`) |
| [P2-3] Dynamic `require` per-call in TrackWalkScreen | ✅ **Resolved** — `getSpeechRecognition()` is module-scope singleton; cached after first load |
| Track count 17 → 19 | ✅ Catalog grew: 19 tracks, 19 geofence features, 72 verified turn-hands |
| New Architecture note | ↩ Carried forward as P2-4 (unchanged) |

---

## Manual verify on device

- [ ] Open avatar capture on a leathers preset — confirm amber guide oval aligns with face hole artwork.
- [ ] Send a coach chat message — confirm reply within 90 s; error bubble shown if offline.
- [ ] Enable track-arrival geofence in Settings — confirm location permission prompt; deny → Settings link.
- [ ] Start voice transcription in Track Walk — confirm permission requested once; transcript appended correctly; stop/start cycle works.
- [ ] Pull-to-refresh on Headlines — confirm fresh load within 90 s.
- [ ] Calendar tab shows "Aus" filter by default; tap a MotoGP event → opens link.
- [ ] Import Track Notes → paste clipboard text → Send to Coach → conversation appears in Coach tab.

---

## Out of scope

- Pixel / visual regression QA
- Maestro / Detox E2E automation (not configured)
- App Store / Play Store submission readiness (not evaluated this cycle)
