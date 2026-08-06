# Mobile App Ops — 2026-07-29

## Status

MOBILE OPS: CURSOR ALERT — action required.

---

## Executive summary

- **P0: 0 | P1: 1 | P2: 5**

The app is in good overall operating condition on both iOS and Android. Production API is fully live (148 headlines, 104 calendar events, all AI endpoints healthy). TypeScript compiles clean. The 14-screen inventory is stable. Security posture remains solid — no unexpected connections, no hardcoded secrets, all `Linking.openURL` calls routed through `safeOpenUrl()`, proper request auth and input limits in place. Avatar face-photo capture received significant fixes this cycle (7 commits addressing hole alignment, crop math, and Android mirror bake). One **P1 is raised:** the `health-check.mjs` gate is now permanently failing on three false-positive checks (`BUILTIN_SOURCES missing mcnews`, `BUILTIN_SOURCES missing amcn_club`, `AU_SOURCE_IDS missing expected keys`) — the check script was never updated when those sources were dropped from `BUILTIN_SOURCES` and `AU_SOURCE_IDS`. This causes every CI/CD and gate run to report `FAIL` when the actual scraper configuration is intentional and healthy. This must be fixed so real failures are not masked. Five P2 items carry forward or are newly identified.

---

## Automated gates

### Preflight (`node scripts/mobile-review-preflight.mjs`) — 2026-07-29

```
OK   14 screens listed                          ← +1 vs prior cycle (BikeBalanceSetupScreen)
OK   TypeScript (app)
OK   server.js / qa.js syntax
OK   tracks.json — 19 catalog tracks, 19 geofences
OK   the_bend_international ~4.95 km, the_bend_gt ~7.77 km
OK   shared geofence centres verified (Bend, SMP)
OK   turn-hand policy: 72 verified left|right, 0 unverified
WARN planned layout not in catalog yet: the_bend_east (unchanged)
WARN planned layout not in catalog yet: the_bend_west (unchanged)
WARN planned layout not in catalog yet: smp_amaroo (unchanged)
WARN planned layout not in catalog yet: collingrove_hillclimb (unchanged)
OK   AU cache: 97 headlines (updated 2026-07-26)
OK   AU calendar cache: 62 events
OK   calendar aggregation: 97 events, 73 AU full-detail
SKIP live API not running locally (non-fatal)
FAIL health-check.mjs — 3 false-positive FAILs (see P1 below)

Preflight finished with 1 failure(s).
```

