# RoadRace App — Screen-by-Screen Brief for Visuals & Themes

Use this brief to generate mockups, illustrations, or theme variations in GPT (or similar). RoadRace is a **mobile app for trackday riders and club racers**: Rider Coach, Bike Setup, calendar, and Q&A. Home is Learn or Setup from onboarding. Headlines are archived in Settings.

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

## 2. Home

**Purpose:** Identity (bike photo + avatar) plus last session/prep and shortcuts. Learn vs Setup from “how you ride.” News is not on this screen.

**Layout:**
- **Header:** “RoadRacer” title; top-right “Settings” (amber text).
- **Hero:** Bike photo (tap to change); avatar + nickname bottom-right → Profile.
- **Last activity card:** Setup = newest Bike Setup Sheet session; Learn = newest Track Prep briefing. Empty state tells them what to save.
- **Learn CTAs:** Rider Coach, Track Prep, Q & A.
- **Setup CTAs:** Bike Balance, Bike Setup Sheet, Bike Setup AI.
- **Profile & settings** secondary button.

**Visual/theming ideas:** Pit-lane identity; last-session card with amber left edge.

---

## 3. Profile & settings

**Purpose:** Rider profile, how-you-ride (Learn vs Setup home), track-arrival reminders, and archived News (Open News + optional source/RSS/P1 notify).

**Layout:**
- **Section: Your profile.** Name, favourite bike, **How you ride** (four activity options), avatar.
- **Section: Rider photo.** Face capture / library / align.
- **Section: Reminders.** Track arrival toggle.
- **Section: News (archived).** “Open News” → headlines list. Collapsed “Show news sources” reveals Priority 1 notify, source order, custom RSS.
- **Section: Your data & privacy.** Legal links, export, reset onboarding, delete local data.
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

**Purpose:** **Ask** (live web Q&A), **Official rule check** (MoMS), **Trivia** (quiz), and **FAQs**. Same screen; Ask | Trivia | FAQs at top; Rules sits under Ask.

**Layout:**
- **Tab bar:** Three segments: “Ask” | “Trivia” | “FAQs”. Active = amber fill, dark text; inactive = dark, gray text.
- **Ask tab:** “Got a question?” + live-search subtitle. Search input + “Ask” (amber). Results: dark card with reply + source links. Hint to use Rider Coach or Bike Setup.
- **Official rule check (under Ask):** Separate “Official rule check?” block for MoMS clause lookup. Input + “Check”. Reply card cites edition / clause locations when available.
- **Trivia tab:** Quiz rules (3 wrong = fail; 5 right = track rider; 8+ = Track Guru). “Start trivia quiz”. While playing: score “✓ N  ✗ N”, question, 4 options. End states: fail (red) or tier result + “Play again”. Best score persisted; goat celebration on strong wins.
- **FAQs tab:** Searchable Coach and Bike Setup FAQ lists; “Ask coach / Ask Bike Setup AI” seeds the matching chat.

**Visual/theming ideas:** Quiz podium / rider tiers; “Scooter rider” vs “Track Guru” badges; rule-book / clipboard motif for MoMS.

---

## 6. Rider Coach (hub)

**Purpose:** Trackday / race-craft entry — not setup tools.

**Layout:**
- Compact logo at top.
- Buttons: **RR AI Coach**, **Track Prep**, **Bike Setup Basics**, **Track Memory**.
- Feature-request mailto link at bottom.

**Visual/theming ideas:** Pit-board hub; helmet for Coach; circuit for Track Prep.

---

## 6b. Bike Setup (hub)

**Purpose:** Club / privateer setup tools as a first-class tab (Balance is two taps).

**Layout:**
- Compact logo at top.
- Privacy note (data stays on device).
- Buttons: **Bike Setup AI**, **Bike Setup Sheet**, **Bike Balance Setup**, **Gearing Guide**, **Bike Setup Basics**.

**Visual/theming ideas:** Wrench hub; scale for balance; clipboard for the day sheet.

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

## 11b. Gearing Guide

**Purpose:** Simple sprocket helper — current F/R and ratio, bike powerband (catalog with override), the problem to fix, then send that brief to Bike Setup Coach.

**Layout:** Bike picker + editable specs; front/rear steppers; problem chips; optional track; nearby drive%/speed% table; Send to Bike Setup Coach. Footer points to Bike Balance for the most accurate overall setup.

**Visual/theming ideas:** Ratio readout; amber send; catalog vs override badge.

---

## 12. Bike Setup Basics

**Purpose:** Interactive suspension diagram with hotspots; tap a point for road vs track guidance.

**Layout:** Full-width bike diagram; red hotspot dots; bottom sheet / detail for selected part.

**Visual/theming ideas:** Annotated bike silhouette; measure vs adjust hotspot colours.

---

## 13. RoadRacer AI FAQs

**Purpose:** Static FAQ list about RoadRacer AI features and limits, under Q & A → FAQs (not its own tab).

**Layout:** Search field; Coach and Bike Setup sections; expand an answer or send it into the matching AI chat.

**Visual/theming ideas:** Simple list; optional “?” / helmet icon — keep sparse.

---

## Navigation & Chrome

- **Bottom tabs (5):** Home | Events | Rider Coach | Bike Setup | Q & A. Dark bar, amber active, gray inactive.
- **Home stack:** Home hub → Profile & settings; News list only from Settings → Open News.
- **Rider Coach stack:** Hub → CoachChat (coach), Track Prep / Walk / Memory, Import notes, Bike Setup Basics.
- **Bike Setup stack:** Hub → CoachChat (bikesetup), Sheet, Balance, Basics.
- **Stack headers:** Dark background, light title, amber for right-side actions (Settings, Import notes).
- **Loading/splash:** Dark screen, amber spinner, before onboarding or before main app.

---

## Suggested Prompts for GPT

- “Generate a dark, motorsport-themed colour palette with an amber accent for a racing news and coaching app.”
- “Describe a 6-step onboarding flow for a motorcycle racing app with steps: welcome, favourite bike, favourite rider, how you ride, ‘Just Send it!’, and summary.”
- “Create a list of UI component descriptions for: headline cards with left accent, calendar event cards with series colours, and a two-tab Q&A/Trivia screen.”
- “Suggest icon concepts for: Headlines, What’s On (calendar), Q&A, Rider Coach, Settings, Import notes, Paste, Send to coach.”

Use this brief as context for copy, wireframe descriptions, or visual direction when generating assets or themes.
