# Agent Apple — skills refresh 2026-11-06

Mode: weekly-skills. Report only. `app/` and `api/` untouched. No bake.

Previous refresh: 2026-10-30. This is a one-week delta.

## What changed in `CURRENT.md`

| Area | Before (2026-10-30) | Now (2026-11-06) | Source |
|------|---------------------|------------------|--------|
| Current iOS | 27.2 (26 Oct) | **Unchanged.** Apple's page (dated 30 Oct) lists nothing newer. Added **Xcode 27.2** (29 Oct) | [Apple security releases](https://support.apple.com/en-us/100100) |
| Betas | none | **iOS/iPadOS/macOS 27.3 beta** and Xcode 27.3 beta (3 Nov). Not on tester phones | [Developer News](https://developer.apple.com/news/?id=6gpufove) |
| ASC age ratings | Social media questionnaire only | **New descriptors from 16 Nov 2026: Shared Location, Dating and Relationships.** Required with any update or age-rating change; mandatory for all apps by **12 Jan 2027** | [Developer News](https://developer.apple.com/news/?id=yxkh08us) |
| App Review Guidelines | Updated 16 Oct | **Unchanged** (still "Last Updated: October 16, 2026") | [Guidelines](https://developer.apple.com/app-store/review/guidelines/) |
| Other news | n/a | Siri AI Developer Preview via App Intents (27.3 beta, 3 Nov; not in EU). Retention messages for subscriptions (4 Nov). Neither applies to RoadRacer | Developer News |
| WWDC26 iOS guide | Read | Re-read: Foundation Models, App Intents, Core AI, camera. No change for RoadRacer | [iOS guide](https://developer.apple.com/wwdc26/guides/ios/) |
| Expo SDK 57 / Xcode 27 | Opt-in via `enableSceneSupport` | Added the minimum versions: **`expo` 57.0.23+** and `expo-build-properties` 57.0.20+. `sdk-57` tag now **57.0.32**; `latest` = 58.0.23 | npm registry, [expo#46664](https://github.com/expo/expo/issues/46664) |
| EAS images | sdk-57 = Xcode 26.6; latest/sdk-58 = Xcode 27.1 | **Unchanged.** `macos-tahoe-26.6-xcode-27.0` also listed. No Xcode 27.2 image yet | [Expo infrastructure](https://docs.expo.dev/build-reference/infrastructure/) |
| Repo facts | `expo` 57.0.17 installed | `app/package.json` now `expo ~57.0.31`, installed 57.0.31. Patch lag closed. No `ScreenOrientation.lockAsync` calls in `app/` source | repo read-only check |
| Changelog | 2 rows | 2 rows (09-04 row aged out) | n/a |

Dismissed items (`docs/reviews/README.md`) were removed from watch-outs: the `expo-speech-recognition` review-notes wording and the April 2027 upgrade plan. The April 2027 SDK and iPhone Duo screenshot rule stays as an Apple fact only, with no recommendation attached.

## Findings for Cursor

No P0 or P1.

1. **[P2] Skill facts drift.** Agent Apple `SKILL.md` facts table still says marketing version `1.0.0`; `app.json` is `1.0.2`. Procedure unchanged, so `SKILL.md` was not rewritten.
2. **[P2] ASC answers for the next upload.** From 16 Nov, answer Shared Location = No and Dating and Relationships = No (RoadRacer shares no location and has no dating). No code change. If `docs/ios/ASC_LISTING_COPY.md` lists the age-rating questionnaire, add those two answers.

Config checked read-only: `app/eas.json` image `sdk-57` on all three profiles (Xcode 26.6, safe); `app.json` has no `enableSceneSupport` (correct for that image); `ITSAppUsesNonExemptEncryption: false`.

## Not fetched / limits

- Individual iOS 27.2 CVE pages not read. Dates come from the release table.
- Expo SDK 58 changelog not re-read; unchanged since 30 Oct.
- No new Expo/RN issue for Xcode 27.2 was found. Not exhaustively searched.

## Install

`scripts/install-hermes-skills.ps1` run after this report (see run log in the final reply).
