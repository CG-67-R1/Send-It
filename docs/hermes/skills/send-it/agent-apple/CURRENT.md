# Agent Apple — current Apple knowledge

**As of:** 2026-09-04  
**Owner:** weekly-skills mode rewrites this file. Do not leave stale versions in SKILL.md.

## Shipping OS (devices testers actually run)

| Line | Version | Released | Notes |
|------|---------|----------|--------|
| **Current iOS / iPadOS** | **26.6.1** (build 23G83) | 17 Aug 2026 | Security + stability. [Support 100100](https://support.apple.com/en-us/100100) |
| Previous point | 26.6 | 27 Jul 2026 | Spotlight indexing prep for iOS 27 |
| Older phones still on 18.x | **18.7.10** | 17 Aug 2026 | iPhone XS / XR / iPad 7th gen only |
| macOS (EAS Macs) | Tahoe **26.6.2** | 17 Aug 2026 | Match Xcode / Transporter machines when diagnosing submit hangs |
| Safari standalone | 26.6.1 | 18 Aug 2026 | Patched on macOS Sonoma / Sequoia |

Devices: iOS 26.6.1 requires **iPhone 11 and later**. RoadRacer `deploymentTarget` **16.4** remains valid. Review devices are on 26.x now; iOS 27 GM expected **Monday, September 14, 2026** based on Apple Event Sep 9 + historical Monday pattern. Reviewers may flip to iOS 27 immediately after launch.

## ⚠️ CRITICAL — iOS 27 GM Imminent (September 14, 2026)

Apple's **"Surprise and Shine"** event was **September 9, 2026 at 10 a.m. PT** — iPhone 18 / iOS 27 launch event. iOS 27 GM + public release is now predicted for **Monday, September 14, 2026** (Forbes, CNET, Apple Hub; consistent with Apple's historical Monday release pattern).

**What this means for RoadRacer this week:**

- App Store Reviewers **will begin running iOS 27 as soon as September 14**. Any build in Review on or after that date may be tested on iOS 27 hardware.
- **The UIScene launch crash is the #1 risk.** See section below. EAS must NOT use Xcode 27 image until Expo ships the official fix.
- **Current safe EAS image: `macos-sequoia-15.6-xcode-26.2`** — builds with iOS 26 SDK. Existing iOS 26 SDK binaries run fine on iOS 27 devices. The launch crash only strikes if you build with Xcode 27 / iOS 27 SDK.
- Social media questionnaire in ASC is **already enforced** (since September 2026). **Must answer before any upload.**

## iOS 27 / Xcode 27 — UIScene lifecycle (P0 if EAS image bumps)

**Status as of Sep 4, 2026: Expo has NOT shipped an official UIScene fix in any published expo@57.x release.**

