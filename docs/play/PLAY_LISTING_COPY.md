# Play Console — listing copy (en-AU)

Paste-ready values for **RoadRacer - Motorsport_Is_Life** (`com.milroadracer.app`). Setup steps: [`PLAY_CONSOLE_SETUP.md`](PLAY_CONSOLE_SETUP.md). Facts match [`docs/ios/ASC_LISTING_COPY.md`](../ios/ASC_LISTING_COPY.md) and [`docs/legal/PRIVACY.md`](../legal/PRIVACY.md).

**Play app id:** not in the repo. Do not invent one.

`eas.json` has **no** `submit.production.android`. Upload AABs in Console until a service-account JSON is added on purpose.

## Store listing

| Field | Value |
|--------|--------|
| App name | RoadRacer - Motorsport_Is_Life |
| Short description (80 chars max) | Motorcycle racing news, calendar, track walk, and AI coach — setups stay on device. |
| Application type | App |
| Category | **Sports** (secondary optional: **News**) |
| Tags | motorcycle, racing, motogp, track day (stay accurate; no trademark stuffing) |
| Email | `projectapex@outlook.com.au` |
| Phone | (your mobile with country code, e.g. +61…) |
| Website | `https://github.com/CG-67-R1/Send-It` |
| Privacy policy | `https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/PRIVACY.md` |
| Terms | `https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/TERMS.md` |

### Full description

```
RoadRacer is your motorcycle road-racing companion — news, calendar, track notes, and AI coaching in one place.

Stay across MotoGP, WorldSBK, and more with a headlines feed you can prioritise. Check the race calendar, walk the track with notes and photos, and keep Day Setup Sheets and bike balance tools on your device.

Ask the Rider Coach or Bike Setup AI for practical guidance, or use Q&A and trivia to sharpen your knowledge. Your profile, avatar, setups, and track notes stay private on your device. AI chats you send go to the RoadRacer API and may be processed by OpenAI; chat history is not kept on our server after the reply.

Built for track-day riders and race fans who live motorsport.
```

No accounts. No in-app purchases. No ads. Demo account: **not required**.

## Data safety

Complete the form to match reality. When unsure, match [`PRIVACY.md`](../legal/PRIVACY.md) and in-app **Profile & settings → Your data & privacy**.

| Question | Answer |
|----------|--------|
| Collects user data? | **Yes** (see types below). No RoadRacer account. |
| Data encrypted in transit? | **Yes** (HTTPS/TLS). |
| Users can request deletion? | Local data: in-app delete all local data. We do not keep a server-side account to delete. |
| Data used to track users? | **No**. |
| Data sold? | **No**. |
| Ads / advertising ID? | **No**. |

### Data types (approximate Play labels)

Declare only what the binary actually does. If a feature is off in a given build, do not declare it.

| Type | Collected? | Shared? | Purpose | Notes |
|------|------------|---------|---------|--------|
| Approximate / precise location | Optional | No | App functionality | Foreground / when-in-use for track arrival. Not a travel-history account. **No** background location. |
| Photos | Optional | No (unless user sends in Coach) | App functionality | Bike photo, avatar face, Track Walk, Coach attachments. Use photo picker; do not claim broad gallery scrape. |
| Camera video/photos | Optional | Same as photos | App functionality | Avatar face / attachments. Microphone for camera is disabled. |
| Audio (microphone) | Optional | No | App functionality | Speech-to-text for Track Walk notes **if** the binary still requests it. [`android-app/app.json`](../../android-app/app.json) **blocks** `RECORD_AUDIO` — if the Play merged manifest has no mic permission, **do not** declare microphone. |
| Calendar | Optional | No | App functionality | Add race events when the user chooses. |
| Crash logs / diagnostics | Optional | Shared with Sentry **if** `EXPO_PUBLIC_SENTRY_DSN` is in the store build | Analytics / diagnostics | No Coach bodies. If DSN is unset, **do not** declare crash reporting. |
| Other user content (chat) | Yes when user sends Coach / Q&A | Processed by OpenAI via RoadRacer API | App functionality | Not retained on our server after the reply. |
| Device or other IDs | Only if Sentry is on | See Sentry | Diagnostics | Do not declare advertising ID. |

App info in [`android-app/app.json`](../../android-app/app.json) `extra`: privacy and terms URLs.

## Permissions (declare vs blocked)

Intended Play-facing permissions (when-in-use / runtime prompts):

- Internet
- Notifications (`POST_NOTIFICATIONS`)
- Camera (avatar)
- Photos / selected media (picker)
- Fine/coarse location (track arrival; no background, no FGS location)
- Calendar read/write (add events)

Explicitly **blocked** in `app.json` (must not appear as required features):

- `RECORD_AUDIO`
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION`

If APK Analyzer still shows `SYSTEM_ALERT_WINDOW`, treat as a **P1** for Agent Play / Cursor (likely a dependency; remove if unused).

## Content rating (IARC)

Complete the questionnaire honestly. Typical answers for this app:

- No user-to-user chat inside the app (Coach is AI, not a social network)
- No gambling, no unrestricted web browser as the core product (headlines open publisher sites)
- Mild competition / motorsport themes
- News aggregation of third-party articles (open on publisher sites)

Do not guess the final age rating; submit IARC and use what it returns.

## Target API and 16 KB pages

New apps and updates need **target API 36** from **31 Aug 2026**. [`android-app/app.json`](../../android-app/app.json) pins compile/target **36**. After each AAB:

1. Play Console / APK Analyzer: **targetSdk 36**
2. Native `.so` **16 KB ELF** alignment (Skia, Reanimated, Sentry)

## Contact / review notes

| Field | Value |
|--------|--------|
| Email | `projectapex@outlook.com.au` |
| Demo | No login |
| Notes | Physical device: cold launch, Track Memory landscape, permission denied paths, Coach after Render cold start (~30s). |

Build from `android-app/` (not `app/`):

```powershell
cd C:\Users\Administrator\.cursor\Send-It\android-app
npx eas-cli@latest build -p android --profile production --non-interactive --no-wait
```

Screenshots: capture on a phone or emulator at Play phone sizes. Do not reuse iPad/Watch ASC assets. iOS listing facts (description text) may be reused; screenshot files may not.
