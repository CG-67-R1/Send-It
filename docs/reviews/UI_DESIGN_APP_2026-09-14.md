# UI Design Review — RoadRacer (Send-It) app — 2026-09-14

Scope: `app/` (Expo web + iOS tree; findings apply equally to `android-app/` mirror
unless noted). Reviewed against `SCREEN_BRIEF_FOR_VISUALS.md` and the ui-designer
doctrine. **Report only — Cursor implements.**

## Executive summary

**Verdict: strong bones, weak accessibility layer.** The dark slate + amber system
is consistent, states (loading/error/empty) are genuinely designed on the network
screens, and touch targets mostly clear 44pt. The two systemic gaps are
(1) near-zero accessibility annotation — 1 `accessibilityLabel` across 20 screens —
and (2) no font-scaling strategy, so Dynamic Type / Android font scaling will break
dense screens unpredictably. Both are P1-class, cheap to fix, and App Store /
Play reviewers increasingly probe them.

Counts: **P0: 0 · P1: 4 · P2: 6**

## Trend / competitor notes

- **iOS 26 Liquid Glass — WATCH.** Apple's guidance: reserve it for the floating
  navigation layer and let standard toolbar/tab APIs pick it up automatically.
  We use React Navigation with custom dark styling, so we get nothing for free
  and a hand-rolled glass effect would be hype. Revisit when React Navigation /
  Expo ship native-styled tab bars for iOS 26. Note third-party reports of a
  Sept-2026 "full support" expectation — track Expo SDK release notes, don't
  panic-adopt. (Source: developer.apple.com "Adopting Liquid Glass".)
- **Android 16 edge-to-edge opt-out removal — ADOPT (verify).** Apps targeting
  API 36 lose the edge-to-edge opt-out. The app already uses SafeAreaProvider and
  insets on Home; verify every screen in `android-app/` survives edge-to-edge
  before the target-SDK bump. This is a platform deadline, not a trend.
  (Source: developer.android.com/about/versions/16/behavior-changes-16.)
- **Material 3 Expressive — SKIP for now.** Dynamic colour and expressive motion
  would fork the shared Send-It ↔ KartRacer design system for one platform.
  Brand amber-on-slate is deliberate; consistency outranks it (doctrine rule).
- **F1 TV / MotoGP app pattern — ADOPT (small).** Both lead their schedule views
  with a visually distinct "next event" hero card, then the flat list. Our Events
  list treats the next race identically to one four months out. Cheap, high-glance
  value at the paddock. Concrete fix in Events findings below.
- **Strava / Whoop data-dense pattern — WATCH.** Their dashboards lead with one
  glanceable summary card then progressive disclosure. Home's "Last session"
  card already follows this; extend the same pattern to Bike Setup Sheet history
  later rather than inventing a new component.

## Per-screen findings

### Home (`app/src/screens/HeadlinesScreen.tsx`)

1. **P1 — Hero is one giant photo-picker button.** The entire top 60% of the
   screen (`heroTouchable`, line ~158) opens the image picker on any tap. The
   avatar/name cluster inside it navigates to Settings, but a stray tap anywhere
   on the bike photo launches the photo library — surprising, and long-press to
   remove is undiscoverable. Why: one primary action per surface (doctrine 2);
   accidental modal launches erode trust. Fix: keep the photo tappable only via
   a small amber "edit photo" chip (bottom-left of hero, 44pt), make the rest of
   the hero inert; keep long-press as a bonus, not the only remove path. **M**
2. **P1 — `Dimensions.get('window')` at render (line ~140).** Hero/button heights
   are computed from a static call, so rotation and split-screen (iPad, Android
   freeform) leave stale sizes. Fix: `useWindowDimensions()`. One-line class fix;
   check other screens for the same pattern. **S**
3. **P2 — Empty-mode dead card.** When `homeMode` is neither setup nor learn, an
   empty `activityCard` View renders (line ~310) — a blank slab in the layout.
   Fix: render nothing, or a "Pick how you ride in Profile" nudge card. **S**

### Events / Calendar (`CalendarScreen.tsx`)

4. **P1 — Series colour is the only signal for series grouping.** Left-border
   colour + coloured label distinguish MotoGP/WorldSBK/local, and 8 of 11 series
   map to the same amber (`SERIES_COLORS`, line 36). Colour-blind riders and
   sunlight glare lose the distinction; doctrine 5 (colour never the only
   signal). The `seriesLabel` text mostly saves it, but at `fontSize: 12`
   uppercase it's below comfortable legibility. Fix: bump `series` to 13 and
   pair local events with a small flag/pin glyph; keep colours as reinforcement.
   **S**
