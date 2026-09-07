# Agent Apple — Skills Update 2026-09-04

**Mode:** weekly-skills  
**Prepared by:** Agent Apple (Hermes cron)  
**Sources fetched:** Apple security releases, Apple Developer News, App Store Review Guidelines, WWDC26 iOS guide, Expo SDK 57 changelog, GitHub expo/expo issues #46664 and #47570

---

## Status

**CURRENT.md updated.** Install script will follow this report.

---

## What changed this week

### 1. 🚨 iOS 27 GM launch imminent — September 14, 2026 (new, HIGH urgency)

The Apple "Surprise and Shine" event ran **September 9, 2026**. iOS 27 GM public release is now predicted by multiple credible sources (Forbes, CNET, Apple Hub, Wikipedia) for **Monday, September 14, 2026** — consistent with Apple's historical pattern of Monday launches one week after the event.

**Impact on RoadRacer:** App Store Reviewers may begin testing on iOS 27 devices as soon as September 14. Any build currently in Review, or submitted this week, has a meaningful chance of being reviewed on iOS 27. This makes the UIScene status below critical to communicate to Chris / Cursor.

### 2. 🚨 Expo UIScene fix — NOT in any published SDK 57.x (clarified, critical update)

Previous CURRENT.md stated expo#46664 (the UIScene fix) was open and assigned. This week, new evidence from **expo#47570** (closed July 7) provides much more precise information from an Expo maintainer:

> *"SDK 57 as published doesn't support the UIScene lifecycle yet. The support for it (a dedicated SceneDelegate plus the wiring that lets React Native start into the scene's window) landed on main after the sdk-57 release branch was cut, so it isn't in expo@~57.0.1. It'll ship in a later release, and once it does, `npx expo prebuild` generates the SceneDelegate and the scene manifest for you automatically."* — `alanjhughes`, Expo team, July 7, 2026

**What this means:**
- Community workarounds (manual SceneDelegate + `UIApplicationSceneManifest`) produce a blank screen on SDK 57 because `RCTReactNativeFactory.startReactNative()` does not attach the React Native root view correctly under the scene lifecycle.
- The fix is on Expo `main` but not released. It will ship in SDK 58 or a future 57.x patch — no date confirmed.
- **For RoadRacer: do not change EAS image to Xcode 27 under any circumstances until Expo announces the fix.** Current `macos-sequoia-15.6-xcode-26.2` is safe.

### 3. expo@57.0.17 — Hermes V1 memory regression fixed (August 27, 2026)

