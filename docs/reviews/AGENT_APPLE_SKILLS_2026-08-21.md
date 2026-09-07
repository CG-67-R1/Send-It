# Agent Apple — skills update 2026-08-21

**Mode:** weekly-skills  
**Verdict:** SKILLS UPDATED  
**CURRENT.md:** `docs/hermes/skills/send-it/agent-apple/CURRENT.md` — As of 2026-08-21

---

## What changed this week

### 1. ASC Social Media Questionnaire — ACTION REQUIRED by Sep 7, 2026

**New mandatory field shipping in September 2026 submissions.**

Apple added social media capability questions to the age rating questionnaire (July 9, 2026). From September 2026, every new app submission or update must answer whether the app has social media capabilities (defined as: ability to redistribute, amplify, or interact with user-generated content through a social feed).

**RoadRacer answer: No social media capabilities.**  
Track Walk's "Private / Team / Community" is a local device label only; sessions are never published to other users. Log into ASC and answer the questionnaire now — before the next binary is submitted — to avoid a hold at submission.

Source: [developer.apple.com/news/?id=tlur8uvi](https://developer.apple.com/news/?id=tlur8uvi)

---

### 2. New App Store creative asset placements — fall 2026

Apple is launching a **Product Page Header** and **search results creative assets** system (announced August 5, 2026). You can upload images and videos beyond screenshots — displayed as the first visual element on the product page.

- Assets managed in a new **Asset Library** in ASC.
- Optional for RoadRacer 1.0.0 — no submission blocker.
- Templates for Figma / Photoshop / Pixelmator at [developer.apple.com/app-store/asset-best-practices/](http://developer.apple.com/app-store/asset-best-practices/).
- Worth preparing ahead of time, especially for the RoadRacer 1.0.0 listing which currently only has screenshots.

Source: [developer.apple.com/news/?id=kug6m2ea](https://developer.apple.com/news/?id=kug6m2ea)

---

### 3. iOS 27 UIScene lifecycle mandate — confirmed, Expo#46664 still open

**No change to P0 status, but additional clarity this week:**

- Apple's official docs now explicitly state: *"Beginning in iOS 27, iPadOS 27, Mac Catalyst 27, tvOS 27, and visionOS 27, apps built with the latest SDK must adopt the scene-based life cycle or they fail to launch."*
- Xcode 27 ships an app modernisation agent that converts app-delegate lifecycle, but do not rely on it for a production binary.
- **Expo issue#46664** (UIScene lifecycle required for Xcode 27 builds) remains open with label "Issue accepted / Upstream: React Native / iOS 27". This was filed against SDK 56; SDK 57 status is unconfirmed.
- **Safe path for RoadRacer:** Keep EAS image at `macos-sequoia-15.6-xcode-26.2` (iOS 26 SDK). Do not move to Xcode 27 image until Expo SDK 57 changelog explicitly confirms scene lifecycle. iOS 27 GM is expected September 2026 — watch Expo releases closely.

Source: [expo#46664](https://github.com/expo/expo/issues/46664), [TN3187](https://developer.apple.com/documentation/technotes/tn3187-migrating-to-the-uikit-scene-based-life-cycle), [blakecrosley.com](https://blakecrosley.com/blog/uikit-scene-lifecycle-mandate-ios-27)

---

### 4. ASC minimum SDK requirement — active since April 28, 2026

Previously a watch-out; now confirmed active:

- All uploads to ASC must be built with **Xcode 26 / iOS 26 SDK or later**.
- Expo SDK 54+ uses Xcode 26 by default. SDK 57 (RoadRacer) is safe.
- Do not accidentally pin `eas.json` to an older Xcode image. Current `eas.json` does not pin an image for production — relies on EAS default, which is safe for SDK 57.

Source: [expo.dev/blog/app-store-connect-minimum-sdk-26](https://expo.dev/blog/app-store-connect-minimum-sdk-26)

---

### 5. EU Developer Program terms — new Attachment 14 (Oct 1, 2026)

- Apple updated its Apple Developer Program License Agreement (August 18, 2026) with new EU business terms effective October 1, 2026.
- Core Technology Fee → replaced by **Core Technology Commission** (5% on digital transactions outside App Store).
- Alternative payments alongside IAP now permitted in EU.
- **RoadRacer has no IAP / subscriptions** — no functional change required. Accept the updated DPLA in the developer account if not already done.

Source: [developer.apple.com/news/?id=gmws0jgp](https://developer.apple.com/news/?id=gmws0jgp)

---

### 6. Australia age rating change — 15+ removed (June 18, 2026)

The 15+ rating is no longer available on the Australian App Store. Apps previously rated 15+ move to 16+.

- RoadRacer is not in a category (social, loot boxes, unrestricted web) that triggers 16+ — likely unaffected.
- Verify current AU age rating in ASC metadata. Expected to remain "4+" or "9+".

---

### 7. iOS 27 new frameworks (awareness only)

WWDC26 introduced significant new frameworks in iOS 27:

| Framework | What it is | RoadRacer impact |
|-----------|------------|-----------------|
| Foundation Models | Native Swift API for on-device Apple Intelligence / cloud LLMs | None. Coach is server OpenAI. Do not claim Apple Intelligence in ASC. |
| Core AI | On-device AI model inference (Swift, zero-copy, AoT compilation) | None for 1.0.0 |
| App Intents / Siri | Entity schemas, View Annotations, natural language Siri | Future consideration for track/coach actions |
| Platform improvements | SwiftUI lazy loads, UIKit Mirroring, WidgetKit dynamic styling | Picked up indirectly via OS chrome; no action needed |

---

### 8. App Review Guidelines — no material change

Last updated June 8, 2026. Guideline 5.x privacy text unchanged this week. Stable.

---

## Sources fetched this run

| Source | Date |
|--------|------|
| Apple security releases (support.apple.com/en-us/100100) | 18 Aug 2026 |
| Apple Developer News (developer.apple.com/news/) | 18 Aug 2026 |
| App Review Guidelines (developer.apple.com/app-store/review/guidelines/) | Last updated 8 Jun 2026 |
| WWDC26 iOS guide (developer.apple.com/wwdc26/guides/ios/) | Current |
| Expo blog — ASC minimum SDK (expo.dev/blog/app-store-connect-minimum-sdk-26) | 27 Apr 2026 |
| Expo issue#46664 — UIScene / Xcode 27 | Jul 2026 (still open) |

---

## What testers should know this week

1. **Social media questionnaire in ASC must be answered before the next submission** (deadline Sep 7, 2026). Answer: no social media capabilities. Do this in ASC now, not at submission time.
2. **Do not move EAS build to Xcode 27 yet.** iOS 27 GM arrives in September. Expo has not confirmed SDK 57 handles the UIScene lifecycle requirement. Stay on `macos-sequoia-15.6-xcode-26.2` until Expo explicitly ships a fix.
3. **Test on a physical iPhone running iOS 26.6.1** — not Simulator, not Vercel web. Review devices are on the current shipping OS.
4. **Render cold start is still ~30 seconds** — brief testers to wait before declaring Coach/Q&A broken.
5. **Track Memory is noted as "not in this build"** in APP_REVIEW_NOTES.md. Keep this accurate if Track Memory ships. If it does ship in the next binary, update the review notes before submitting.
6. **Photos purpose string is narrow** — currently only mentions bike photo. If Apple's reviewer uses photos for track notes or coach attachments, they may flag a mismatch (P2, not a blocker). A fix requires a new binary.
7. **New App Store product page header launches fall 2026** — optional but worth prepping brand assets now so you're ready to publish when Apple enables the feature.

---

## No app/ or api/ edits made. Report only.
