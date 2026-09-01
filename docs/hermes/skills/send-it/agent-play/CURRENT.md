# Agent Play — current Android / Play knowledge

**As of:** 2026-08-19  
**Owner:** weekly-skills mode rewrites this file. Do not leave stale versions in SKILL.md.

## Shipping OS (devices testers actually run)

| Line | Version | Notes |
|------|---------|--------|
| **Play target API (new apps + updates)** | **Android 16 / API 36** from **31 Aug 2026** | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878) |
| Expo SDK 57 compile/target | **36 / 36** | [Expo versions](https://docs.expo.dev/versions/latest/) — Android 7+ min |
| Security bulletin | **August 2026** (patch 2026-08-05) | [AOSP bulletin](https://source.android.com/docs/security/bulletin/2026/2026-08-01) |
| This repo `expo-build-properties` | iOS `deploymentTarget` 16.4 only | Android targetSdk is **not** pinned in `app.json`; rely on SDK 57 default 36 and **verify the AAB** |

RoadRacer first Play upload is a **new app**: after 31 Aug 2026 it **must** target API 36. SDK 57 already does if Gradle is unmodified.

## Issues that matter for apps

- **16 KB page size:** Apps targeting API 35+ must ship 16 KB-aligned 64-bit `.so` files. Play stops accepting non-compliant **updates** from **1 Feb 2027**. Skia, Reanimated, and Sentry are native — test on a 16 KB emulator/device. [Android page-sizes](https://developer.android.com/guide/practices/page-sizes).
- **Edge-to-edge / predictive back** (API 35+): RN/Expo chrome can draw under status/nav bars or swallow back. Flag broken insets or unexpected exit on back.
- **Photo picker / selected photos (13+ / 14+):** prefer the system picker over broad `READ_MEDIA_IMAGES`.
- **POST_NOTIFICATIONS** (13+): must prompt; do not silently fail Priority 1 news.
- **Foreground services:** any FGS needs an explicit type; this app should not need a location FGS (when-in-use only).

## Next / watch

- Do not claim on-device Gemini / Play AI features; Coach is **server OpenAI**.
- Android 16 behaviour changes (edge-to-edge, larger screens) — screenshots for Play should be taken on a current Pixel-class device, not an old API 33 emulator.

## Expo / EAS watch-outs (this repo)

- Track Memory is a static SVG info map — `@shopify/react-native-skia` is **not** in the shipping Android app. Do not flag Skia paint-kit / landscape Activity recreate crashes for this feature.
- `expo-screen-orientation` landscape lock on Track Memory — wait until the surface is landscape before mounting Skia Canvas.
- `enableProguardInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds` are on — confirm Skia JNI is not stripped (`-keep` if Play crash is `UnsatisfiedLinkError`).
- Physical device API: `https://send-it-ke7r.onrender.com`. Emulator-only `10.0.2.2` is **not** the Play binary.
- Archive size ~500 MB without `.easignore` — slows EAS; P2, not a policy reject.
- **`eas.json` has no Android submit block** — Play upload is not wired like iOS `ascAppId`.

## Play Console (stable rules, confirm weekly)

- Privacy policy required in **store listing and in-app**.
- **Data safety** must include OpenAI (Coach/Q&A) and Sentry if the DSN is in the binary; location and photos if those permissions ship.
- No ads, no IAP — listing must not imply paid unlocks.
- Content rating questionnaire before production.
- Internal testing track is the analog of TestFlight; production requires a completed store listing.

## Changelog

| Date | Change |
|------|--------|
| 2026-08-19 | Initial CURRENT.md: API 36 from 31 Aug 2026, 16 KB / 1 Feb 2027, August bulletin, eas.json Android submit gap. |