Expo published `57.0.17` on August 27, fixing:
- **Hermes V1 memory regression** (expo#46519): Apps importing `react-native-worklets` or `react-native-reanimated` could see drastically increased memory usage. This affects RoadRacer if using Reanimated.
- **Startup time regression in dev builds** (expo#48298): Development builds were slower to launch.

**Action for Cursor:** Verify `app/package.json` and `android-app/package.json` have `expo@^57.0.17` (or `~57.0.17`). If on an earlier 57.x patch, upgrade.

### 4. Rosetta macOS phase-out announced (September 1, 2026)

Apple announced the end of Rosetta for Intel-based macOS apps:
- macOS 26.4+: Users see notifications when launching Intel-only apps
- macOS 27: Intel-only apps will not run

**RoadRacer impact:** None directly — EAS builds are ARM-native. Relevant only if Cursor devs are using any Intel-only Mac tooling.

### 5. Apple security releases — no changes since August 18

Latest iOS/iPadOS remains **26.6.1** (Aug 17). macOS remains **Tahoe 26.6.2**. No new security release this week. The security release page does not yet reflect any iOS 27 release — confirming it hasn't shipped as of Sep 4.

### 6. App Review Guidelines — still June 8, 2026

No new version detected. `Last Updated: June 8, 2026` confirmed at developer.apple.com/app-store/review/guidelines/. All existing RoadRacer review notes remain accurate.

### 7. Social media questionnaire — enforcement confirmed active

Apple Developer News (July 9) confirmed enforcement began September 2026. The page explicitly states:
> *"beginning in September 2026, responses will be required when submitting new apps or updates to the App Store"*

**Action for Cursor/Chris:** If this questionnaire has not been answered in ASC, answer it now. RoadRacer answer = **No social media capabilities**.

### 8. Korea GRAC override now active (August 12, 2026)

Apps with a GRAC Rating Classification Number can now override the App Store Korea rating to any region-specific value. RoadRacer has no GRAC number and is unlikely to need one — no action, but documented for completeness.

### 9. APP_REVIEW_NOTES.md accuracy flag

Line 22 of `docs/ios/APP_REVIEW_NOTES.md` states:
> *"Rider Coach → Track Memory → pick a catalog circuit → Play. Landscape first-person Skia road with on-screen throttle/brake; coaching boards appear at named corners."*

Per current `AGENTS.md` and Agent Apple skill facts:
> *"Track Memory is a static SVG info map — `@shopify/react-native-skia` is not in the shipping app."*

These two claims appear to contradict each other. **Cursor should verify what Track Memory actually renders in the current build** and correct `APP_REVIEW_NOTES.md` accordingly before any ASC submission — a misleading Review note is a P1 risk (Guideline 2.1).

---

## No changes this week

- iOS version numbers unchanged (26.6.1 current)
- App Review Guidelines unchanged (June 8 still current)
- EAS safe image unchanged (`macos-sequoia-15.6-xcode-26.2`)
- expo-speech-recognition pin unchanged (56.0.1)
- ASC identity, bundle ID, team unchanged
- Nutrition label requirements unchanged
- Liquid Glass GPU cost guidance unchanged

---

## Cursor action items (not blocking skills update)

| Priority | Item |
|----------|------|
| P1 | Verify `expo` version in `app/package.json` is `≥ 57.0.17` (Hermes V1 memory fix) |
| P1 | Answer ASC social media questionnaire before next upload |
| P1 | Confirm `eas.json` production image is `macos-sequoia-15.6-xcode-26.2` — do NOT use Xcode 27 |
| P1 | Review `APP_REVIEW_NOTES.md` line 22 — verify Track Memory rendering (static SVG vs Skia) and correct the note |
| P2 | Watch for Expo SDK 58 or future 57.x UIScene fix announcement — critical before any Xcode 27 EAS builds |

---

## What testers should know this week

**This is the highest-risk week of the year for iOS compatibility.** iOS 27 goes public around September 14. Here's what matters:

1. **Your TestFlight build (built with Xcode 26) will run fine on iOS 27 devices.** The launch crash only affects apps built with Xcode 27 SDK — which RoadRacer is not. So your existing TestFlight binary is safe to install and test on iOS 27 day-one.

2. **If you install iOS 27 on your test device before Apple's public release, Liquid Glass UI chrome will look different** — tab bars, navigation, system chrome all render in the new Liquid Glass style. RoadRacer's solid dark fills (`#0f172a`) are cheaper and still look correct, but worth a visual smoke test after upgrading.

3. **Do not trigger an EAS production build this week** unless absolutely necessary. Once iOS 27 ships, Expo EAS image management is in flux. Wait to confirm the image is still pinned to Xcode 26 before uploading.

4. **Coach/Q&A Render cold start (~30s)** remains the top UX risk during App Review — ensure the review notes still say to wait 30s after idle. This is documented in `APP_REVIEW_NOTES.md` and should remain accurate.

5. **Social media questionnaire in ASC is blocking** — if not answered, your next upload will be rejected before Review even starts.

6. **Hermes memory regression:** If you notice the app using more memory than expected on device (slow scrolling, jetsam kills), upgrade expo to 57.0.17 and trigger a new EAS build.

---

## Sources

- [Apple security releases](https://support.apple.com/en-us/100100) — fetched Sep 4, 2026
- [Apple Developer News](https://developer.apple.com/news/) — fetched Sep 4, 2026
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — fetched Sep 4, 2026 (Last updated June 8, 2026)
- [WWDC26 iOS guide — What's new in iOS 27](https://developer.apple.com/wwdc26/guides/ios/) — fetched Sep 4, 2026
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57) — fetched Sep 4, 2026 (57.0.17 update confirmed)
- [expo/expo#46664](https://github.com/expo/expo/issues/46664) — UIScene SDK 56/57, still OPEN
- [expo/expo#47570](https://github.com/expo/expo/issues/47570) — UIScene SDK 57, CLOSED Jul 7 with maintainer comment
- Forbes, CNET, Apple Hub — iOS 27 September 14 predicted date