5. **P2 — No "next event" emphasis.** F1 TV / MotoGP app pattern (ADOPT above):
   first upcoming event gets a slightly larger card with a "NEXT" amber tag and
   days-to-go. Everything needed is already computed (`isUpcomingOrOngoing`).
   **M**
6. **P2 — "Tap to open link →" hint on every linked card.** Repeated hint text is
   noise after the first card; NNG: instruction text ≠ affordance. Fix: chevron
   glyph on the right edge of the card instead of a text row. **S**

### Q&A (`QAScreen.tsx`)

7. **P2 — 12–13pt body text in results/sources.** Ten styles at fontSize 12–13
   (lines ~922–1078) for source links, trivia meta, and helper copy. Doctrine 3
   says body ≥ 15–16; 12pt amber-on-slate at a sunny paddock is unreadable.
   Fix: raise interactive/source text to ≥14, keep true captions at 13 minimum.
   **S**

### Coach Chat (`CoachChatScreen.tsx`)

8. **P2 — Send/attach buttons lack disabled affordance parity and the chat lacks
   a typing indicator.** `sendBtnDisabled` exists, but while `loading` the only
   feedback is the spinner inside the Send button; the message list itself shows
   nothing pending. Long LLM timeouts are expected here (brief says so), so an
   assistant-side "…" bubble (200–350ms fade-in) keeps the wait legible.
   Whoop/ChatGPT-style shipped pattern. **M**

### Hubs (RiderCoach / BikeSetupHub)

9. **P2 — All five hub buttons are visually identical.** Equal weight = no
   hierarchy (doctrine 3). RR AI Coach is the flagship; give it the filled-amber
   treatment (matching onboarding's primary CTA) and leave the rest outlined.
   Mirror in BikeSetupHub (Bike Setup AI primary). Keeps parity across both
   hubs and with KartRacer. **S**

### Cross-cutting

10. **P1 — Accessibility annotation is effectively absent.** Exactly one
    `accessibilityLabel` in `app/src` screens ("Edit profile and avatar") plus
    one in CoachChat's attach button; no `accessibilityRole` anywhere. Every
    TouchableOpacity reads to VoiceOver/TalkBack as unlabeled text. WCAG +
    HIG/Material baseline (doctrine 5), and low-effort: add
    `accessibilityRole="button"` + labels to nav buttons, filter chips, trivia
    options, and the icon-only attach (+) / remove (×) controls. **M**
11. **P1 — No font-scaling strategy.** Zero `allowFontScaling` /
    `maxFontSizeMultiplier` usage and fixed-height containers (e.g. hub buttons
    `minHeight: 56`, chat input row) means large accessibility text sizes will
    clip or overflow. Fix: audit at iOS AX2 text size; add
    `maxFontSizeMultiplier={1.4}` on dense rows rather than disabling scaling.
    **M**

## Top 5 fixes for Cursor (impact ÷ effort)

1. **A11y pass on interactive elements** — add `accessibilityRole="button"` and
   labels across screens' TouchableOpacity elements; prioritise icon-only
   controls (attach +, remove ×, filter chips, trivia options). (P1, M)
   Files: all `app/src/screens/*.tsx` + `components/ChipRow.tsx`, mirror to
   `android-app/`.
2. **Home hero tap scope** — restrict photo-picker to an explicit "edit photo"
   chip; hero otherwise inert. (P1, M) `HeadlinesScreen.tsx`.
3. **`useWindowDimensions()` instead of `Dimensions.get('window')`** at render
   in `HeadlinesScreen.tsx` (and grep for siblings). (P1, S)
4. **Events legibility + NEXT card** — series label to 13pt + non-colour glyph
   for local events; first upcoming event gets a "NEXT" emphasis card. (P1/P2, M)
   `CalendarScreen.tsx`.
5. **Font-scaling audit** — `maxFontSizeMultiplier` on dense rows, verify hub
   buttons/chat composer at max Dynamic Type. (P1, M) Start: hubs, CoachChat,
   QAScreen.

Verification for any of the above: `cd app && npx tsc --noEmit`, same in
`android-app/`, then on-device check (Hermes cannot run simulators — manual:
iOS Simulator at AX2 text size, Android emulator at font scale 1.3+, VoiceOver/
TalkBack walk of Home → Events → Q&A).

## Out of scope

- Track Details map rendering (owned by track-data-analyst gates; UI safeguards
  in AGENTS.md respected — nothing on the picture).
- Onboarding flow copy/steps (recently shipped design; no P0/P1 observed in
  code read; revisit after real-user feedback).
- Headlines/News archived screens (secondary surface per brief).
- Any Material 3 Expressive / Liquid Glass restyle (SKIP/WATCH above).
