# Agent Apple — skills refresh 2026-10-30

Mode: weekly-skills. Report only. `app/` and `api/` untouched. No bake.

Previous refresh was 2026-09-04, so this one covers an 8-week gap (iOS 27 GA, Expo SDK 58, guideline update, iPhone Duo).

## What changed in `CURRENT.md`

| Area | Before (2026-09-04) | Now (2026-10-30) | Source |
|------|---------------------|------------------|--------|
| Current iOS | 26.6.1; iOS 27 "imminent" | **iOS 27.2** (26 Oct); 27.1 on iPhone Duo; 26.7.2; 18.7.11 | [Apple security releases](https://support.apple.com/en-us/100100) |
| UIScene / Xcode 27 | Not fixed in any 57.x; community plugin only | **Expo SDK 58 stable (15 Oct)** generates scene delegate. SDK 57 has official `expo-build-properties` `ios.enableSceneSupport: true`. `expo#46664` closed | [Expo SDK 58](https://expo.dev/changelog/sdk-58), [expo/fyi](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md) |
| EAS image | Said `macos-sequoia-15.6-xcode-26.2` is the safe SDK 57 image | **Wrong.** That is the `sdk-55` image. `sdk-57` = `macos-tahoe-26.5-xcode-26.6`; `latest` and `sdk-58` = Xcode 27.1 | [Expo infrastructure](https://docs.expo.dev/build-reference/infrastructure/) |
| App Review Guidelines | June 8, no change | **Oct 16**: new 2.5.19 (hidden/undocumented features, bait-and-switch), new 2.3.14 (creative assets), 1.2 / 3.1.1(a) / 5 clarifications | [Developer News](https://developer.apple.com/news/?id=92th7e5i) |
| ASC SDK floor | Xcode 26 since Apr 2026 | Adds: **April 2027** needs iOS 27 SDK and iPhone Duo screenshots | [Developer News](https://developer.apple.com/news/) (9 Sep, 5 Oct) |
| Agreements | Accept DPLA Attachment 14 | DPLA revised 13 Oct; Taiwan storefront revision 29 Oct (26% from 31 Oct) | Developer News |
| `expo-speech-recognition` | "No 57 package; pin 56.0.1" | **57.0.0, 57.1.0, 57.1.1, 58.0.0, 58.0.1 are published** (`npm view`) | npm registry |
| Expo patch level | 57.0.17 latest | `sdk-57` tag = **57.0.31**; repo installed 57.0.17 | npm registry, `app/node_modules` |
| iOS 27 behaviour | none | Resizable iPhone apps; `ScreenOrientation.lockAsync` may do nothing when built with iOS 27 SDK | Expo SDK 58 notes |
| New hardware | none | iPhone Duo on sale 23 Oct, runs iOS 27.1 | Developer News |
| Changelog | 4 rows | Trimmed to last 8 weeks (2 rows) | n/a |

WWDC26 iOS guide re-read: Foundation Models, App Intents, camera APIs. Nothing new that affects RoadRacer. Coach stays server-side OpenAI.

## Findings for Cursor (none are P0 today)

Config check this run (read-only): `app/eas.json` pins `"image": "sdk-57"` on development, preview, and production. That resolves to Xcode 26.6 / iOS 26 SDK, so the iOS 27 launch crash does **not** apply to the current pipeline. `app/app.json`: `ITSAppUsesNonExemptEncryption: false`, `deploymentTarget 16.4`, `version 1.0.2`.

1. **[P1] Stale review note.** `docs/ios/APP_REVIEW_NOTES.md` lines 26 and 131 say no SDK 57 `expo-speech-recognition` exists. It does (57.1.1, 58.0.1). Under new Guideline 2.5.19 the notes should stay accurate. Recommended fix: reword to "pinned at 56.0.1 by choice; 57.x exists, upgrade after physical-device voice-note test", or upgrade to `57.1.1` and re-test Track Walk / Track Details voice notes plus mic and speech purpose strings.
2. **[P1] Plan the April 2027 iOS 27 SDK requirement.** Recommended fix: pick SDK 58 upgrade (preferred) or `expo-build-properties` `ios.enableSceneSupport: true` on SDK 57 together with a non-`sdk-57` image, TestFlight on iOS 27 and 26.7, before March 2027. Do not switch `eas.json` to `latest` before that.
3. **[P2] Take the SDK 57 patches.** 57.0.17 installed, 57.0.31 available. Recommended fix: `npx expo install --fix` in `app/`, then `npx tsc --noEmit` and `node scripts/mobile-review-preflight.mjs`. Mirror to `android-app/` per dual-tree rule if dependencies are shared in intent.
4. **[P2] Orientation.** Once built with the iOS 27 SDK, `lockAsync` may be ignored. Recommended fix: list screens that call `ScreenOrientation.lockAsync` and check they remain usable when the lock is not honoured.
5. **[P2] Skill facts drift.** Agent Apple SKILL.md facts table says marketing version `1.0.0`; `app.json` is `1.0.2`. Procedure unchanged, so SKILL.md was not rewritten; update the facts row when convenient.
6. **[P2] Account admin (user).** Sign in to developer.apple.com and accept the revised DPLA (13 Oct, 29 Oct) and confirm the ASC social media questionnaire is answered (No).

## Not fetched / limits

- Expo issue `#47570` and the `expo-ios-scene-lifecycle-plugin` repo were not re-fetched; no longer needed now that Expo ships the fix.
- Individual iOS 27.2 CVE pages were not read; the 27.2, 26.7.2, and 18.7.11 dates come from the Apple release table. Pre-submit does not depend on CVE detail.
- `expo.dev/changelog/sdk-58` middle sections were read from the cached page only for breaking changes and iOS items.

## Install

`scripts/install-hermes-skills.ps1` run after this report (result below in the run log).