### Production health-check (`API_URL=https://send-it-ke7r.onrender.com`) — 2026-07-29

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
OK   AU cache: 97 headlines
OK   AU calendar cache: 62 events, aggregator/governing-body source present
OK   calendar aggregation: 97 events, 73 AU full-detail
FAIL BUILTIN_SOURCES missing mcnews   ← FALSE POSITIVE (see P1)
FAIL BUILTIN_SOURCES missing amcn_club ← FALSE POSITIVE (see P1)
FAIL AU_SOURCE_IDS missing expected keys ← FALSE POSITIVE (see P1)
Health check FAILED (3 issues)
```

### verify-production.mjs — 2026-07-29

```
OK   /health ok=true
OK   roadraceAi enabled
OK   /headlines: 148 items        ← up from 138 (2026-07-22)
OK   /calendar: 104 events        ← up from 97 (2026-07-22)
OK   /qa/trivia returns a question
OK   /roadrace-ai/faqs: 20 coach FAQs
Production verify passed ✓
```

### ios-smoke-test.mjs — 2026-07-29

```
OK   [Headlines] 148 headlines, 51 AU items, 20 built-in sources
OK   [Events] 104 events, 22 MotoGP 2026 rounds (live API)
OK   [Q&A] trivia question ready, Ask mode available
OK   [Track Walk] local notes — no API required for save
OK   [Coach] FAQs coach=20 bikesetup=20, chat endpoint configured
OK   [App] TypeScript compiles
11 passed, 0 failed
iOS smoke test (API layer) passed ✓
```

---

## Platform fitness (iOS / Android)

**API / networking**

- `app/constants/api.ts` — unchanged and correct. `EXPO_PUBLIC_API_URL` override, Android emulator heuristic, and Render production fallback all intact.
- All fetch calls carry `AbortSignal.timeout()`: Headlines (45 s / 90 s refresh), custom sources (20 s), Calendar (15 s), Q&A trivia (8 s), Coach chat (90 s). Full timeout coverage.
- Production TLS only — all Render endpoints HTTPS. ✓
- `apiFetch()` injects `x-app-secret` header on all `/roadrace-ai/*` routes. ✓

**Permissions**

- Camera: foreground, `recordAudioAndroid: false`. Denied path shows Alert + Settings link. ✓
- Photos: scoped to avatar/bike/track flows. ✓
- Location: foreground-only, denied → `Linking.openSettings()`. ✓
- Notifications: only on user opt-in. ✓

**Build / Expo**

- Expo SDK ~54, React Native 0.81.5, React 19. Stack current.
- `jsEngine: "hermes"` in `app.json`. ✓
- New Architecture: `newArchEnabled` still not set (old arch default for SDK 54). Unchanged — not a blocker.
- Screen count: **14** (added `BikeBalanceSetupScreen` since 2026-07-22). ✓

**Navigation**

- All cross-tab navigation and `navigation.replace` patterns unchanged and correct. ✓

---

## Per-screen findings

### OnboardingScreen — ✓ HEALTHY
No changes since 2026-07-22. All flows correct (8-step, skip logic, random avatar fallback, face photo clear on preset switch, privacy policy via `safeOpenUrl`).

### HeadlinesScreen — ✓ HEALTHY
Prefetch guard, avatar composite, bike photo flows unchanged and correct.

### HeadlinesListScreen — ✓ HEALTHY
Three view modes, composite key extractor, thumbnail fallback, error/loading/empty states all present.

### HeadlinesSettingsScreen — ✓ HEALTHY
`apiFetch` used for custom sources; `safeOpenUrl` for Privacy Policy and Terms of Use links. ✓

### CalendarScreen — ✓ HEALTHY
AU filter default, upcoming/ongoing guard, `safeOpenUrl` for event links, timeout handling all correct.

### QAScreen — ✓ HEALTHY
Ask / Rules / Trivia mode separation correct. Timer cleanup on unmount. Analytics stub (no-op). ✓

### RiderCoachScreen — ✓ HEALTHY
Hub + `navigation.replace` seeding pattern unchanged. `safeOpenUrl` for feature request mailto. ✓

### CoachChatScreen — ✓ HEALTHY
Stable `key={m.id}` UUIDs, 90 s timeout, error recovery restoring draft, generation counter against stale replies. ✓

### TrackWalkScreen — ✓ HEALTHY
Speech singleton, 19 catalog tracks, `sendToCoach` navigation. Entry list still uses `key={index}` (P2, append-only — no change since last review). ✓

### ImportTrackNotesScreen — ✓ HEALTHY
Dual navigation path, clipboard, sessionReady gate. ✓

### BikeSetupBasicsScreen — ✓ HEALTHY
Hotspot hit target 44pt, timer cleanup, CoachChat seeding. ✓

### BikeSetupSheetScreen — ✓ HEALTHY
`KeyboardAvoidingView` present wrapping the full screen. Debounced save 400 ms. Session history stable key. ✓

### RoadRacerAiFaqsScreen — ✓ HEALTHY
Searchable FAQs, CoachChat seeding via `seedDraftMessage`. ✓

### BikeBalanceSetupScreen — NEW screen (2026-07-22 → 2026-07-29)

First formal audit of this screen:

- ✓ 4-tab layout (inputs, results, compare, guide) — all `TabKey` types covered.
- ✓ Skill modes (rider / tuner / engineer) with distinct prompts via `SKILL_HELP`.
- ✓ Position presets (`key={p.id}`) — stable, never reordered.
- ✓ `BikeBalanceIntroGate` — intro acceptance persisted before full tool is shown.
- ✓ `BikeBalanceDataGuide`, `BikeBalanceDiagramPanel`, `BikeBalanceSourcesSheet` — sub-components correctly composed.
- ✓ `PrivateSetupBanner` shown to flag that saved setups are private/local.
- ✓ `buildCitableReport` + `shareBikeSetupAsText` — share is user-initiated only; no auto-exfil.
- ✓ Highlight field system (`highlightFieldKeys`) — blue highlight ring for guided data entry.
- ✓ Parsed inputs use `parseOptionalNumber` — gracefully handles empty/NaN; never crashes on bad text.
- ✓ Storage via `saveBikeBalanceState` / `loadBikeBalanceState` / `upsertBikeBalanceSavedSetup` — all use `STORAGE_KEYS` constants (no inline string literals).
- ⚠️ **[P2-5] `KeyboardAvoidingView` missing** — `BikeBalanceSetupScreen` wraps in a plain `ScrollView` (line 326). The inputs tab has many numeric `TextInput` fields (4 confirmed) alongside others in sub-components. On a physical device with on-screen keyboard, lower numeric fields (swingarm geometry, sprocket teeth) will be covered by the keyboard. `BikeSetupSheetScreen` already has `KeyboardAvoidingView` as the correct pattern. **Recommended fix (Cursor):** wrap the outer `<ScrollView>` in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>` following the same pattern as `BikeSetupSheetScreen.tsx` lines 233–238.

---

## Performance & reliability

- **BikeBalanceSetupScreen compute**: `computeBikeBalance` runs synchronously on every input change via `useMemo`. For the current set of ~15–20 equations this is fast; no JS-thread risk observed. ✓
- **FlatList virtualization**: Calendar (104 events), Headlines (~148 items) remain within comfortable FlatList range. ✓
- **Coach chat scroll**: `ScrollView` + `scrollToEnd` — acceptable at current session sizes. ✓
- **BikeBalance saved setups**: `upsertBikeBalanceSavedSetup` writes to AsyncStorage on "Save Setup" tap — user-initiated, not auto-fire. ✓
- **Avatar face-photo pipeline (7 commits this cycle)**: center-crop-only approach removes the old `skipProcessing`/CSS-scale path that caused hole misalignment. Architecture is now cleaner; no JS-thread blocking observed in code. ✓

---

## Design quality

All screens match `SCREEN_BRIEF_FOR_VISUALS.md` dark slate / amber accent design. BikeBalanceSetupScreen is a deep technical tool — appropriately gated behind `BikeBalanceIntroGate` with a clear disclaimer. No brief mismatches observed. P2-5 keyboard issue (above) is the only material UX concern.

---

## Security & connections

| Check | Finding |
|-------|---------|
| **API auth** | `x-app-secret` header injected by `apiFetch()` for all `/roadrace-ai/*` routes. Server validates when `APP_API_SECRET` env is set. ✓ |
| **Body limits** | `express.json` — 64 kb global; 8 mb only for `/roadrace-ai/chat` (base64 image uploads). ✓ |
| **Input length** | `MAX_AI_MESSAGE_CHARS = 4000` enforced server-side on both `/roadrace-ai/ask` and `/roadrace-ai/chat` before calling OpenAI. ✓ |
| **Secrets in source** | None. `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN` read from env (not committed). No API keys, tokens, DSNs hardcoded. `OPENAI_API_KEY` server-only. ✓ |
| **Sentry** | Now properly wired: `App.tsx` lazy-imports `sentry-expo` in `useEffect` and calls `Sentry.init()` only when `EXPO_PUBLIC_SENTRY_DSN` is set; cancelled guard prevents stale init. No DSN in committed files → zero outbound connections without env. **P2-1 from 2026-07-22 is resolved.** ✓ |
| **Outbound hosts** | All API calls target `send-it-ke7r.onrender.com` (prod) or Android emulator dev path. `analytics.ts` is a no-op stub. No third-party analytics, ad SDKs, or tracking. ✓ |
| **TLS** | All production HTTPS. Cleartext only on `http://10.0.2.2:3001` (Android emulator dev — not shipped). ✓ |
| **URL safety** | All `Linking.openURL()` calls go through `safeOpenUrl()` which blocks `javascript:` and `intent:` schemes. **No bare `Linking.openURL()` in any screen.** ✓ |
| **CORS** | Origin whitelist, methods restricted to `GET`/`POST`. ✓ |
| **Security headers** | `helmet()` applied before routes. ✓ |
| **MIME types** | Attachment MIME types whitelisted in `ALLOWED_IMAGE_TYPES` and `ALLOWED_FILE_TYPES`; caller-supplied MIME is validated or replaced with safe default. ✓ |
| **Storage** | AsyncStorage stores onboarding, avatar ID, photo URIs, trivia best score, bike setup, bike balance state. No tokens or passwords. Face photos at app-local URI. ✓ |
| **Deeplinks** | `scheme: "roadrace"` registered; no active `Linking.addEventListener` handler → no exploit surface. ✓ |
| **Permissions** | Foreground location, camera without audio, scoped photo library. Least-privilege met. ✓ |
| **Copyright/IP** | Privacy policy accessible from Onboarding and Settings via `safeOpenUrl`. ✓ |

**No security issues requiring Cursor action.** Security posture is sound.

---

## Recommended fixes for Cursor

### P1

**[P1-1] health-check.mjs gate produces 3 permanent false-positive FAILs**

- **Root cause:** `scripts/health-check.mjs` lines 87–109 require `'mcnews'` and `'amcn_club'` in `BUILTIN_SOURCES`, and expects `AU_SOURCE_IDS` to include `['ma_roadrace', 'mcnews', 'asbk', 'amcn_club', 'amcn_asbk']`. These sources were intentionally removed from `scrapers.js` in a past cleanup (`BUILTIN_SOURCES` now has 10 sources, none of which are `mcnews` or `amcn_club`; `AU_SOURCE_IDS` is now `['ma_roadrace', 'asbk', 'amcn_asbk']`).
- **Impact:** Every health-check, CI gate, and Hermes cron run reports `FAILED (3 issues)` even when the app and API are completely healthy. This masks real failures and creates alert fatigue.
- **Recommended fix (Cursor):**
  1. In `scripts/health-check.mjs`, update the `required` array (line ~87) to match current `BUILTIN_SOURCES` IDs: remove `'mcnews'` and `'amcn_club'`.
  2. Update `auKeys` (line ~104) to match current `AU_SOURCE_IDS`: `['ma_roadrace', 'asbk', 'amcn_asbk']`.
  3. Optionally add `mcnews` as a soft-warn (returns 0 intermittently) rather than a hard FAIL, since the scraper function exists but the source is not in `BUILTIN_SOURCES`.
  4. Re-run `node scripts/health-check.mjs` to confirm 0 FAILs on a clean run.

### P2

1. **[P2-1] `KeyboardAvoidingView` missing on `BikeBalanceSetupScreen`** — Inputs tab has multiple numeric `TextInput` fields. On-screen keyboard will cover lower fields on physical devices. **Recommended fix (Cursor):** wrap `<ScrollView>` in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`, following the existing pattern in `BikeSetupSheetScreen.tsx` lines 233–238. Add `Platform` import from `react-native`.

2. **[P2-2] `key={index}` in TrackWalkScreen entry list** — Append-only/deletable list using array index as key; deletion causes flicker. **Recommended fix (Cursor):** assign stable `id` (e.g. `Date.now().toString()`) on `addEntry` push and use as key. (Carried from 2026-07-22.)

3. **[P2-3] `key={i}` in OnboardingScreen progress dots** — Static array, harmless but easily fixed. **Recommended fix (Cursor):** use `` key={`step-dot-${i}`} ``. (Carried from 2026-07-22.)

4. **[P2-4] New Architecture readiness** — SDK 54 defaults to old arch; SDK 55 will flip the default. `sentry-expo` ~7 is not New Arch compatible. **Recommended action (Cursor, before SDK 55 upgrade):** audit all native plugins and plan migration of Sentry to `@sentry/react-native` direct. (Carried from prior reviews.)

5. **[P2-5] `mcnews` scraper function exists but source is not in `BUILTIN_SOURCES`** — The `mcnews` scraper at line 303 of `scrapers.js` is live code that fetches `https://www.mcnews.com.au/` but its output is never included in the feed (source not registered). Either: (a) re-add `{ id: 'mcnews', name: 'MCNews' }` to `BUILTIN_SOURCES` and `AU_SOURCE_IDS` if desired, or (b) remove the dead scraper function to keep code clean. Either resolves P1-1 for `mcnews` specifically once the health-check is updated.

---

## Growth / modern practice (P2)

- **Expo SDK 55 prep:** Track release notes — New Architecture will become default; plan `newArchEnabled: true` testing with all native plugins (camera, speech, calendar, clipboard).
- **BikeBalance compute**: currently synchronous `useMemo`. If equation set grows significantly, consider moving to a `useReducer` + `useDeferredValue` pattern to keep the inputs tab responsive on low-end devices.
- **CoachChat scroll → FlatList**: If chat history persistence across app restarts is added in a future feature, plan a `FlatList` with `inverted` layout migration.
- **`RaceSport` font**: loaded via `useFonts` in `App.tsx`; no font-flash risk. ✓ No action needed.

---

## Resolved since last MOBILE_OPS_2026-07-22

| Item | Status |
|------|--------|
| [P2-1] `sentry-expo` dormant (not initialised) | ✅ **Resolved** — Sentry now lazy-loaded and gated on `EXPO_PUBLIC_SENTRY_DSN`; makes zero connections without env |
| Avatar face-photo capture hole alignment (7 commits) | ✅ **Resolved** — Center-crop-only approach; `skipProcessing` removed; hole math fixed; WYSIWYG invariant documented in `FACE_PHOTO.md` |
| BikeBalanceSetupScreen first audit | ✅ **Completed** — screen healthy; one P2 keyboard avoidance gap flagged |
| Production API growth | ✅ Headlines 138 → 148; Calendar 97 → 104 events (healthy growth) |
| [P2-2] `key={index}` TrackWalkScreen | ↩ Carried — P2, low urgency |
| [P2-3] `key={i}` OnboardingScreen dots | ↩ Carried — P2, trivial |
| [P2-4] New Architecture readiness | ↩ Carried — pre-SDK 55 prep |

---

## Manual verify on device

- [ ] **Avatar face capture (CRITICAL after 7 fix commits):** Choose a face-hole leathers avatar → take photo filling the hole → confirm home hero hole shows the same full face (not cropped corner or offset head). Test on both iOS and Android.
- [ ] **Avatar library path:** Pick from photo library → Align modal → confirm face fills the hole on home hero.
- [ ] **BikeBalanceSetupScreen keyboard:** Open Inputs tab on a physical device → focus a lower numeric field (e.g. swingarm geometry) → confirm on-screen keyboard does not permanently cover the field. (This will likely fail until P2-1 is fixed.)
- [ ] **Coach chat:** Send a test message → confirm reply within 90 s; error bubble shown if offline.
- [ ] **Track Walk voice:** Start voice transcription → confirm permission requested once; transcript appended; stop/start works.
- [ ] **Calendar "Aus" filter:** Default filter active; tap a MotoGP event → opens link via `safeOpenUrl`.
- [ ] **Import Track Notes → Send to Coach:** Paste clipboard text → send → conversation appears in Coach tab.
- [ ] **Custom source validation in HeadlinesSettings:** Add a custom RSS URL → confirm it appears in Custom tab.

---

## Out of scope

- Pixel / visual regression QA
- Maestro / Detox E2E automation (not configured)
- App Store / Play Store submission readiness (not evaluated this cycle)
