# RoadRace App — Screen-by-Screen Brief for Visuals & Themes

Use this brief to generate mockups, illustrations, or theme variations in GPT (or similar). RoadRace is a **mobile app for motorcycle road-racing fans**: headlines, calendar, Q&A/trivia, and rider coach.

---

## Global Theme (Current)

- **Vibe:** Dark, motorsport-focused. Feels like a pit garage or race control: serious but energetic.
- **Palette:** Dark slate background (`#0f172a`), card/surface (`#1e293b`), **accent amber** (`#f59e0b`), white/off-white text (`#f8fafc`), muted gray secondary text (`#94a3b8`, `#64748b`). Error red: `#f87171`.
- **Typography:** Bold section titles, clear body. No decorative fonts—readable and confident.
- **Components:** Rounded cards (12px), left-edge accent bars (4px) in amber. Buttons: amber primary, dark secondary with amber border. Tab bar at bottom; headers dark with amber “action” text (e.g. Settings, Import notes).

---

## 1. Onboarding (First-time flow)

**Purpose:** Quick personalisation—favourite bike, favourite rider, a cool reaction to those picks, how they ride, then avatar/name.

**Flow (8 steps):**
- **Step 0:** Welcome. “Welcome to RoadRacer” + short intro. Single CTA: “Let’s go 👇”.
- **Step 1:** Favourite bike. One text field, placeholder e.g. “Ducati Panigale V4, Yamaha R1…”.
- **Step 2:** Favourite rider. One text field, placeholder e.g. “Valentino Rossi, Marc Márquez…”.
- **Step 3:** Taste bridge. Rider + bike blurbs from curated catalogs (`app/src/data/onboardingRiders.json`, `onboardingBikes.json`) + “Let’s personalise RoadRacer for you.”
- **Step 4:** How do you ride? Tap options including race / track days / just love bikes / race one day.
- **Step 5:** Future-racer info (only if “race one day”); otherwise skipped.
- **Step 6:** Nickname + avatar (+ optional face photo).
- **Step 7:** Summary. Avatar + nickname + closing “Time to send it.”

**Facts:** Curated offline JSON (aliases + characteristics + blurb). Unknown picks get a friendly fallback. Hermes may flag gaps; does not auto-edit catalogs.

**UI:** Progress dots at top (inactive gray, active elongated amber). Per step: big title, subtitle, then inputs or options. Bottom row: Back (muted) + Next / “Let’s go” (amber, full emphasis). Dark background, cards for inputs and option buttons; selected state = amber border.

**Visual/theming ideas:** Hero illustration for “Welcome” or taste bridge; subtle bike/silhouette motifs; progress could be a speedometer or track segment.

---

## 2. Headlines (Main feed)

**Purpose:** Latest motorsport news from configurable sources. Tap to open article; order set in Settings.

**Layout:**
- **Header:** “RoadRace” title; top-right “Settings” (amber text).
- **List header:** “Latest headlines” (large title) + “Tap to open • Pull down to refresh • Order in Settings” (small gray).
- **Cards:** Scrollable list. Each card: source name (small, amber, uppercase) above headline (2–3 lines). Card has dark background, rounded corners, **4px amber left border**. Tap opens external link.
- **States:** Loading spinner + “Loading headlines…”; error message + “Start the API server…” + Retry button; pull-to-refresh.

**Visual/theming ideas:** News ticker feel; optional hero image or “Breaking” strip; series logos (MotoGP, WorldSBK) as subtle watermarks or in header.

---

## 3. Headlines Settings

**Purpose:** Notifications for Priority 1 source; reorder sources; add/remove custom RSS feeds.

**Layout:**
- **Section: Notifications.** Title + short description. One row: “Notify for Priority 1 news” + toggle (amber when on).
- **Section: Source priority.** “1 = first on the Headlines page. Tap to change.” List: position number (1, 2, 3…) in amber, then a button showing current source name + chevron. Tapping opens a **modal** to pick another source for that slot.
- **Section: Custom sources.** Description, then: Feed URL input, Display name input, “Add source” button (amber). Below: “Your custom sources” list—name, URL (truncated), “Remove” (red/destructive).
- **Modal:** Overlay; centered card with “Select source for position N”, scrollable list of source names, “Cancel” at bottom.

**Visual/theming ideas:** Drag-handle or reorder icons; clear “priority 1” badge or crown; modal could feel like a podium or ranking panel.

---

## 4. What’s On (Calendar)

**Purpose:** Upcoming races and events (MotoGP, WorldSBK, ASBK, etc.). Tap event for link; “Add reminder” adds to device calendar.

**Layout:**
- **Header:** “What’s on” (large) + “MotoGP • WorldSBK • Australian road racing (ASBK). Tap to open links.”
- **Cards:** Each event: **left edge colour by series** (e.g. MotoGP red, WorldSBK blue, ASBK/Australia amber). Top row: series label (coloured) + date range. Title (event name), then venue/country. Secondary button: “Add reminder” (amber tint, not full amber).
- **States:** Loading, error + Retry, pull-to-refresh.

**Visual/theming ideas:** Timeline or calendar strip; series logos/colours; “Next race” highlight; flag or circuit silhouettes.

---

## 5. Q & A

**Purpose:** **Ask** (live web Q&A), **Official rule check** (MoMS), and **Trivia** (quiz). Same screen; Ask | Trivia tab switch at top; Rules sits under Ask.

