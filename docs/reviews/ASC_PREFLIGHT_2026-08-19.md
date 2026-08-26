# Agent Apple — ASC preflight 2026-08-19

## Verdict

HOLD

## Executive summary

- P0: 1  |  P1: 3  |  P2: 2
- iOS current (from CURRENT.md, as of 2026-08-19): iOS / iPadOS 26.6.1 (build 23G83, 17 Aug 2026).
  Older devices (iPhone XS/XR/iPad 7th gen) on 18.7.10. EAS Mac fleet: macOS Tahoe 26.6.2.
  iOS 27 / Xcode 27 in beta — UIScene lifecycle required when building against iOS 27 SDK (TN3187).

One P0 blocks submission: APP_REVIEW_NOTES.md says "Track Memory is not in this build" but
Track Memory (TrackMemoryScreen, TrackMemoryRoadView, drawRoadSkia) ships in the binary and
is reachable from TrackMemoryHubScreen. This contradicts the review notes that Apple already
has on file. If Review opens the app and navigates to Track Memory it will see the feature the
notes say does not exist — that is a Guideline 2.1 (Information Needed / inaccurate notes) risk
that can immediately re-trigger the same 2.1 letter. Fix the notes or remove the screen before
submitting.

Three P1s are flaggable but not automatic rejects: a narrow photos purpose string (App Store
5.1.1), expo-speech-recognition version pinned at SDK 56 while the rest of the app is on SDK 57,
and no explicit microphonePermission/NSSpeechRecognitionUsageDescription string in app.json for
the speech path. One P2 is the npm audit high-severity count (tooling-only, no published fix) and
one P2 is the archive size.


## Current iOS / known issues (CURRENT.md 2026-08-19)

- Shipping OS: iOS/iPadOS 26.6.1. Reviewers are typically on the current shipping OS.
- 20+ CVEs in 26.6.1 (WebKit, Kernel, ImageIO, Audio). Keep Expo/RN WebKit on HTTPS only. No
  custom HTML parsers — this app does not have one. OK.
