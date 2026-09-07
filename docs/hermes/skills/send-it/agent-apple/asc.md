# Agent Apple — App Store Connect (RoadRacer)

Operational map for this app. Confirm live status in [App Store Connect](https://appstoreconnect.apple.com) when the user asks; do not invent processing times.

## Identity

| Field | Value |
|-------|--------|
| App | RoadRacer - Motorsport_Is_Life |
| Bundle ID | `com.milroadracer.app` (App ID `MZM4TP7H87`, Push on) |
| Apple ID (ASC) | `6799806571` |
| SKU | `roadracer-ios-001` |
| Team | `UAWP5NV4NQ` — Individual (seller name = legal name) |
| Expo | [motorsport-is-life/roadracer](https://expo.dev/accounts/motorsport-is-life) |
| Privacy / Terms | `docs/legal/PRIVACY.md`, `docs/legal/TERMS.md` — also linked from `app.json` extra |
| Listing copy | `docs/ios/ASC_LISTING_COPY.md` |
| Review notes | `docs/ios/APP_REVIEW_NOTES.md` |
| Signing setup | `docs/ios/APPLE_DEVELOPER_SETUP.md` |

## Pipeline (EAS → ASC)

```
eas.json production (autoIncrement buildNumber)
  → EAS Build iOS (remote credentials, App Store profile)
  → EAS Submit (ascAppId 6799806571, API key on EAS)
  → ASC Processing
  → TestFlight (internal / external)
  → Submit for Review (version 1.0.0)
```

Commands (from `app/`):

```powershell
npx eas-cli@latest build -p ios --profile production --auto-submit --non-interactive --no-wait
```

Submit profile already has `submit.production.ios.ascAppId`. `--auto-submit` schedules submit **after** the build; Expo outages can hang the IPA upload.

**Missing Compliance** = export encryption questionnaire. This app sets `ITSAppUsesNonExemptEncryption: false` in `app.json` so ASC should skip it. If a build sits on Missing Compliance, the key did not land in the IPA.

## Versioning

- **Marketing version** `1.0.0` until the user says to bump (current Review thread is 1.0.0).
- **CFBundleVersion / buildNumber** — EAS remote `appVersionSource` + `autoIncrement`. Never reuse a build number.
- TestFlight install **the new build**, not an old 10 while 11 is processing.

## Review realities (Guideline hits for this product)

| Topic | What Apple expects | RoadRacer |
|-------|--------------------|-----------|
| 2.1 Information Needed | Working binary + recording from **device Home Screen** | Physical TestFlight; not Vercel |
| 5.1.1 Privacy policy | URL in ASC + in-app | Settings → Your data & privacy |
| 5.1.1 Purpose strings | Accurate, specific | Camera, photos, calendar, location, speech in `app.json` |
| 5.1.2 Data use | Nutrition Label matches SDKs | OpenAI (Coach/Q&A), Sentry if enabled, no ads |
| 3.1 Payments | No hidden IAP | None — listing must not imply paid unlocks |
| 5.1.2 Tracking | ATT only if tracking | **No ATT** |
| Account deletion | If accounts exist | **No accounts** — say so in notes; local delete is the analog |
| 4.0 Design / iPad | `supportsTablet: true` | Spot-check iPad or uncheck tablet |
| 2.5.4 Location | Background only if justified | When-in-use for track arrival |

Demo account field: **No account required**. Contact: `projectapex@outlook.com.au`.

## What Agent Apple does **not** do unless asked

- Click Submit for Review in ASC
- Change pricing, age rating, or nutrition answers
- Create certificates (EAS-managed; do not hand-make Distribution certs on Windows)

## States to report

| ASC state | Meaning |
|-----------|---------|
| Processing | Apple is ingesting the IPA (can take minutes–hours) |
| Missing Compliance | Encryption questions |
| Ready to Submit / Waiting for Review | Build selectable for the version |
| In Review | Human / automated review |
| Rejected / Metadata Rejected | Read Resolution Center; update `APP_REVIEW_NOTES.md` if 2.1 |
| Pending Developer Release | Approved, waiting for manual release |

Flag **HOLD** if the TestFlight build still crashes before Track Memory opens, or if review notes contradict shipped features.
