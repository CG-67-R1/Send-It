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

Debug builds on an **Android emulator** call `http://10.0.2.2:3001` (this PC’s API). Start the API first, then install onto a **running** AVD. Do not use Vercel to verify Android.

**Terminal 1 — API** (from repo root)

```powershell
.\scripts\start-local-api.ps1
```

**Terminal 2 — emulator** (from repo root; start the AVD in Android Studio Device Manager first)

```powershell
.\android-app\scripts\run-on-emulator.ps1
```

Or by hand:

```powershell
cd android-app
npm install
npx tsc --noEmit
# JAVA_HOME = Android Studio JBR if `java` is missing from PATH
npx expo run:android
```

- **Emulator + local API:** automatic in `__DEV__` (`http://10.0.2.2:3001`). Override with `.env` if needed (see `.env.example`).
- **Physical device:** default production API; no local `npm start` required.
- Set user `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr` so Gradle works outside Studio. JDK 24+ also needs `JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED` (the run script sets this) so CMake/NdkLocator does not fail.

## Android Studio (debug / test)

Studio is for **emulator, USB device, and APK Analyzer**. Play-shaped binaries still come from **EAS** (preview APK / production AAB). Do not commit `android/local.properties` (SDK path).

1. Install [Android Studio](https://developer.android.com/studio). In **SDK Manager**: **Android SDK 36**, Build-Tools, Platform-Tools (`adb`), and a Google APIs / Play Store emulator image (x86_64 or ARM matching this PC).
2. JDK — Studio’s bundled JBR (this machine: OpenJDK 25 under `...\Android Studio\jbr`). Set **user** `JAVA_HOME` to that folder and add `%JAVA_HOME%\bin` to PATH. If Gradle cannot find the SDK, set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk`.
3. Device Manager: start the AVD from **Android Studio** and leave that window open. **Pixel_10_Pro** works when `adb devices` shows `device`. If install fails with `Can't find service: package`, use **Cold Boot Now**, or start the lighter **RR_API36** AVD (Pixel 6, API 36). Confirm `adb shell service check package` prints `Service package: found`.
4. Open the **native** project [`android/`](android/) and use Run, **or** `.\android-app\scripts\run-on-emulator.ps1` from the repo root (Metro + Gradle). The script waits for the package manager. Start the AVD in Studio first.
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
- [ ] Track Details: open a circuit map, tap a corner
- [ ] Camera / photos / calendar / location / notifications **denied** paths
- [ ] Coach / Q&A after Render cold start (~30s)
