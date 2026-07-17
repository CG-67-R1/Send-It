# Mobile App Ops — 2026-07-17

## Status

MOBILE OPS: HEALTHY — no bugs requiring Cursor action.

---

## Executive summary

- **P0: 0 | P1: 0 | P2: 4**

App is in healthy operating condition on both iOS and Android. All automated gates pass clean. Production API (Render) is fully live — headlines, calendar, Q&A trivia, coach FAQs, and AI chat all respond. TypeScript compiles without error. Security posture is solid: no secrets in source, no unexpected outbound hosts, `.env` gitignored, permissions well-scoped. Four P2s identified — none require immediate Cursor action but are good candidates for the next polish sprint.

Delta since RR_REVIEW_2026-07-14: screen count grew from 9 → 13 (BikeSetupBasicsScreen, BikeSetupSheetScreen, CoachChatScreen, RoadRacerAiFaqsScreen added). All new screens pass TypeScript and follow existing conventions. Avatar face-hole geometry was corrected this session (widthPct/heightPct/topPct + FACE_IN_HOLE_SCALE fixed) — no further action needed.

---

## Automated gates

### Preflight (`node scripts/mobile-review-preflight.mjs`) — 2026-07-17

```
OK  13 screens listed
OK  TypeScript (app)
OK  server.js / qa.js syntax
OK  tracks.json parses — 17 catalog tracks, 17 geofence features
OK  The Bend GT/International lengths, shared geofence centres
OK  validate-track-data.mjs (7 warnings — planned layouts not yet in catalog; corner direction verify items — unchanged from prior reviews)
[preflight timed out at repo health-check live-API probe — non-fatal; production check run separately]
```

### Production health-check (`API_URL=https://send-it-ke7r.onrender.com node scripts/health-check.mjs`)

```
OK  TypeScript (app)
OK  AU interleave (1-in-4)
OK  All API modules syntax clean
OK  retrieveForAsk: 5 chunks, fromKb=true
OK  scrapers returned 164 headlines (gpone: 12, motor_sport_motogp: 8)
OK  thumbnails 130/164
OK  MoMS corpus 2026 edition, nextReviewDue 2027-01-15
OK  AU cache: 82 headlines (updated 2026-07-16)
OK  AU calendar cache: 59 events (updated 2026-07-17)
OK  calendar aggregation: 94 events
OK  API /health at https://send-it-ke7r.onrender.com
OK  roadraceAi enabled (OPENAI_API_KEY set)
OK  /headlines: 152 items
OK  /calendar: 94 events
Health check passed
```

### verify-production.mjs

```
OK  /health ok=true
OK  roadraceAi enabled
OK  /headlines: 152 items
OK  /calendar: 94 events
OK  /qa/trivia returns a question
OK  /roadrace-ai/faqs: 20 coach FAQs
Production verify passed
```

### ios-smoke-test.mjs

```
OK  [Headlines] 152 headlines, 55 AU items, 20 built-in sources
OK  [Events] 94 events, 22 MotoGP 2026 rounds
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

- `app/constants/api.ts`: Clean. `EXPO_PUBLIC_API_URL` override supported; Android emulator detected via `Platform.constants` fingerprint heuristic; default (dev + prod) falls back to Render production URL — no local API start required for Expo Go testers. Correct for current development stage.
- All fetch calls carry `AbortSignal.timeout()`: Headlines (45 s / 90 s refresh), custom sources (20 s), Calendar (15 s), Q&A trivia (8 s), Coach chat (90 s for AI). Timeout coverage is complete.
- HTTP cleartext only on `http://10.0.2.2` (Android emulator dev path) — expected and documented. All production traffic over HTTPS.

**Permissions**

