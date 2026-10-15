# UI Design Review — RoadRacer (Send-It) — Track Details — 2026-10-01

Scope: **Track Details** flow in `app/` (the most-changed UI since 2026-09-14: rider marks
shipped in 1.0.2 on 09-21, UK maps on 09-22) plus tab bar (`App.tsx`). Files read:
`TrackMemoryHubScreen.tsx`, `TrackFacilityMap.tsx`, `TrackCornerSheet.tsx`,
`VoiceNoteField.tsx`, `ChipRow.tsx`, `trackMapTheme.ts`, `App.tsx` tab config.
`android-app/` mirrors these files (git shows matching edits); findings apply to both trees.
**Report only — Cursor implements.** Map rendering/GPX invariants (AGENTS.md) are untouched:
nothing below puts text or notes on the map picture, and nothing sets turn hands from GPX.

## Executive summary

**Verdict: the Track Details flow is well-structured (map → facts → turns list → corner sheet,
hands written as text "(left)", rider marks labelled "· yours" not just amber), but the new
rider-edit layer was built with small targets, no a11y state, and a sheet that will fight the
keyboard.**

Counts: **P0: 0 · P1: 4 · P2: 5**

### Carry-over from UI_DESIGN_APP_2026-09-14.md

| # | Item | Status |
|---|------|--------|
| 2 | `Dimensions.get` in Home | **RESOLVED** — `HeadlinesScreen.tsx:140` uses `useWindowDimensions()` |
| 1 | Home hero tap scope | **PARTIAL** — `photoChipText` chip now exists (line ~237); not re-verified that hero body is inert |
| 11 | Font scaling | **PARTIAL** — `maxFontSizeMultiplier={1.4}` added on Home hero only (4 uses); zero in Track Details, hubs, Q&A, Coach |
| 10 | A11y labels | **PARTIAL** — now 11 files carry labels (Home 12, Track Details map/zoom/voice). Still **no** `accessibilityRole` on `ChipRow`, Calendar or Q&A |
| 4–9 | Events NEXT card / glyph, Q&A 12–13pt, Coach typing bubble, hub hierarchy | **OPEN** — no `NEXT` treatment found in `CalendarScreen.tsx`; not re-reviewed this run |

## Trend / competitor notes

- **Strava map + stats together, full-screen activity map with segment/effort overlays — WATCH.**
  Strava's redesigned Record (Jul 2025) and Activity Details put the map first with best
  efforts mapped along the route (press.strava.com). Our Track Details already leads with the
  map; the transferable idea is *progressive disclosure under the map* (one summary line, tap
  for the rest) — see finding 7. No new component needed.
- **Material 3 Expressive bottom sheets / new spacing system (I/O 2026) — WATCH.** M3 notes a
  new spacing system and updated bottom-sheet guidance (m3.material.io "What's new at I/O 26").
  Our corner sheet is a hand-rolled `Modal`; revisit when deciding whether to move to a
  gesture-dismissable sheet (finding 3). Do not restyle to Expressive — breaks Send-It ↔
  KartRacer parity.
- **"Material 3 Expressive + Liquid Glass on iPhone" (Google Health, 9to5google, 26 Sep) —
  SKIP / hype flag.** One vendor's cross-platform styling choice; secondary-source article;
  no evidence our riders want it. Same stance as 09-14 report on Liquid Glass: wait for
  Expo/React Navigation native tab support.
- **MotoGP / F1 TV next-event hero — still ADOPT** (carried from 09-14, Events screen, not yet
  built).
- Duolingo, Whoop, Apple Fitness, Mobbin, NNG: not checked this run (rotation).

## Per-screen findings

### Track Details hub (`TrackMemoryHubScreen.tsx`)

