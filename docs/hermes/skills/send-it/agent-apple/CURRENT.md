# Agent Apple — current Apple knowledge

**As of:** 2026-11-06  
**Owner:** weekly-skills mode rewrites this file. Do not leave stale versions in SKILL.md.

## Shipping OS (devices testers actually run)

| Line | Version | Released | Notes |
|------|---------|----------|--------|
| **Current iOS / iPadOS** | **27.2** | 26 Oct 2026 | Security release. iPhone 11 and later. [Support 100100](https://support.apple.com/en-us/100100) (page dated 30 Oct; no newer release as of 6 Nov) |
| iOS 27.1 | 27.1 | 23 Oct 2026 | Ships on **iPhone Duo** (foldable, on sale 23 Oct). No CVEs |
| iOS 27 GA | 27.0 (27.0.1 on 28 Sep) | 14 Sep 2026 | Reviewers and testers have been on iOS 27 since mid-Sep |
| **iOS 27.3 beta** | 27.3 beta 1 | 3 Nov 2026 | Developer beta only. Not on tester phones. Ships with Xcode 27.3 beta |
| Previous major | **26.7.2** | 26 Oct 2026 | iPhone 11 and later who stay on 26 |
| Older phones | **18.7.11** | 26 Oct 2026 | iPhone XS / XS Max / XR / iPad 7th gen only |
| Xcode | **27.2** | 29 Oct 2026 | Requires macOS Tahoe 26.6+. 27.3 beta alongside iOS 27.3 beta |
| macOS | Golden Gate **27.2**, Tahoe 26.7.2, Sequoia 15.8.2 | 26 Oct 2026 | Safari 27.2 for Sequoia / Tahoe |

RoadRacer `deploymentTarget` **16.4** is still valid for binaries built with the iOS 26 SDK. Expect **testers and App Review on iOS 27.x** (iPhone Duo reviewers on 27.1+). Test on iOS 27 **and** one iOS 26.7 device.

## iOS 27 / Xcode 27 — UIScene lifecycle

**Apple rule:** apps built with the iOS 27 SDK (Xcode 27) that have not adopted the UIKit scene lifecycle are killed at launch on iOS 27 (`NoSceneLifecycleAdoption`). The same build can still launch on iOS 26, so an old-phone smoke test can pass while iOS 27 users crash.

**Expo status (verified 6 Nov):**
- Expo SDK 58 (stable 15 Oct 2026, RN 0.88) generates `SceneDelegate.swift` and `UIApplicationSceneManifest`. npm `expo@latest` = **58.0.23**.
- **SDK 57 supports building with Xcode 27 from `expo` 57.0.23** by explicit opt-in (needs `expo-build-properties` 57.0.20+; npm `sdk-57` tag = 57.0.23):

```json
["expo-build-properties", { "ios": { "enableSceneSupport": true } }]
```

It makes `AppDelegate` conform to `ExpoReactNativeFactoryProvider`, drops the legacy RN startup block, and adds a `UIApplicationSceneManifest` pointing at Expo's built-in `EXExpoAppSceneDelegate` (no `SceneDelegate.swift` on SDK 57). The plugin only edits the template AppDelegate; a customised AppDelegate or an existing scene manifest makes it refuse. Sources: [expo/fyi ios-scene-lifecycle](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md), [expo#46664](https://github.com/expo/expo/issues/46664) (pinned comment, locked).

Failure symptoms: black screen on iOS 27 if manifest/delegate is missing; `Linking.getInitialURL()` null on cold start before the SDK 58 fix (expo#47628); duplicate URL events if an AppDelegate override also calls `RCTLinkingManager`.

**EAS images ([Expo build infrastructure](https://docs.expo.dev/build-reference/infrastructure/), re-read 6 Nov):**

| Alias | Image | Xcode |
|-------|-------|-------|
| `sdk-57` | `macos-tahoe-26.5-xcode-26.6` | 26.6 (iOS 26 SDK) |
| `sdk-58` and **`latest`** | `macos-tahoe-26.6-xcode-27.1` | 27.1 (docs list it as "27.1 RC") |
| (unaliased) | `macos-tahoe-26.6-xcode-27.0` | 27.0 |
| `sdk-56` | `macos-tahoe-26.4-xcode-26.4` | 26.4 |

No Xcode 27.2 EAS image is listed yet. Docs: apps built on Xcode 27 images, including `latest`, launch on iOS 27 **only with the UIKit scene lifecycle**. On SDK 57 enable `ios.enableSceneSupport`, or use `auto` / `sdk-57`.

**Effect on RoadRacer (checked 6 Nov):**
- `app/eas.json` pins `"image": "sdk-57"` for development, preview, and production (Xcode 26.6 / iOS 26 SDK). **SAFE today**; runs fine on iOS 27 devices. `app.json` has no `enableSceneSupport` (correct for that image).
- **Do not change the image to `latest` / `auto` / an Xcode 27 image** without `enableSceneSupport: true` (SDK 57) or an SDK 58 upgrade. Result would be a launch crash on iOS 27 that iOS 26 testing will not show.

**iOS 27 behaviour changes for apps built with the iOS 27 SDK (Expo SDK 58 notes):**
- iPhone apps become **resizable** automatically.
- `requireFullScreen` no longer opts out of resizing; **`ScreenOrientation.lockAsync` may have no effect while the app is resizable** ([docs](https://docs.expo.dev/versions/v58.0.0/sdk/screen-orientation/#orientation-locks-on-ios-27-and-later)). RoadRacer app source currently has **no `lockAsync` calls** (only the `expo-screen-orientation` plugin with `initialOrientation: PORTRAIT_UP`; Info.plist allows landscape), so this is dormant until a lock is reintroduced.
- Safe-area handling matters more (iPhone Duo puts bars in a vertical rail). Update `react-native-safe-area-context` when upgrading.
- `expo-glass-effect` reports `isLiquidGlassAvailable` true when built with the iOS 27 SDK.

## App Store Review Guidelines — Last updated **October 16, 2026** (unchanged this week)

Re-fetched 6 Nov: still "Last Updated: October 16, 2026". Changes in that revision ([news](https://developer.apple.com/news/?id=92th7e5i)):
- **2.5.19 (new):** hidden, dormant, or undocumented features, and misrepresenting the app during review then changing it after approval, are removal-grade (removal from the Developer Program). Formerly part of 2.3.1. **Review notes must describe every shipped feature accurately.**
- **2.3.14 (new):** creative assets (product page headers / search assets). Relevant only if RoadRacer uploads them.
- **1.2:** content moderation explicitly covers nonconsensual intimate imagery, including AI-generated. No UGC feed in RoadRacer; avatar/photo are on-device only.
- **3.1.1(a):** music-streaming entitlement bullet folded into StoreKit External Purchase Link. No IAP in RoadRacer.
- **Section 5:** human trafficking / child exploitation removal language.

Unchanged and still applied: 5.1.1 privacy policy (ASC + in-app); 5.1.2 nutrition label must match SDK data (OpenAI via Coach/Q&A, Sentry if DSN in binary); 3.1 no hidden paid unlocks; 2.1 Information Needed; 2.5.4 background location only if justified.

## ASC — requirements and questionnaires

- **NEW: age rating content descriptors, effective 16 Nov 2026** ([news](https://developer.apple.com/news/?id=yxkh08us)). The questionnaire adds **Shared Location** (real-world location shared with another person or group) and **Dating and Relationships**. Declarations are required with any app update or age-rating change, and **all apps must have them by 12 Jan 2027**. **RoadRacer answer: No / No** (location is used on-device only; no sharing, no dating). Answer them in the first upload after 16 Nov. Dating = minimum 18+; Brazil: Shared Location needs A16.
- **Social media capability questionnaire** (age ratings) is enforced. **RoadRacer answer: No social media capabilities** (Track Walk Private/Team/Community is a local label).
- **From April 2027:** iOS/iPadOS uploads need the **iOS 27 SDK** (Xcode 27); submissions will also need **iPhone Duo screenshots** (apps that opt in earlier get an "optimized for iPhone Duo" badge).
- Current minimum (since 28 Apr 2026): Xcode 26 / iOS 26 SDK. `sdk-57` image (Xcode 26.6) is compliant until April 2027.
- **New ASC capabilities:** Asset Library + product page preview tool; product page headers and search-result assets (optional for 1.0.x). 4 Nov: retention messages for auto-renewable subscriptions (N/A, no IAP).
- **Developer Program License Agreement** revised 13 Oct (Group/Volume Purchasing, Live Assistance API, HomeView/CarPlay) and again 29 Oct (Taiwan storefront, commission 26% from 31 Oct, no signing required to benefit). Account holder should **sign in and accept** or ASC may block. No IAP, no commission impact.
- **Age ratings:** AU 15+ folded into 16+ (since June); Korea descriptors 12+ in October (RoadRacer not expected to be affected); verify ratings after answering the questionnaire.
- **EU ATT:** from iOS 27.2 an alternative ATT prompt exists in the EU. RoadRacer has no ATT; no action.

## Expo / React Native state

| Item | Value |
|------|-------|
| Latest Expo SDK | **58** (stable 15 Oct 2026; npm `expo@latest` = 58.0.23) with **React Native 0.88** |
| SDK 57 line | npm tag `sdk-57` = **57.0.32** (up from 57.0.31). Repo `app/package.json` now declares `expo ~57.0.31`, installed **57.0.31** (1 patch behind; patch lag from last week is closed) |
| RoadRacer RN | 0.86.2 (SDK 57) |
| `expo-screen-orientation` | `~57.0.3` in repo |
| `expo-speech-recognition` | Repo pins `56.0.1`; npm has `57.x` and `58.0.1` (`latest`) published. Fact only |
| Expo Go | SDK 58 in stores; store Expo Go drops SDK 57 after that. Not the review binary anyway |
| EAS Observe | native crash reporting needs `expo@57.0.21+` on SDK 57 |

**SDK 58 breaking changes (awareness, if SDK 58 is ever adopted):**
- RN 0.87+ Strict TypeScript API default (deep imports from `react-native/Libraries/*` fail `tsc`).
- Removed: `InteractionManager`, `Touchable` root export, `Modal` `animated` prop, `StatusBar` `backgroundColor`/`translucent`. `ImageBackground` deprecated.
- `expo-notifications` foreground notifications now shown by default (app does not request notifications).
- `NODE_ENV` forced by Expo CLI (affects `.env` loading); `expo-file-system` `File.write()` now async.
- No macOS target. Xcode 27 replaces Simulator.app with **Device Hub**.

## Design system — Liquid Glass (iOS 26+, iOS 27)

System chrome uses Liquid Glass. Cost is **GPU + texture memory + energy**, not free blur.

- Do not apply glass to every React Native surface. Prefer solid fills for dense text (coach chat, Q&A).
- Interactive glass is extra per-frame sampling; reserve for controls the user is touching.
- Profile on a physical iPhone 11-class device, not Simulator.
- Refresh ASC screenshots on current OS (iOS 27) if Review compares chrome.
- Xcode 27 Organizer tracks a hitches metric; use it after TestFlight for Track Details zoom/pan jank.

## iPhone Duo (on sale 23 Oct 2026)

Foldable, runs iOS 27.1. Bars/controls move into a vertical rail; window size changes as it folds or splits. Xcode 27.1 adds simulator/Device Hub support. RoadRacer is an iPhone/iPad app with `supportsTablet: true`; existing apps built with iOS 26 SDK are not resized. When built with iOS 27 SDK, test narrow/wide windows, safe-area insets, and Track Details map layout.

## iOS 27 frameworks (awareness only)

Foundation Models (incl. Claude/Gemini providers, Private Cloud Compute tier free for Small Business Program <2M downloads), App Intents/Siri, Core AI. **New 3 Nov:** Siri AI Developer Preview opens to all developers in the iOS 27.3 beta via App Intents (not available in EU; ships to customers in "a few months", App Store submission opens in spring; terms/usage policies to follow). **RoadRacer Coach is server-side OpenAI**; do not claim Apple Intelligence or Siri in ASC or marketing. No App Intents in the app. Rosetta: macOS 27 is Apple silicon only; EAS is ARM-native, no action.

## App Store Connect (stable rules, confirm weekly)

- Privacy policy required in metadata and in-app (5.1.1).
- Nutrition labels include **OpenAI** (Coach/Q&A) and **Sentry** if DSN in binary.
- `ITSAppUsesNonExemptEncryption: false` is set (confirmed in `app.json`); HTTPS-only is exempt.
- Guideline 2.1 — Review may demand a **physical-device screen recording** from Home Screen launch. Notes live in `docs/ios/APP_REVIEW_NOTES.md`.
- Individual team seller name is the legal name, not "RoadRacer".
- Marketing version in `app/app.json` is **1.0.2** (skill facts table says 1.0.0). Remote `appVersionSource`; EAS `production` auto-increments build number.

## This repo — active watch-outs

- **EAS image:** `app/eas.json` uses `sdk-57` (Xcode 26.6) in all iOS profiles. Keep it unless `enableSceneSupport` or SDK 58 lands first.
- **Guideline 2.5.19:** keep `APP_REVIEW_NOTES.md` an accurate, complete feature list. Re-verify against the binary before each submission.
- **Next upload after 16 Nov:** answer Shared Location = No, Dating and Relationships = No; also social media questionnaire = No; accept DPLA in the developer account.
- Sentry/OpenAI nutrition label entries must match the shipped binary.
- Orientation lock: no `lockAsync` calls today; revisit only if one is added.

## Changelog (last 8 weeks)

| Date | Change |
|------|--------|
| 2026-11-06 | Xcode **27.2** (29 Oct) and **iOS 27.3 beta 1** (3 Nov) noted; iOS 27.2 still current release. **New age-rating descriptors (Shared Location, Dating and Relationships) from 16 Nov, mandatory by 12 Jan 2027**; RoadRacer answers No/No. Guidelines still 16 Oct. Siri AI Developer Preview (3 Nov, 27.3 beta). Expo: `sdk-57` tag 57.0.32; Xcode 27 support on SDK 57 starts at **57.0.23**; repo now on `expo ~57.0.31` (patch lag closed). App source has no `lockAsync` calls. No Xcode 27.2 EAS image listed. Dropped dismissed items (speech-recognition review-notes wording, April 2027 upgrade plan) from watch-outs; April 2027 SDK/screenshot requirement kept as an Apple fact only. |
| 2026-10-30 | Weekly refresh after an 8-week gap. iOS 27 GA 14 Sep; current **iOS 27.2** (26 Oct) / 26.7.2 / 18.7.11. **Expo SDK 58 stable (15 Oct)** fixes UIScene; SDK 57 gets `ios.enableSceneSupport` opt-in; `expo#46664` closed. EAS image table corrected: `sdk-57` = Xcode 26.6; `latest`/`sdk-58` = Xcode 27.1. App Review Guidelines updated **16 Oct** (new 2.5.19, 2.3.14). April 2027: iOS 27 SDK required for uploads + iPhone Duo screenshots. iPhone Duo launched 23 Oct (iOS 27.1). DPLA revised 13 Oct and 29 Oct (Taiwan). iOS 27 orientation-lock caveat added. App version 1.0.2. |
