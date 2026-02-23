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

**Purpose:** Quick personalisation—favourite bike, favourite rider, how they ride, and a fun “Just Send it!” moment.

**Flow (6 steps):**
- **Step 0:** Welcome. “Welcome to RoadRace” + short intro. Single CTA: “Let’s go 👇”.
- **Step 1:** Favourite bike. One text field, placeholder e.g. “Ducati Panigale V4, Yamaha R1…”.
- **Step 2:** Favourite rider. One text field, placeholder e.g. “Valentino Rossi, Marc Márquez…”.
- **Step 3:** How do you ride? Three big tap options: “I race 🏁”, “Track days only 🛞”, “Just love bikes 🏍️”.
- **Step 4:** “Do you know what ‘Just Send it!’ means?” Yes/No. If no, a small info box explains the phrase (commit, go for it, leave doubt in the pits).
- **Step 5:** Summary. Short personalised lines (rider fact, bike fact) + “You’re in the right place” and “Time to send it. 🏁”.

**UI:** Progress dots at top (inactive gray, active elongated amber). Per step: big title, subtitle, then inputs or options. Bottom row: Back (muted) + Next / “Let’s go” (amber, full emphasis). Dark background, cards for inputs and option buttons; selected state = amber border.

**Visual/theming ideas:** Hero illustration for “Welcome” or “Just Send it!”; subtle bike/silhouette motifs; progress could be a speedometer or track segment.

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

**Purpose:** Two modes—**Ask** (search knowledge base) and **Trivia** (quiz). Same screen, tab switch at top.

**Layout:**
- **Tab bar:** Two segments: “Ask” | “Trivia”. Active = amber fill, dark text; inactive = dark, gray text.
- **Ask tab:** “Ask a question” title + “Search the knowledge base.” Search input + “Search” button (amber). Results: cards with left amber bar; each has title (amber) and content (headings + paragraphs).
- **Trivia tab:** “Trivia quiz” + rules (3 wrong = fail; 5 right = track rider; 8+ = Track Guru). “Start trivia quiz” (outline/amber border). While playing: score “✓ N  ✗ N”, question text, 4 option buttons (dark). End states: “Quiz over” (fail, red tone) or result (e.g. “Track Guru!”, “Scooter rider”) + message + “Try again” / “Play again” (amber).

**Visual/theming ideas:** Quiz could have podium or rider tiers; playful “Scooter rider” vs “Track Guru” badges; search could have magnifying glass or helmet icon.

---

## 6. Rider Coach

**Purpose:** AI coach (technique, race craft) and Bike Setup (suspension, gearing). Placeholder until backend connected.

**Layout:**
- **Header:** “Rider Coach & Tech” with “Import notes” (amber) top-right.
- **Tab bar:** “Coach” | “Bike Setup” (same style as Q&A).
- **Coach panel:** “Rider Coach” title + “Your Road racing AI coach. Tips, technique, and race craft—ready when you are.” Placeholder card: “RoadRace AI” label + short text about coach chat connecting when configured.
- **Bike Setup panel:** “Bike Setup” title + “Technical assistant for suspension, gearing, and bike setup.” Placeholder card: “Technical Assistant” + text about technical Q&A connecting.

**Visual/theming ideas:** Coach = helmet/earpiece; Bike Setup = wrench/gears; “coming soon” or connection status; pit-board or clipboard motif.

---

## 7. Import Track Notes

**Purpose:** Paste track notes (e.g. from Messages/WhatsApp) to send to coach for summarising and track log.

**Layout:**
- **Title:** “Import track notes”.
- **Subtitle:** Paste notes shared by another rider; coach can summarise and add to your log.
- **Primary action:** “Paste from clipboard” (dark button, amber text).
- **Fields:** “Track name (optional)” single line; “Notes” multiline (tall).
- **CTA:** “Send to coach” (amber, full-width style). Disabled when notes empty; shows loading when sending.

**Visual/theming ideas:** Clipboard or “shared notes” icon; track map or corner numbers as background; “From the pits” or “Crew chief” vibe.

---

## Navigation & Chrome

- **Bottom tabs (4):** Headlines | What’s On | Q & A | Rider Coach. Dark bar, amber active, gray inactive. No icons described in code—could add (newspaper, calendar, chat/?, helmet).
- **Stack headers:** Dark background, light title, amber for right-side actions (Settings, Import notes).
- **Loading/splash:** Dark screen, amber spinner, before onboarding or before main app.

---

## Suggested Prompts for GPT

- “Generate a dark, motorsport-themed colour palette with an amber accent for a racing news and coaching app.”
- “Describe a 6-step onboarding flow for a motorcycle racing app with steps: welcome, favourite bike, favourite rider, how you ride, ‘Just Send it!’, and summary.”
- “Create a list of UI component descriptions for: headline cards with left accent, calendar event cards with series colours, and a two-tab Q&A/Trivia screen.”
- “Suggest icon concepts for: Headlines, What’s On (calendar), Q&A, Rider Coach, Settings, Import notes, Paste, Send to coach.”

Use this brief as context for copy, wireframe descriptions, or visual direction when generating assets or themes.