Detailed timeline:
- `expo#46664` (SDK 56, Xcode 27): **STILL OPEN** — assigned `tsapeta`, labeled "Issue accepted / Upstream: React Native / iOS 27". Community workaround plugin exists ([expo-ios-scene-lifecycle-plugin](https://github.com/YesterdaysLemon/expo-ios-scene-lifecycle-plugin)) but is **not official**.
- `expo#47570` (SDK 57, Xcode 27): **CLOSED Jul 7** — Expo maintainer `alanjhughes` confirmed: *"SDK 57 as published doesn't support the UIScene lifecycle yet. The support for it (a dedicated SceneDelegate plus wiring) landed on main after the sdk-57 release branch was cut, so it isn't in expo@~57.0.1. It'll ship in a later release, and once it does, `npx expo prebuild` generates the SceneDelegate and the scene manifest for you automatically."*
- `expo@57.0.17` (Aug 27 update): Resolves Hermes V1 memory regression + startup time regression. **Does NOT include UIScene fix** — that work is on `main`, not yet released.
- **SDK 58 or a future 57.x patch** is expected to include the official UIScene fix. No release date confirmed.

**Effect on RoadRacer:**
- Build with **Xcode 26 / iOS 26 SDK** → no UIScene issue, runs fine on iOS 27 devices → **SAFE**.
- Build with **Xcode 27 / iOS 27 SDK** → `EXC_BREAKPOINT` at launch, `UIScene life cycle is required`. → **DO NOT DO THIS until Expo ships the fix**.
- EAS is unlikely to auto-bump to Xcode 27 image before Expo announces SDK 58 or official fix, but **verify `eas.json` production image pin** before every upload.

**Community workaround (if forced):** Add `UIApplicationSceneManifest` to `Info.plist`, drop `window` creation from AppDelegate, add a SceneDelegate. Also forward `Linking.getInitialURL()` from `scene(_:openURLContexts:)`. This is fragile; wait for official fix.

## App Store Review Guidelines — Last updated June 8, 2026

Confirmed still current at `developer.apple.com/app-store/review/guidelines/` — **no new version detected this week**. Key sections unchanged:
- 5.1.1 Privacy policy required in ASC + in-app
- 5.1.2 Nutrition labels must match SDK data collection (OpenAI, Sentry if DSN in binary)
- 3.1 No hidden IAP / misleading paid unlocks
- 2.1 Information Needed — physical device recording from Home Screen launch
- 2.5.4 Background location only if justified

## ASC — Social Media Questionnaire (ACTIVE enforcement)

As confirmed in Apple Developer News (Jul 9, 2026): Enforcement of the social media capability questionnaire **began in September 2026**. All new app and update submissions require a response.

- **RoadRacer answer: No social media capabilities.** Track Walk Private/Team/Community is a local device label; nothing published to other users.
- If this has not been answered in ASC, do it **before the next upload or the submission will be blocked**.

## Expo SDK 57 — current state

Released **June 30, 2026**. Latest patch: **57.0.17** (Aug 27, 2026).

Key facts:
- React Native 0.86 (non-breaking from 0.85). React stays at 19.2.
- `expo prebuild` now clears and regenerates native `android/` and `ios/` folders by default. Pass `--no-clean` to preserve manual changes.
- **Hermes V1 memory regression fixed in 57.0.17** — resolves drastically increased memory usage when importing `react-native-worklets` or `react-native-reanimated`. **Important for RoadRacer**: if using reanimated, upgrade to `expo@57.0.17`.
- **Startup time regression fixed in 57.0.17** — dev builds were slower to launch; fix in 57.0.17.
- `expo-speech-recognition` **pinned at 56.0.1** — no SDK 57 package published yet. Do NOT invent or pin `~57.0.x`. Documented in `APP_REVIEW_NOTES.md`.
- **UIScene support NOT in any published 57.x** — see above.

EAS image: **`macos-sequoia-15.6-xcode-26.2`** remains the recommended production image (Expo SDK 57 blog, confirmed safe for ASC submission with iOS 26 SDK minimum requirement).

## Design system — Liquid Glass (iOS 26+)

System chrome uses Liquid Glass. Cost is **GPU + texture memory + energy**, not free blur.

- Do not apply glass to every React Native surface. Prefer solid fills for dense text (news, coach chat).
- Interactive glass is extra per-frame sampling; reserve for controls the user is touching.
- Profile on a **physical iPhone 11-class** device (min iOS 26 hardware), not Simulator.
- Navigation/tab bars may look different than iOS 18 screenshots — refresh ASC screenshots on 26.x if Review compares chrome.
- Apple released Figma/Sketch design kits for iOS/iPadOS/macOS 27 Liquid Glass (June 23, 2026) — useful if refreshing ASC screenshots.
- Xcode 27 Organizer tracks a **hitches metric** including Liquid Glass and SwiftUI animations. Useful post-TestFlight for landscape jank in Track Memory.

## Rosetta / macOS — developer awareness (September 1, 2026)

Apple announced Rosetta is being phased out:
- **macOS 26.4+**: Users may receive system notifications when launching Intel-only apps.
- **macOS 27**: Final release to support Rosetta. Intel-only apps will not run on Apple Silicon after macOS 27.
- **RoadRacer:** React Native / Expo EAS builds are already ARM-native. No action. Relevant if any Cursor dev tooling runs Intel-only on Mac.

## New App Store capabilities (fall 2026)

- **Product Page Header / Asset Library:** New creative asset placements active fall 2026 — product page header, search results, In-App Events. Figma/Photoshop/Pixelmator templates at [developer.apple.com/app-store/asset-best-practices/](http://developer.apple.com/app-store/asset-best-practices/).
  - Optional for RoadRacer 1.0.0, but worth preparing brand assets for discoverability.

## ASC minimum SDK requirement

- All uploads to App Store Connect must be built with **Xcode 26 or later** (iOS 26 SDK minimum) — active since April 28, 2026.
- SDK 57 / EAS with Xcode 26 image is already compliant. Do not pin `eas.json` to Xcode 16/25 image.

## Age ratings — regional changes

- **Australia:** 15+ rating removed (effective June 18, 2026). Apps at 15+ moved to 16+. RoadRacer is not a social/loot-box app; verify AU rating in ASC but likely no impact.
- **Korea (GRAC override):** Now available — apps with a GRAC Rating Classification Number can override App Store Korea rating. Effective Aug 12, 2026.
- **Korea (October 2026):** Two content descriptors move from "All" to "12+": *Infrequent profanity/crude humor* and *Infrequent mature/suggestive themes*. RoadRacer should not be impacted.

## EU developer program terms

- Core Technology Fee replaced with **Core Technology Commission (5%)** on digital transactions outside App Store. Effective October 1, 2026.
- **RoadRacer has no IAP** — no action required. Accept the updated Developer Program License Agreement (Attachment 14) in ASC if not done.
- Alternative payment options alongside IAP now permitted in EU.

## iOS 27 new frameworks (awareness only — not RoadRacer action)

- **Foundation Models framework:** Native Swift API for on-device Apple Intelligence models; multimodal prompts, Dynamic Profiles, cloud model providers (Claude, Gemini, etc.). Private Cloud Compute tier free for Small Business Program devs with <2M downloads.
- **Core AI:** New Swift framework for on-device AI model inference (ahead-of-time compilation, zero-copy paths, Metal tensors).
- **App Intents / Siri:** Entity schemas, View Annotations API, App Intents Testing framework.
- **RoadRacer Coach is server-side OpenAI** — do not claim Apple Intelligence in ASC or marketing. No action for 1.0.0.
- **`ImageCreator` removed in iOS 27 final.** RoadRacer does not use it — no action.
- **macOS:** Now called "macOS Golden Gate" (WWDC26 branding).

## App Store Connect (stable rules, confirm weekly)

- Privacy policy required in **metadata and in-app** (Guideline **5.1.1**).
- Nutrition Labels must include **Sentry** (if DSN in binary) and **OpenAI** via API for Coach/Q&A.
- `ITSAppUsesNonExemptEncryption: false` is set — HTTPS-only is exempt; do not flip to true without custom crypto.
- Guideline **2.1** — Review may demand a **physical-device screen recording** starting at Home Screen launch. Notes live in `docs/ios/APP_REVIEW_NOTES.md`.
- Individual team seller name is the **legal name**, not "RoadRacer".
- **App Review Guidelines last updated: June 8, 2026.** No material changes detected this week.
- Track Memory note in `APP_REVIEW_NOTES.md` references Skia road + landscape lock + coaching boards — **verify this is still accurate vs current build** before next submission (Track Memory is static SVG, not Skia, per current skill facts).

## This repo — active watch-outs

- **expo-speech-recognition pinned at 56.0.1** — no 57 release; do not change.
- **EAS image:** Confirm `eas.json` production image is `macos-sequoia-15.6-xcode-26.2` before any build.
- **Hermes V1 regression:** If `expo@57.0.17` not yet in `package.json`, upgrade it — memory and startup regressions are fixed there.
- **UIScene:** Do NOT run `npx expo prebuild` with Xcode 27 and expect it to launch. Wait for official Expo fix.
- **Social media questionnaire:** Must be answered in ASC before next submission.
- **APP_REVIEW_NOTES.md line 22:** Says Track Memory uses "Liquid Glass road" and "Skia" — review this claim; Track Memory is static SVG per current AGENTS.md/skill facts. Cursor should check and correct if inaccurate.

## Changelog (last 8 weeks)

| Date | Change |
|------|--------|
| 2026-09-04 | Weekly refresh: iOS 27 GM launch now imminent (Sep 14 predicted post Apple Event Sep 9). Expo#47570 CLOSED Jul 7 — Expo confirmed UIScene fix is on main but NOT in any published 57.x; SDK 57.0.17 (Aug 27) fixes Hermes V1 memory + startup regression only. Rosetta macOS phase-out announced Sep 1. GRAC Korea override active. Social media questionnaire enforcement confirmed active. No new App Review Guidelines update. expo-speech-recognition 56.0.1 pin status unchanged. APP_REVIEW_NOTES.md Track Memory Skia claim flagged for Cursor review. |
| 2026-08-28 | Weekly refresh: Apple Sep 9 "Surprise and Shine" event confirmed (iOS 27 / iPhone 18 launch); iOS 27 GM now imminent — added urgency note. Expo#46664 still OPEN (no official fix merged, community workaround documented). iOS 27 Beta 7 UIKit scene accessory change noted. Social media questionnaire now mandatory for submissions (Sep 7 deadline passed). Photos permission P2 resolved (confirmed in app.json). Korea age rating Oct 2026 change added. Sign in with Apple domain change noted (not relevant). App Store price updates (Aug 27, 4 countries) noted. Xcode 27 Organizer hitches metric update noted. `expo-speech-recognition` 56.0.1 pin documented. |
| 2026-08-21 | Weekly refresh: added ASC social media questionnaire deadline (Sep 7), new App Store product page header/Asset Library (fall 2026), EU business terms update (Oct 1), ASC minimum SDK note (Xcode 26 active since Apr 28), iOS 27 UIScene mandate confirmed (apps built with iOS 27 SDK fail to launch), Expo#46664 still open, WWDC26 iOS 27 new frameworks summary, AU age rating 15+→16+ change. |
| 2026-08-19 | Initial CURRENT.md: iOS 26.6.1, iOS 27/Xcode 27 UIScene, Liquid Glass cost, Skia/EAS notes. |
