# Agent Apple — skills update 2026-08-28

**Mode:** weekly-skills  
**Run by:** Hermes cron (Agent Apple)  
**Sources fetched:** Apple security releases (support.apple.com/100100), Apple Developer News, App Store Review Guidelines, WWDC26 iOS guide, Expo#46664 (GitHub), iOS 27 Beta 7 release notes, Macrumors / Apple Event announcement

---

## Verdict: SKILLS UPDATED

CURRENT.md rewritten at `docs/hermes/skills/send-it/agent-apple/CURRENT.md`.

---

## What changed this week

### 🔴 High priority — act before next submission

#### 1. Apple September 9 event confirmed — iOS 27 GM imminent
Apple officially announced a **"Surprise and Shine"** event on **September 9, 2026**. This is the iPhone 18 / iOS 27 launch. iOS 27 GM + public rollout expected **mid-September 2026**.

- **Impact:** App Store reviewers will begin using iOS 27 very soon after Sep 9.
- **Risk for RoadRacer:** LOW if staying on Xcode 26 EAS image (current approach). HIGH if EAS ever switches to Xcode 27 image before Expo fixes UIScene.
- **Action:** Keep current EAS image. Do not upgrade.

#### 2. Social media questionnaire now mandatory
The ASC age rating social media questionnaire deadline (Sep 7, 2026) has effectively passed. It is now **mandatory for all new submissions and updates**.

- **RoadRacer answer:** No social media capabilities (Track Walk labels are local device-only).
- **Action:** Answer this in ASC *before* the next upload. Failure will block submission processing.

#### 3. Expo#46664 — UIScene fix STILL OPEN, no official merge
As of Aug 28, 2026, `expo/expo#46664` remains open. Assigned to `tsapeta`. No official Expo patch has merged. Multiple community workarounds exist (manual `SceneDelegate` config plugin) but none are officially blessed.

- Third-party apps (e.g. `narrowstacks/dorkroom`) have manually adopted UIScene and documented their approach in PRs #203 and #205 on GitHub.
- If the user ever needs to manually patch (e.g. to build with Xcode 27): add `UIApplicationSceneManifest` to `Info.plist`, move window creation to a SceneDelegate, and forward `Linking.getInitialURL()` from `openURLContexts`.
- **`expo-speech-recognition` pinned at 56.0.1** — no SDK 57 package published. Documented in `APP_REVIEW_NOTES.md`. Do not invent or pin `~57.0.x`.

---

### 🟡 Medium priority — monitor

#### 4. iOS 27 Beta 7 UIKit scene accessory change
Beta 7 release notes: `windowExternalDisplayNonInteractive` scenes no longer offered automatically — use `UIViewController.registerSceneAccessory(_:)`. RoadRacer does not use external display scenes. No action needed, but relevant if external display support is ever added.

#### 5. `ImageCreator` API removed in iOS 27
Apple's `ImageCreator` class (Image Playground) is removed in iOS 27 final — apps using it crash. RoadRacer does not use it; no action needed.

#### 6. Korea age rating — October 2026
From October 2026, two content descriptors shift from "All" to "12+" on the Korean App Store. Also, GRAC override for Korean ratings is now available. RoadRacer is unlikely to be affected (no profanity, crude humor, or suggestive content descriptors). Monitor when submitting updates.

#### 7. EU terms update — October 1, 2026
New Apple Developer Program License Agreement (Attachment 14) terms for EU take effect Oct 1. Core Technology Commission (5%) replaces the per-install fee. RoadRacer has no IAP — no financial impact. Accept the updated agreement in ASC account if not already done.

#### 8. App Store price updates Aug 27
Israel, Indonesia, Morocco, Republic of the Congo storefront prices updated. RoadRacer is free — no action.

#### 9. Sign in with Apple domain change
New SIWA addresses will be issued on `private.icloud.com` instead of `privaterelay.appleid.com`. RoadRacer does not use Sign in with Apple — no action.

---

### ✅ Resolved this week

#### 10. Photos permission string P2 — CLOSED
The photos permission string in `app.json` now correctly reads: *"RoadRacer uses your photos to set your bike photo and rider avatar, add images to Track Walk notes, and attach photos in Coach."* Confirmed in `app.json` line 46. The P2 flag in the previous CURRENT.md is removed.

---

### 📋 No change confirmed

- **iOS version:** Still 26.6.1 (17 Aug 2026) — no new security release since last week.
- **App Store Review Guidelines:** Still June 8, 2026. No material 5.x privacy text change.
- **EAS safe image:** Still `macos-sequoia-15.6-xcode-26.2`.
- **Skia version:** Still 2.6.2 — landscape lock crash risk remains documented.
- **ASC minimum SDK:** Xcode 26 required since Apr 28, 2026 — SDK 57 satisfies this.

---

## What testers should know this week

1. **iOS 27 is dropping mid-September** — if you have TestFlight installed, check that the build still launches cleanly after iOS 27 upgrade. The Xcode 26-built binary should be fine (scene lifecycle not required). But cold-launch after upgrade + Track Memory Play is the highest-risk sequence.

2. **Do not attempt to build with Xcode 27** — Expo's prebuild template still fails to launch on iOS 27 SDK. Stick with the current EAS production build config.

3. **Answer the ASC social media questionnaire** — required before the next upload. Log in to [App Store Connect](https://appstoreconnect.apple.com) → your app → Information → Age Rating → answer social media questions (answer: No).

4. **Render cold start** — Coach/Q&A can take ~30s after idle. This is unchanged but worth re-verifying after any Render deploy. Review Notes already document this.

5. **TestFlight physical device** is still the correct test target. Vercel web is not the Review binary.

---

## Install step

After writing CURRENT.md: run `.\scripts\install-hermes-skills.ps1` to sync to `%LOCALAPPDATA%\hermes\skills\send-it\agent-apple`.