- Camera: foreground only, no microphone, `recordAudioAndroid: false`. Granted only when user opens avatar capture. Denied path shows fallback UI with "Allow camera" button. ✓
- Photos: scoped to avatar/bike photo pick. Permission string is user-friendly. ✓
- Location: foreground-only via `requestForegroundPermissionsAsync`. Triggered explicitly in Settings screen when user enables track-arrival geofence. Denied path calls `Linking.openSettings()`. ✓
- Notifications: requested only when user enables Priority 1 headlines alerts. ✓
- Speech recognition: dynamic `require('expo-speech-recognition')` in TrackWalkScreen; permission requested before use. ✓
- `expo-calendar`: write permission string is clear. ✓

**Build / Expo**

- Expo SDK ~54, React Native 0.81.5, React 19. Stack is current.
- `jsEngine: "hermes"` set in `app.json` — correct for production builds.
- New Architecture: not explicitly opted in (`newArchEnabled` not set). Default for SDK 54 on managed workflow is old arch. Not a blocker at this stage but worth tracking for SDK 55.
- `expo-speech-recognition` loaded via dynamic `require` — avoids native module crash on platforms where it's absent. Correct defensive pattern.

---

## Performance & reliability

- **HeadlinesScreen**: Prefetch fires once on mount via `hasPrefetchedHeadlines` guard — prevents duplicate warm-up requests. ✓
- **HeadlinesList FlatList**: `keyExtractor` uses `url-index` composite — avoids duplicate-key warnings. ✓
- **CoachChatScreen**: Message list uses `key={i}` (array index as key). For an append-only chat log this is low-risk (items never reorder/delete mid-session) but is a minor React anti-pattern.
- **CalendarScreen**: `FlatList` with `useMemo` filtering. No virtualization concern — 94 events is well within FlatList's comfort zone.
- **TrackWalkScreen**: Speech recognition lifecycle (`start`/`stop`/`addListener`) uses dynamic require on every call. Consider caching the module ref after first require — not a bug but three repeated dynamic imports per voice session is redundant.
- No large synchronous JSON imports on startup observed. Avatar PNGs are bundled assets (expected).

---

## Design quality

All screens match `SCREEN_BRIEF_FOR_VISUALS.md` intent (dark slate, amber accent, rounded cards). No material brief mismatches. The four new screens (BikeSetupBasics, BikeSetupSheet, CoachChat, RoadRacerAiFaqs) follow established visual conventions.

Screen brief still describes a 6-step onboarding flow; `OnboardingScreen.tsx` implements more steps including avatar/face-photo and racing-info sub-flows. Brief is intentionally simplified — not a bug.

---

## Security & connections

| Check | Finding |
|-------|---------|
| Secrets in source | None. `EXPO_PUBLIC_API_URL` in `.env` is gitignored. No API keys, tokens, or DSNs in app source. `sentryDsn` in `app.json` reads `${EXPO_PUBLIC_SENTRY_DSN}` — env substitution, not hardcoded. |
| Unexpected outbound hosts | None. All API calls target `send-it-ke7r.onrender.com` (production) or `10.0.2.2:3001` (Android emulator). No third-party analytics, tracking, or ad SDKs. |
| Firebase analytics | `expo-firebase-analytics` is in `package.json` and used in `QAScreen.tsx` via `src/utils/analytics.ts`. No `google-services.json` / `GoogleService-Info.plist` present — analytics silently no-ops (guarded by try/catch). Package adds ~500 KB to the bundle but makes no outbound connections without config files. See P2 below. |
| TLS | All production fetch calls use HTTPS. Cleartext only on Android emulator dev path (`10.0.2.2`) which is not shipped. |
| Input handling | Coach chat sends user text to `/roadrace-ai/chat`; API rate-limited (30 req/15 min, added in prior fix). No client-side SQL/eval/eval-like patterns observed. Track notes pasted into ImportTrackNotesScreen are sent verbatim as strings — server validates on its side. |
| Storage | AsyncStorage stores onboarding answers, avatar ID, bike/face photo local URIs. No tokens, passwords, or PII beyond user-entered nickname/bike/rider. Face photos stored at app-local filesystem URI (not shared directory). ✓ |
| Deeplinks | `scheme: "roadrace"` registered. No `Linking.addEventListener` or `getInitialURL` handling in App.tsx — deeplinks currently not processed (no exploit surface). |
| Permissions | Foreground-only location, no background location. No contacts, no microphone on camera (disabled in plugin config). Least-privilege met. |