- iOS 27 / Xcode 27 (WWDC26, expected public Sept 2026): UIScene lifecycle required when built
  against the iOS 27 SDK (TN3187, expo#46664). Expo SDK 57 — confirm Expo's iOS template
  includes scene lifecycle before any Xcode 27 native build. Do not bump EAS build image to
  Xcode 27 until Expo confirms SDK 57 compatibility.
- Liquid Glass (iOS 26+): GPU + texture memory cost. This app uses solid #0f172a chrome — no
  glass surface applied to dense text. Good.
- Spotlight indexing background I/O (iOS 26.6 onwards): avoid large file scans at launch.
  tracks.json is read lazily per track — OK. The full track catalog (20 tracks) does not appear
  to be imported in bulk at startup.


## Automated gates

  preflight:    PASS — all preflight checks passed
  TypeScript:   PASS — npx tsc --noEmit clean (zero errors)
  API syntax:   PASS — server.js, qa.js, roadraceAi.js clean
  Track data:   PASS — 20 catalog tracks, 68 verified turn hands, geofences OK
                WARN — 4 planned layouts not in catalog yet (bend_east, bend_west, smp_amaroo,
                       collingrove_hillclimb) — expected, non-blocking
  npm audit:    WARN — app: 0 critical, 10 high, 8 moderate (Metro/image-size tooling; no
                       published fix exists). API: clean.
  Live API:     SKIP — localhost:3001 not running. Use render URL for smoke test.


## Crash and resource risks

### Skia / Track Memory (shipping in binary)

- matchFont: two try/catch blocks in drawRoadSkia.ts — System weight-800 attempted first, falls
  back to bare matchFont. Correct defensive pattern. No white-screen/crash from matchFont throw.
- Paint kit lifecycle: kitsRef disposed in useEffect cleanup with a 1000ms setTimeout delay so
  GPU is no longer using the picture before dispose. PictureRecycler.track() used per frame.
  Both are correct patterns from resources.md.
- Landscape lock sequence: ScreenOrientation.lockAsync(LANDSCAPE) fires, then one rAF await,
  then setOriented(true), then 700ms setForceSurface(true). surfaceReady = oriented && landscape
  && size.w >= 8 && size.h >= 8. Skia Canvas is not mounted until surfaceReady. This is the
  correct guard from the fix committed 2026-08-18.
- rAF loop: useFocusEffect cleanup calls cancelAnimationFrame and nulls rafRef. Portrait lock
  restored on blur. Energy/thermal: rAF stops on screen blur.
- Remaining risk: first-open timing on slower devices (iPhone 11 class). The 700ms
  forceSurface delay is heuristic. If the OS reports landscape before the surface is actually
  rotated, size.w < size.h guard should catch it. Physical device TestFlight test required to
  confirm no first-open crash on Track Memory Play for this build.

### Launch size

- assetBundlePatterns: "**/*" bundles everything. No easignore noted in eas.json. Archive size
  risk (~500 MB mentioned in CURRENT.md). P2.

### Coach photo decode

- Coach, Track Walk, and Import all use ImagePicker. expo-image-picker's allowsEditing and
  no explicit quality/scale cap means full-res camera stills may be decoded into memory.
  resources.md flags this as a silent dirty-memory spike. Not a crash at current scale but
  watch on a long Coach session with multiple attachments. P2 to add quality: 0.7 / resize.

### Network / cold start

- Render API cold start ~30s documented and in review notes. Waiting UI is in the app.
  No crash risk — correct timeout handling pattern expected from AGENTS.md.


## App Review and ASC

### P0 — Review notes vs shipped binary (Guideline 2.1)

APP_REVIEW_NOTES.md line 22: "Track Memory game is not in this build (rebuild in progress)."
TrackMemoryScreen.tsx and TrackMemoryHubScreen exist, build cleanly, and are navigable.
Apple's reviewer navigating to Rider Coach can reach Track Memory. The notes on file say the
feature does not exist. This is the single hardest blocker: a reviewer who has the old 2.1 letter
open will see an immediate contradiction. Either:
  (a) Remove TrackMemoryHubScreen / TrackMemoryScreen from navigation before this submission, or
  (b) Update APP_REVIEW_NOTES.md to accurately describe Track Memory (what it does, landscape
      mode, controls, Skia road renderer) and upload a new build that passes physical-device
      Track Memory Play without crashing.
Option (b) is preferred if the Track Memory crash fix from 2026-08-18 holds on physical device.

### P1 — Photos purpose string too narrow (Guideline 5.1.1)

app.json photosPermission: "RoadRacer uses your photos so you can set a picture of your bike
on the home screen."
ImagePicker is also used in CoachChatScreen (coachAttachments.ts), TrackWalkScreen (walk photos),
ImportTrackNotesScreen, and OnboardingScreen (avatar). Apple 5.1.1 requires the purpose string to
accurately reflect all uses. APP_REVIEW_NOTES.md line 130 already flags this. Requires a new
binary (purpose strings bake into Info.plist at build time).

Recommended fix: update app.json photosPermission to cover all uses, e.g.:
"RoadRacer uses your photos to set your bike photo and avatar, add images to Track Walk notes,
and attach photos in Coach."

### P1 — Speech/microphone purpose strings (Guideline 5.1.1)

expo-camera has microphonePermission: false. However expo-speech-recognition (56.0.1) is a
separate Expo plugin. It injects its own NSMicrophoneUsageDescription and
NSSpeechRecognitionUsageDescription into Info.plist at build time using its own default strings
(typically "Allow microphone access" boilerplate). app.json has no explicit
microphonePermission or speechRecognition config block for expo-speech-recognition.

The use is real (TrackWalkScreen voice notes) but the purpose string in the built IPA may be
the SDK default rather than an accurate app-specific description. Apple can reject under 5.1.1
if the string is not accurate/specific. Requires a new binary to fix.

Recommended fix: add a config plugin block for expo-speech-recognition in app.json with an
explicit microphonePermission string, e.g.:
"RoadRacer uses the microphone to transcribe voice notes in Track Walk."
Also confirm NSSpeechRecognitionUsageDescription is set similarly.

### P1 — expo-speech-recognition version mismatch (SDK 56 vs SDK 57)

expo-speech-recognition is pinned at 56.0.1. The rest of the app is on Expo SDK 57. Expo SDK
peer alignment is not strictly enforced at build but mismatched SDK versions are a known source
of native module incompatibility (stale bindings, missing constants) on physical device.
If the speech module silently fails (getSpeechRecognition() returns null and voice note shows
"voice notes not available" alert), that is acceptable graceful degradation. If it throws a
native exception on device, that is a crash risk in Track Walk.

Recommended fix: npx expo install expo-speech-recognition  (to get the SDK-57-aligned version)
then test voice note on physical device before submitting.

### Privacy nutrition label / Sentry (Guideline 5.1.2)

Sentry DSN is in app.json extra as ${EXPO_PUBLIC_SENTRY_DSN} (env substitution at build).
If the DSN is set in the production build, Sentry collects crash diagnostics. PRIVACY.md and
APP_REVIEW_NOTES.md both mention Sentry. Confirm the nutrition label in ASC includes Sentry
under "Crash Data" / "Diagnostics". No evidence of a mismatch — flagged for manual confirm.

### No accounts, IAP, ATT — confirmed clean

- No account system, no IAP, no ATT prompt. Review notes are accurate for these items.
- ITSAppUsesNonExemptEncryption: false is set in app.json infoPlist — HTTPS-only is exempt.
  ASC Missing Compliance questionnaire should auto-skip on ingestion.
- Location: when-in-use only (locationWhenInUsePermission). No background location. OK.

### supportsTablet: true

app.json: supportsTablet: true. iPad is claimed. APP_REVIEW_NOTES.md says "primary testing is
iPhone". If Review tests on iPad and the UI is broken/unusable, that is a Guideline 4.0 reject.
Manually confirm the app is usable on iPad (or set supportsTablet: false and remove iPad from
supported devices in ASC). P2 — not a block if the UI is acceptable on iPad; confirm before
submitting.

### Privacy policy URL

app.json extra.privacyPolicyUrl: https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/PRIVACY.md
This is a GitHub blob URL. Apple requires a live publicly accessible URL. GitHub blob pages
render but are not styled as a dedicated policy page. This is technically live — it passes the
minimum bar. If Review ever questions it, hosting it on a dedicated URL (GitHub Pages, Vercel)
is more robust. Not a P0/P1 for this submission.


## EAS / ASC pipeline

- eas.json production: autoIncrement: true, credentialsSource: remote, ascAppId: 6799806571.
  Submit profile has ascAppId. Pipeline is correctly configured.
- SENTRY_DISABLE_AUTO_UPLOAD: true in all profiles — Sentry source maps not uploaded. Crash
  reports will lack symbolication. Acceptable for initial review; P2 to enable for production.
- EAS Submit has had iOS upload hang issues (CURRENT.md). A submit in queue is not Processing
  until ASC accepts the IPA. Monitor EAS dashboard after submit.
- Do not submit until Track Memory P0 is resolved (review notes vs binary) and physical device
  Track Memory Play is verified crash-free.


## Recommended Cursor fixes

1. [P0] APP_REVIEW_NOTES.md says Track Memory is not in this build but the screen ships in the
   binary. Update APP_REVIEW_NOTES.md to accurately describe Track Memory (landscape Skia road
   renderer, controls) AND upload a new production build after verifying Track Memory Play does
   not crash on a physical iPhone (TestFlight). Do not submit until this is done.
   Recommended fix: edit docs/ios/APP_REVIEW_NOTES.md line 22 — replace the "not in this build"
   note with a description of what Track Memory is, how to reach it (Rider Coach → Track Memory
   → pick a track → Play), and what it does. Confirm the build tested in the recording matches
   the submitted binary.

2. [P1] Photos purpose string is narrow — only mentions bike photo.
   Recommended fix: in app/app.json, update expo-image-picker photosPermission:
   "RoadRacer uses your photos to set your bike photo and rider avatar, add images to Track Walk
   notes, and attach photos in Coach." Requires new binary.

3. [P1] expo-speech-recognition SDK mismatch (56.0.1 vs SDK 57) and no explicit microphone
   purpose string for speech recognition use.
   Recommended fix: cd app && npx expo install expo-speech-recognition. Also add a config entry
   for expo-speech-recognition in app.json with an explicit microphonePermission string covering
   voice notes. Requires new binary.

4. [P2] supportsTablet: true — test on iPad or change to false.
   Recommended fix: manually test on iPad simulator. If layout is broken, set supportsTablet:
   false in app.json and update ASC device support accordingly.

5. [P2] Coach / Track Walk photos: no resize/quality cap on ImagePicker.
   Recommended fix: add quality: 0.7 and exif: false to all launchImageLibraryAsync /
   launchCameraAsync calls. Reduces dirty-memory spike on multi-attachment Coach sessions.


## Manual verify on TestFlight (physical iPhone)

- [ ] Cold launch from Home Screen — no crash, splash resolves cleanly
- [ ] Track Memory: Rider Coach -> Track Memory Hub -> pick a track -> Play
      Verify landscape lock, road renders, controls respond, no jetsam on iPhone 11-class device
- [ ] Track Walk voice note — microphone permission prompt appears with accurate string
- [ ] Coach photo attach — photos permission prompt (check string covers coach use)
- [ ] Calendar add reminder — permission prompt appears
- [ ] Location enable in Settings — when-in-use prompt
- [ ] Camera avatar — permission prompt with accurate string
- [ ] Denied-path for each permission — app degrades gracefully, no crash
- [ ] Coach / Q&A after Render cold start (~30s) — waiting UI shown, reply arrives
- [ ] Settings -> Your data & privacy — Privacy Policy URL opens, Delete local data works
- [ ] iPad: basic layout check (if supportsTablet: true stays)


## Out of scope

- Android and Vercel web — not the Review binary
- Xcode Instruments profiling (requires Mac) — use TestFlight crash reports from Organizer
- ASC metadata changes (pricing, age rating, nutrition answers) — manual step
- Uploading or submitting the IPA — manual step after HOLD items resolved