1. **P1 — Placement instruction lives below the map, away from the toolbar and thumb.**
   When "Place corner" / "Mark S/F" is active, the only cue is `PLACE_HINT` rendered at
   `fontSize: 11` under a square map (`TrackFacilityMap.hint`, `#94a3b8`). The active tool is
   shown only by an amber border on a 12pt button. Why: state clarity (doctrine 2); NNG "visibility
   of system status"; 11pt is below doctrine 3 minimum. At the paddock in sunlight a rider
   cannot tell they're in placing mode. Fix: when `placing`, show a pill banner pinned to the
   top of the map *container* (not drawn in the SVG): "Tap the road to place corner 7 — Done",
   `fontSize: 14`, amber background `#f59e0b`, dark text `#0f172a`, `Done` as a 44pt target;
   keep the 11pt hint for idle mode but raise to 12. **S**
2. **P2 — Lead + three-sentence hint = wall of text before the map.** Lead paragraph (14pt,
   4 lines) + `infoTracks.length` hint + `MAP_HINT + GUIDE_HINT + NOTES_HINT` under the map.
   First-time user needs "pick a circuit, tap a number". Fix: shorten lead to one sentence;
   move the "AU confirmed vs. place your own" explanation to the `trackDetailsTrust` banner
   shown only for non-AU maps. **S**
3. **P2 — Turns list has no "yours" separation or count at scale.** UK circuits now have rider-
   only numbering; list mixes baked and rider turns in one run. Fine at 10 turns, long at 20+.
   Fix: sticky "Your marks (n)" subheading above rider rows (text, not colour). **S**

### Map tools (`TrackFacilityMap.tsx`)

4. **P1 — Toolbar and zoom targets under 44pt.** `toolBtn` is `paddingVertical: 8` with a 12pt
   label ≈ 34pt tall; `zoomBtn` `minHeight: 36`; 4–5 buttons wrap onto two rows on a 375pt
   phone. Why: HIG 44pt / Material 48dp (doctrine 3); gloves. Fix: `minHeight: 44`,
   `paddingHorizontal: 14`, label 13; zoom buttons 44×44; consider a horizontal single-row
   segmented toolbar with `Done` replacing the active tool instead of appearing as a fifth
   button. **S**
5. **P1 — Tool buttons have `accessibilityRole` + `selected` state but no `accessibilityLabel`
   for the abbreviation "Mark S/F".** VoiceOver reads "Mark S slash F". Fix:
   `accessibilityLabel="Mark start and finish line"`. Zoom label text `1.5×` is also unlabelled
   as a value — add `accessibilityValue`/live-region or hide from AT. **S**

### Corner sheet (`TrackCornerSheet.tsx`, `VoiceNoteField.tsx`, `ChipRow.tsx`)

6. **P1 — Note field sits at the bottom of a 90%-height `Modal` with no keyboard avoidance.**
   The file imports no `KeyboardAvoidingView`; `paddingBottom: 28` is fixed (no safe-area
   inset); the personal-note input is the last element in the scroll body, with four stacked
   full-width buttons (Ask coach / Track Walk / Remove / Close) pinned beneath it. On iOS the
   keyboard will cover the field; on a small phone the pinned buttons plus the 280pt map leave
   little scroll area. Why: platform fit (HIG keyboard guidance), doctrine 2 "one primary
   action". Fix: wrap sheet content in `KeyboardAvoidingView` (iOS `padding`, Android relies on
   `adjustResize`); use `useSafeAreaInsets().bottom` for bottom padding; cap map `zoomWrap` at
   ~40% of window height; collapse "Remove this mark" into a text link and merge "Close" into a
   top-right 44pt `✕` in the header (Close at the bottom is a fourth equal-weight bar).
   Keep "Ask coach" as the single filled primary. **M**
