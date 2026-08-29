# RoadRacer — Android (Play) product

This folder is the **Android-only** Expo app. It is a full copy of the product in `app/`, not a shared tree. Fixes here do not change Vercel web or the iOS EAS app.

| Item | Value |
|------|--------|
| Display name | RoadRacer - Motorsport_Is_Life |
| Package | `com.milroadracer.app` |
| Target / compile SDK | **36** (Play requirement from 31 Aug 2026) |
| Min SDK | 24 (Android 7) |
| Native project | committed `android/` (Gradle) |
| API | `https://send-it-ke7r.onrender.com` (same Render backend as `app/`) |

**Do not verify this app on Vercel.** Vercel still serves the web build from `app/`. Install an EAS or Play Internal binary on a **physical Android phone**.

## Dual-tree rule

Play Android is owned by `android-app/`. After `app.json` plugin or Gradle-affecting changes, re-run:

```powershell
npx expo prebuild --platform android --no-install
```

Do not symlink `../app` or `../packs`. Bundled packs live in `src/packs/bundled/`. Copying a logic fix back to `app/` is a separate, explicit request.

## Local

```powershell
cd android-app
npm install
npx tsc --noEmit
npx expo start --android
```

- **Emulator + local API:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001` (see `.env.example`)
- **Physical device:** default production API; no local `npm start` required
- **Native run** (needs Android SDK / emulator or device): `npx expo run:android`

## Android Studio (debug / test)

Studio is for **emulator, USB device, and APK Analyzer**. Play-shaped binaries still come from **EAS** (preview APK / production AAB). Do not commit `android/local.properties` (SDK path).

1. Install [Android Studio](https://developer.android.com/studio). In **SDK Manager**: **Android SDK 36**, Build-Tools, Platform-Tools (`adb`), and a Google APIs emulator image (x86_64 or ARM matching this PC).
2. JDK **17** — Studio’s bundled JBR is enough. If Gradle cannot find the SDK, set `ANDROID_HOME` to the Sdk folder Studio shows (usually `%LOCALAPPDATA%\Android\Sdk`).
3. Open the **native** project [`android/`](android/) in Android Studio, **or** from this folder run `npx expo run:android` (Metro + Gradle).
4. First run: emulator **or** USB debugging. Then the physical-device checklist below.
5. On a release/preview APK or AAB, use **APK Analyzer**: confirm **targetSdk 36** and **16 KB ELF** alignment on native `.so` files.

Play listing / Data safety paste pack: [`docs/play/PLAY_LISTING_COPY.md`](../docs/play/PLAY_LISTING_COPY.md). Console how-to: [`docs/play/PLAY_CONSOLE_SETUP.md`](../docs/play/PLAY_CONSOLE_SETUP.md).

## EAS / Play

From `android-app/`:

```powershell
# Internal / sideload APK
npx eas-cli@latest build -p android --profile preview --non-interactive --no-wait

# Play AAB (versionCode auto-increments on EAS)
npx eas-cli@latest build -p android --profile production --non-interactive --no-wait
```

`eas.json` has **no** `submit.production.android` yet (no Play service-account JSON in the repo). Do not invent a Play app id. Wire submit later, then Internal testing → Closed → Production.

Confirm each AAB: **targetSdk 36**, 16 KB ELF alignment on native `.so` (APK Analyzer). Release minify/shrink is on; R8 keep rules cover Skia, Reanimated, Worklets, and Sentry (`android/app/proguard-rules.pro`).

## Physical-device checklist

- [ ] Cold launch against the production API
- [ ] Track Memory: lock landscape, one circuit, no first-open crash
- [ ] Camera / photos / calendar / location / notifications **denied** paths
- [ ] Coach / Q&A after Render cold start (~30s)