**Layout:**
- **Tab bar:** Two segments: “Ask” | “Trivia”. Active = amber fill, dark text; inactive = dark, gray text.
- **Ask tab:** “Got a question?” + live-search subtitle. Search input + “Ask” (amber). Results: dark card with reply + source links. Hint to use Coach for coaching/setup.
- **Official rule check (under Ask):** Separate “Official rule check?” block for MoMS clause lookup. Input + “Check”. Reply card cites edition / clause locations when available.
- **Trivia tab:** Quiz rules (3 wrong = fail; 5 right = track rider; 8+ = Track Guru). “Start trivia quiz”. While playing: score “✓ N  ✗ N”, question, 4 options. End states: fail (red) or tier result + “Play again”. Best score persisted; goat celebration on strong wins.

**Visual/theming ideas:** Quiz podium / rider tiers; “Scooter rider” vs “Track Guru” badges; rule-book / clipboard motif for MoMS.

---

## 6. Rider Coach (hub)

**Purpose:** Entry hub for AI dialog and setup tools — not an in-screen Coach | Bike Setup tab bar.

**Layout:**
- Compact logo at top.
- **AI dialog:** Two full-width nav buttons — “RR AI Coach” and “RR Bike Setup” → open `CoachChat` with the matching mode.
- **Tools:** Short privacy note (data stays on device). Buttons for Day Setup Sheet, Bike Balance Setup, Bike Setup Basics, Track Walk / Track Notes, RoadRacer AI FAQs.
- Feature-request mailto link at bottom.

**Visual/theming ideas:** Pit-board hub; helmet for Coach; wrench for Bike Setup; tool-row icons for sheet / balance / walk.

---

## 7. Coach Chat

**Purpose:** Full-screen chat for **coach** (technique / race craft) or **bikesetup** (suspension, gearing). Seeded from hub, Track Walk, Import notes, or track-arrival draft.

**Layout:**
- Mode from route params (`coach` | `bikesetup`). Message list + composer; long LLM timeout acceptable.
- Seed handoff: `seedDraftMessage` and/or `seedMessages` (user + assistant) pre-populate once.

**Visual/theming ideas:** Chat bubbles on dark slate; amber send; distinct Coach vs Bike Setup header accent.

---

## 8. Import Track Notes

**Purpose:** Paste track notes (e.g. from Messages/WhatsApp), attach photos, pick a catalog track (or Other), send to coach.

**Layout:**
- Title “Import track notes”; “Paste from clipboard”.
- Track picker + Other-track context form; multiline notes; optional photos.
- CTA “Send to coach” → navigates to CoachChat with seeded conversation.

**Visual/theming ideas:** Clipboard / shared-notes icon; corner numbers; crew-chief vibe.

---

## 9. Track Walk / Track Notes

**Purpose:** Build corner-by-corner session notes (typed or voice), photos, then send to Coach or open Import.

**Layout:**
- Track picker, session metadata, corner list + note drafts.
- Optional speech recognition when the native module exists; clear alert if unavailable.
- Actions: save session, send to coach, import notes.

**Visual/theming ideas:** Circuit map / corner chips; mic affordance for voice.

---

## 10. Day Setup Sheet

**Purpose:** On-device day sheet for pressures, sag, clicks, notes; history snapshots; share as text.

**Layout:** Form sections for tyres / suspension / notes; save / clear / history; share sheet.

**Visual/theming ideas:** Clipboard / setup-sheet motif; numeric fields in pit-lane style.

---

## 11. Bike Balance Setup

**Purpose:** Measurement-driven balance calculator (rider + bike inputs) with exportable report text.

**Layout:** Guided inputs, results / guide progress, save setups locally.

**Visual/theming ideas:** Scale / balance graphic; measurement callouts.

---

## 12. Bike Setup Basics

**Purpose:** Interactive suspension diagram with hotspots; tap a point for road vs track guidance.

**Layout:** Full-width bike diagram; red hotspot dots; bottom sheet / detail for selected part.

**Visual/theming ideas:** Annotated bike silhouette; measure vs adjust hotspot colours.

---

## 13. RoadRacer AI FAQs

**Purpose:** Static FAQ list about RoadRacer AI features and limits.

**Layout:** Scrollable Q&A sections on dark background; back via stack header.

**Visual/theming ideas:** Simple list; optional “?” / helmet icon — keep sparse.

---

## Navigation & Chrome

- **Bottom tabs (4):** Home (Headlines) | Events (Calendar) | Q & A | Coach. Dark bar, amber active, gray inactive.
- **Coach stack:** Hub → CoachChat, Track Walk, Import notes, setup tools, FAQs.
- **Stack headers:** Dark background, light title, amber for right-side actions (Settings, Import notes).
- **Loading/splash:** Dark screen, amber spinner, before onboarding or before main app.

---

## Suggested Prompts for GPT

- “Generate a dark, motorsport-themed colour palette with an amber accent for a racing news and coaching app.”
- “Describe a 6-step onboarding flow for a motorcycle racing app with steps: welcome, favourite bike, favourite rider, how you ride, ‘Just Send it!’, and summary.”
- “Create a list of UI component descriptions for: headline cards with left accent, calendar event cards with series colours, and a two-tab Q&A/Trivia screen.”
- “Suggest icon concepts for: Headlines, What’s On (calendar), Q&A, Rider Coach, Settings, Import notes, Paste, Send to coach.”

Use this brief as context for copy, wireframe descriptions, or visual direction when generating assets or themes.
