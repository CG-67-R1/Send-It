# Agent Play — Play Console (RoadRacer)

Operational map for this app. Confirm live status in [Play Console](https://play.google.com/console) when the user asks; do not invent processing times or a Play app id.

## Identity

| Field | Value |
|-------|--------|
| App | RoadRacer - Motorsport_Is_Life |
| Package | `com.milroadracer.app` |
| Play app id | **Not in repo** — do not invent |
| Expo | [motorsport-is-life/roadracer](https://expo.dev/accounts/motorsport-is-life) |
| Privacy / Terms | `docs/legal/PRIVACY.md`, `docs/legal/TERMS.md` — also linked from `android-app/app.json` extra |
| iOS listing copy (reuse facts, not screenshots) | `docs/ios/ASC_LISTING_COPY.md` |
| Play listing / Data safety paste | [`docs/play/PLAY_LISTING_COPY.md`](../../../../play/PLAY_LISTING_COPY.md) |
| Play Console how-to | [`docs/play/PLAY_CONSOLE_SETUP.md`](../../../../play/PLAY_CONSOLE_SETUP.md) |
| Signing | Expect EAS-managed Android upload keystore (remote). No `google-services.json` in repo |
| Product root | **`android-app/`** — not `app/` |

## Pipeline (EAS → Play)

**As of 2026-08-29 submit is still incomplete.** Build from `android-app/eas.json`. `app/eas.json` `submit.production` is **iOS only**. `android-app/eas.json` has **no** `submit` block.

```
android-app/eas.json production (autoIncrement versionCode)
  → EAS Build Android AAB (EAS-managed upload keystore)
  → Manual Play Console upload  ← eas submit NOT CONFIGURED
  → Play Console (Internal testing → Closed → Production)
```

Build commands (from `android-app/`):

```powershell
npx eas-cli@latest build -p android --profile preview --non-interactive --no-wait
npx eas-cli@latest build -p android --profile production --non-interactive --no-wait
```

Intended command once submit is wired (still from **`android-app/`**, not `app/`):

```powershell
npx eas-cli@latest build -p android --profile production --auto-submit --non-interactive --no-wait
```

Until `submit.production.android` exists (package, service-account JSON on EAS, track), Agent Play flags **P1 pipeline gap** and **HOLD** for production if the user asked to ship to Play production. Internal testing via manual AAB upload is OK.

## Versioning

- **Marketing version** `1.0.0` until the user says to bump.
- **versionCode** — EAS remote `appVersionSource` + `autoIncrement`. Never reuse.
- Testers install the **new** internal-track build, not an old APK sideload.

## Policy hits for this product

| Topic | What Play expects | RoadRacer |
|-------|-------------------|-----------|
| User Data / privacy policy | URL in listing + in-app | Settings → Your data & privacy |
| Data safety | SDKs and permissions declared | OpenAI (Coach/Q&A), Sentry if enabled, location, photos; no ads |
| Photo/Video | Picker / selected access | `expo-image-picker` — flag broad gallery permission |
| Notifications 13+ | Runtime prompt | `expo-notifications` |
| Location | Foreground only unless justified | When-in-use for track arrival; **no** background |
| Payments | Declare IAP | None — listing must not imply paid unlocks |
| Account deletion | If accounts exist | **No accounts** — local delete is the analog |
| Content rating | IARC questionnaire | Complete before production |
| Target API | API 36 from 31 Aug 2026 | Pinned in `android-app/app.json` + Gradle; verify AAB |
| 16 KB pages | Aligned native libs | Skia/Reanimated/Sentry `.so` |

Contact: `projectapex@outlook.com.au`. Demo: **No account required**.

## What Agent Play does **not** do unless asked

- Create a Play Console app or service account
- Fill Data safety / content rating in the Console
- Upload an AAB or promote a track
- Add `submit.production.android` to `android-app/eas.json` (that is a **Cursor** fix when the user wants the pipeline)

## States to report

| Play state | Meaning |
|------------|---------|
| Draft | Listing incomplete |
| Internal testing | Analog of TestFlight internal |
| Closed / Open testing | Wider testers |
| Production / In review | Store review |
| Rejected | Policy email; do not guess the clause |
| Unpublished | Not serving users |

Flag **HOLD** if Track Memory still crashes on Play, if `eas.json` cannot submit Android, or if Data safety contradicts `PRIVACY.md`.
