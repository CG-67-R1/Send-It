# Apple Developer setup — RoadRacer

Professional path for Certificates, Identifiers & Profiles + EAS-managed signing.

## Seller / developer name

**Do not** create a Development provisioning profile named after yourself and treat that as the public developer name.

| Concept | Correct value |
|--------|----------------|
| Public seller name | Apple Developer Program membership entity (Individual = legal name, Organization = company) |
| App display name | RoadRacer - Motorsport_Is_Life |
| Bundle ID | `com.milroadracer.app` (matches [`app/app.json`](../../app/app.json)) |
| Profile names | `RoadRacer Development` / `RoadRacer App Store` (purpose labels only) |

Confirm membership: [developer.apple.com/account](https://developer.apple.com/account) → Membership details.

**Confirmed for this project (2026-08-10):**

| Field | Value |
|--------|--------|
| Team ID | `UAWP5NV4NQ` |
| Program | Apple Developer Program |
| Enrolled as | **Individual** |

Public seller/developer name on the App Store will be your **legal name**, not “RoadRacer”. To show a company/brand as seller later, transfer or re-enroll as an Organization (D-U-N-S). App display name can still be RoadRacer.

## Expo account (confirmed)

| Item | Value |
|------|--------|
| Expo account | [motorsport-is-life](https://expo.dev/accounts/motorsport-is-life) |
| EAS project | `@motorsport-is-life/roadracer` (`c3447188-53ab-4806-96af-6eb1b5417de3`) |
| App Store Connect | Connected in Expo (use EAS-managed credentials) |
| Apple Team ID | `UAWP5NV4NQ` |

### Progress

| Step | Status |
|------|--------|
| Membership (Individual, Team `UAWP5NV4NQ`) | Done |
| Expo account [motorsport-is-life](https://expo.dev/accounts/motorsport-is-life) + ASC connected | Done |
| App ID `com.milroadracer.app` | Done (`MZM4TP7H87`, Push on) |
| ASC app **RoadRacer - Motorsport_Is_Life** | Done (Apple ID `6799806571`, SKU `roadracer-ios-001`) |
| EAS Distribution cert + App Store profile | Done |
| EAS iOS production build | Queued / in progress — check Expo builds |

### What to do next

**Generate signing credentials interactively** (required once; non-interactive build cannot create the first Distribution cert):

```powershell
cd C:\Users\Administrator\.cursor\Send-It\app
npx eas-cli@latest build -p ios --profile production --no-wait
```

When prompted:
- Use **remote / EAS-managed** credentials
- Team **UAWP5NV4NQ**
- Bundle ID **com.milroadracer.app**
- Allow EAS to create the **Apple Distribution** certificate and **App Store** provisioning profile

After the build succeeds, use **TestFlight** in App Store Connect for testers.

### App Store listing fields

Paste-ready Description, Keywords, Privacy URL, category, content rights, and screenshot sizes: [`ASC_LISTING_COPY.md`](ASC_LISTING_COPY.md).

## Automated registration (preferred)

### 1. Create an App Store Connect API key

1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** → **App Store Connect API**.
2. **+** generate a key with **Admin** (or App Manager + access to Certificates) role.
3. Download `AuthKey_<KEYID>.p8` once. Store outside git (e.g. `C:\Users\Administrator\.secrets\apple\`).
4. Note **Issuer ID** and **Key ID**.

### 2. Set env (PowerShell, current session)

```powershell
$env:ASC_API_KEY_ID = 'XXXXXXXXXX'
$env:ASC_API_ISSUER_ID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
$env:ASC_API_KEY_PATH = 'C:\Users\Administrator\.secrets\apple\AuthKey_XXXXXXXXXX.p8'
# Optional Expo token for non-interactive EAS:
# $env:EXPO_TOKEN = '...'
```

### 3. Register Bundle ID + ASC app

```powershell
cd C:\Users\Administrator\.cursor\Send-It
node scripts/register-apple-app.mjs
```

This writes [`apple-setup-status.json`](apple-setup-status.json) and ensures:

- Explicit App ID `com.milroadracer.app`
- **Push Notifications** capability
- App Store Connect app **RoadRacer** (SKU `roadracer-ios-001`, locale `en-AU`)

### 4. EAS-managed Distribution cert + App Store profile

```powershell
# Maps ASC_API_* → EXPO_ASC_* automatically in the script
node scripts/setup-eas-ios-credentials.mjs
```

Or manually from `app/`:

```powershell
cd app
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest credentials -p ios
# Choose: Let EAS manage / remote credentials for App Store distribution
```

Do **not** hand-create Distribution certificates on Windows unless you have a Mac Keychain workflow. EAS remote credentials is the best practice for this Expo app.

## Manual portal checklist (if not using the script)

1. Membership type noted (Individual vs Organization).
2. Identifiers → App IDs → Explicit `com.milroadracer.app` → enable Push Notifications.
3. App Store Connect → New App → iOS → RoadRacer → that Bundle ID → SKU `roadracer-ios-001`.
4. Skip manual Profiles if using EAS Manage; otherwise create **App Store** profile `RoadRacer App Store` only.
5. Use TestFlight for testers (no Ad Hoc unless required).

## Secrets

Never commit `.p8`, `.p12`, or provisioning profiles. See repo `.gitignore` (`AuthKey_*.p8`, `*.p8`, `apple-credentials.env`).