7. **P1 — `ChipRow` conveys selection by colour only and has no role.** Active chip = amber
   border/text (`#f59e0b`/`#fbbf24`) vs grey; no `accessibilityRole`, no
   `accessibilityState={{selected}}`; chips are `paddingVertical: 8` at 13pt (≈ 36pt tall). Four
   chip groups in the sheet (surface, type, camber, entry) are the main rider-input surface.
   Why: doctrine 5 (colour never the only signal), WCAG 1.4.1; shared component, so the fix
   lands in every screen using it. Fix: add `accessibilityRole="radio"` +
   `accessibilityState={{ selected: active }}`; add a leading `✓ ` glyph or filled background on
   active; `minHeight: 44`. **S**
8. **P2 — Voice note: emoji as icon, text swap to "Stop", input locks while recording.**
   `micButtonText` shows `🎤` or the word "Stop" (different widths, button jumps);
   `editable={!recording}` blocks correcting text. Emoji render differently per OS and mic has
   no recording pulse. Fix: Ionicons `mic` / `stop-circle` (already a dependency, used in
   `App.tsx`), fixed 48×48 button, red fill + 1 s opacity pulse while recording; keep input
   editable. Label already good. **S**
9. **P2 — Inactive tab and placeholder grey is below AA.** `tabBarInactiveTintColor: '#64748b'`
   on `#0f172a` is ≈ 3.7:1 (my calculation from sRGB luminance), under the 4.5:1 doctrine bar
   for 11pt labels; same value used for `placeholderTextColor`. Fix: inactive `#94a3b8`
   (≈ 7:1) — still clearly dimmer than active amber; bump tab label to 12. **S**

### Cross-cutting

- Font scaling: none of the Track Details files set `maxFontSizeMultiplier`; the 36pt badge
  circle, toolbar buttons, and `minHeight: 56` rows will clip at AX2. Apply 1.3–1.4 on toolbar,
  chips and badges (map badge numbers are drawn in SVG map units — leave alone).

## Walk-throughs

- **First-time:** can find the map in 5 s (picker → map). Loses time on the long lead text and
  doesn't learn "Place corner" is the way to add numbers on UK tracks until they read the 11pt
  hint. (findings 1, 2)
- **Returning racer, gloves, 30 s between heats:** tapping Place corner (34pt), then the
  road (OK, snaps via `snapToRibbon`), then chips (36pt) is error-prone; keyboard overlap on
  the note is the worst friction. (4, 6, 7)
- **Junior/parent:** Send-It audience is adult; no junior-specific concern here.

## Top 5 fixes for Cursor (impact ÷ effort)

1. **Corner sheet keyboard + safe area + button hierarchy** — finding 6 (P1, M).
   `TrackCornerSheet.tsx`; mirror to `android-app/`.
2. **`ChipRow` role/state/44pt** — finding 7 (P1, S). Shared component, one edit, widest effect.
3. **Map toolbar and zoom 44pt + S/F a11y label** — findings 4 + 5 (P1, S). `TrackFacilityMap.tsx`.
4. **Placing-mode banner above map** — finding 1 (P1, S). `TrackFacilityMap.tsx`; container
   overlay only, never inside the SVG/ribbon.
5. **Tab inactive contrast + font-scaling caps in Track Details** — finding 9 + cross-cutting
   (P2, S). `App.tsx`, toolbar/chip styles.

Verification for any of the above: `cd app && npx tsc --noEmit`, same in `android-app/`,
`node scripts/prove-track-maps.mjs` (confirm no map change), then on-device (Hermes cannot run
simulators): iOS simulator with keyboard open on the note field at AX2 text size; Android
emulator font scale 1.3 + edge-to-edge; VoiceOver/TalkBack through Place corner → chip → note.

## Out of scope

- Map ribbon/racing-line rendering and turn data (track-data-analyst gates; hands P0 untouched).
- Events NEXT card, Q&A text sizes, Coach typing bubble, hub hierarchy (open from 09-14; not
  re-reviewed).
- Any Liquid Glass / Material 3 Expressive restyle (WATCH/SKIP).
- Per-keystroke persistence of the note (`onChange` → `persistMarks`) — a code/perf concern for
  mobile-review, not a UI finding.
- KartRacer (not reviewed in this run).
