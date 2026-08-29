# Play Console setup (RoadRacer)

How-to for creating the Google Play app and Internal testing. Paste-ready listing and Data safety answers live in [`PLAY_LISTING_COPY.md`](PLAY_LISTING_COPY.md).

**Do not invent a Play app id.** When Console assigns one, record it here and in [`ENVIRONMENT.md`](../../ENVIRONMENT.md).

## Preconditions

- Google Play Developer account (one-time registration).
- Package **`com.milroadracer.app`** — must match [`android-app/app.json`](../../android-app/app.json).
- Privacy policy live: `https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/PRIVACY.md`
- Signed **AAB** from EAS production (`cd android-app` then `npx eas-cli@latest build -p android --profile production`).

`eas submit` is **not** wired. Upload the AAB in Play Console (or add a service-account JSON later and then `submit.production.android`).

## Create the app

1. [Play Console](https://play.google.com/console) → **Create app**.
2. App name: **RoadRacer - Motorsport_Is_Life**
3. Default language: **English (Australia)**
4. App or game: **App**
5. Free. Declare no ads.
6. Complete declarations (policy, US export, news / content — see listing copy).

## First binary

1. **Release** → **Testing** → **Internal testing** → create a release.
2. Upload the EAS **production AAB** (not the preview APK). Preview APK is for sideload / Expo only.
3. Confirm Play Console shows **target API 36**.
4. Add testers by email. They install from the Internal testing link, not Vercel.

## After Internal

Closed testing → Production only after Agent Play `PLAY_PREFLIGHT_*.md` is **SUBMIT** (no P0) and a physical device has passed the [`android-app/README.md`](../../android-app/README.md) checklist.

## Local vs store

| Path | Use |
|------|-----|
| Android Studio / `npx expo run:android` | Debug on emulator or USB |
| EAS `preview` APK | Sideload on a phone |
| EAS `production` AAB | Play Internal / store |
| Vercel | Web only — **not** the Android binary |