---

## Growth / modern practice (P2)

**[P2-1] `expo-firebase-analytics` orphaned dependency**
No Firebase config files present so the SDK never makes outbound connections. However the package is ~500 KB, adds to bundle size, and increases attack surface on future accidental config. Recommended fix (Cursor): remove `expo-firebase-analytics` from `package.json` and replace `src/utils/analytics.ts` with a lightweight in-app stub (`console.log` in dev, no-op in prod) until a real analytics provider is chosen.

**[P2-2] `key={i}` in CoachChatScreen message list (line 236)**
Array index as React key on a chat message list. Safe today (append-only), but will cause stale rendering bugs if messages are ever removed (e.g. "undo last message" feature). Recommended fix (Cursor): assign a stable `id` field on each message push (e.g. `Date.now().toString()` or nanoid) and use that as key.

**[P2-3] Dynamic `require` called multiple times in TrackWalkScreen speech module**
`require('expo-speech-recognition')` is called in three separate callbacks (requestPermissions, start, stop, addListener). Module resolution is cached by Metro after first load so no real perf hit, but the pattern is fragile. Recommended fix (Cursor): move the require to module scope with a try/catch guard, or import at the top of the file (it's already in `package.json`).

**[P2-4] New Architecture readiness**
SDK 54 defaults to old architecture; SDK 55 will default to New Architecture. `sentry-expo` ~7 and `expo-firebase-analytics` ^8 may not be New Arch compatible. Recommended action (Cursor, before SDK 55 upgrade): audit plugin compatibility and switch `sentry-expo` → `@sentry/react-native` (direct) which has full New Arch support.

---

## Recommended fixes for Cursor

None at P0/P1. P2 backlog (no urgency):

1. [P2-1] Remove `expo-firebase-analytics`, replace analytics.ts with stub.
2. [P2-2] Stable keys on CoachChatScreen message list.
3. [P2-3] Module-scope require for expo-speech-recognition in TrackWalkScreen.
4. [P2-4] Track New Architecture compatibility before next SDK bump.

---

## Resolved since last MOBILE_OPS / RR_REVIEW

Since RR_REVIEW_2026-07-14 (rev 2):

- Avatar face-hole geometry corrected (this session): `DEFAULT_FACE_HOLE_LAYOUT` now pixel-accurate to artwork; `FACE_IN_HOLE_SCALE` 0.66→1.0; SVG transform pivot fixed to hole center; `preserveAspectRatio` corrected to `xMidYMid slice`.
- Screen count 9→13: BikeSetupBasics, BikeSetupSheet, CoachChat, RoadRacerAiFaqs added — all TypeScript-clean.
- Calendar: dedupe MA/SCB events + default feeds to AU (commit `edb73fa`).
- MoMS rule book RAG added (`7dae26e`) — QA corpus healthy.

---

## Manual verify on device

- [ ] Open avatar capture on a leathers preset — confirm amber guide oval aligns with the face hole in the artwork (geometry fix applied today).
- [ ] Send a coach chat message — confirm reply appears within 90 s; error bubble shown if offline.
- [ ] Enable track-arrival geofence in Settings — confirm location permission prompt appears, deny path shows Settings link.
- [ ] Start voice transcription in Track Walk — confirm microphone permission requested once, transcript appears in note field.
- [ ] Pull-to-refresh on Headlines — confirm fresh load within 90 s.
- [ ] Calendar tab with Australian filter selected by default.

---

## Out of scope

- Pixel / visual regression QA
- Maestro / Detox E2E automation (not configured)
- App Store / Play Store submission readiness (not evaluated this cycle)
