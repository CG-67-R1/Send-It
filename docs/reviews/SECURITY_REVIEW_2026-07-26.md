# Send-It (RoadRace) — Complete Security Review
**Date:** 2026-07-26  
**Reviewer:** Hermes Agent (mobile-app-expert + rr-app-expert)  
**Scope:** Expo mobile app (app/), Node/Express API (api/), secrets management, copyright/IP protection

---

## STATUS: CURSOR ALERT — action required

**P0: 4 | P1: 6 | P2: 8**

---

## Executive Summary

The app has solid foundations (rate-limiting on AI endpoints, SSRF protection on custom RSS URLs, no secrets baked into the app bundle, OpenAI key server-side only). However four P0 issues need immediate attention: the API is fully open to the internet with no authentication, the Express JSON body limit is oversized at 8mb creating a DoS vector, the custom RSS text input has no client-side URL validation before it hits the server, and the deep-link scheme `roadrace://` has no handler validation. Six P1 issues cover weak TLS policy, missing input length caps on AI message fields, unguarded Linking.openURL calls, and a missing Content Security Policy / API key for Sentry. Copyright protection is missing entirely — no license file, no obfuscation policy, no terms of use.

---

## SECTION 1 — VULNERABILITIES (Hacking / Exploit Risk)

---

### P0-1 — API has no authentication — anyone on the internet can use your OpenAI key

**File:** `api/server.js` lines 14–17  
**Evidence:**
```js
app.use(cors());  // wildcard — any origin
// No auth middleware anywhere
app.post('/roadrace-ai/chat', ...);  // calls OpenAI — costs you money
```
The rate limiter (10 req / 15 min) applies per-IP. Anyone who knows your Render URL can hammer `/roadrace-ai/chat` from rotating IPs, burning your OpenAI credits. The `/headlines?refresh=1` bypass also lets attackers trigger unlimited outbound scraping at will.

**Recommended fix for Cursor:**
```js
// api/server.js — add a shared secret header check
const APP_SECRET = process.env.APP_API_SECRET;
function requireAppSecret(req, res, next) {
  if (!APP_SECRET) return next(); // dev: allow if not set
  const h = req.headers['x-app-secret'];
  if (!h || h !== APP_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
app.use('/roadrace-ai', requireAppSecret);
app.use('/headlines/custom', requireAppSecret);
```
In `app/constants/api.ts` add the matching header to all fetch calls via a shared helper. Set `APP_API_SECRET` in Render env vars and `EXPO_PUBLIC_APP_API_SECRET` in the app `.env` (it becomes public in the bundle but stops automated scanning tools and casual abuse; combine with the rate limiter for defence-in-depth).

---

### P0-2 — Express JSON body limit is 8MB — Denial of Service vector

**File:** `api/server.js` line 15  
```js
app.use(express.json({ limit: '8mb' }));
```
A caller can POST ~8MB of JSON to any route, forcing the server to parse it in memory on every request. On Render's free tier this can OOM-kill the process repeatedly.

**Recommended fix for Cursor:**
```js
// Lower global limit; allow larger for attachment routes only
app.use(express.json({ limit: '64kb' }));
// For /roadrace-ai/chat which accepts base64 images:
app.post('/roadrace-ai/chat', express.json({ limit: '8mb' }), roadraceAiLimiter, async (req, res) => { ... });
```

---

### P0-3 — No input length cap on AI message text — prompt injection / cost amplification

**File:** `api/server.js` lines 136, 165  
```js
const text = typeof message === 'string' ? message.trim() : '';
```
There is no maximum length check on the `message` field before it is sent to OpenAI. A 100,000-character prompt costs significant tokens and can be used to extract or confuse the system prompt.

**Recommended fix for Cursor:**
```js
// api/server.js — add after the trim()
const MAX_MSG = 4000; // characters
if (text.length > MAX_MSG) {
  return res.status(400).json({ error: `Message too long (max ${MAX_MSG} chars)` });
}
```
Apply to both `/roadrace-ai/ask` and `/roadrace-ai/chat`. Also add a client-side `maxLength={2000}` on the TextInput in `CoachChatScreen.tsx` and `QAScreen.tsx`.

---

### P0-4 — Unvalidated URLs passed to Linking.openURL — open redirect / phishing

**Files:** `HeadlinesListScreen.tsx:145`, `CalendarScreen.tsx:131`, `QAScreen.tsx:46`  
```ts
Linking.openURL(url).catch(() => { ... });
```
URLs come from the API response (scraped from external RSS feeds). If any scraper fetches a malicious feed containing `javascript:` or `intent:` scheme URLs, those are passed directly to `Linking.openURL`. On Android, `intent:` URIs can launch arbitrary apps or access content providers.

**Recommended fix for Cursor:**
```ts
// app/src/utils/safeOpenUrl.ts  (new file)
import { Alert, Linking } from 'react-native';

const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

export async function safeOpenUrl(url: string): Promise<void> {
  if (!url?.trim()) {
    Alert.alert('Link unavailable', 'This item has no URL.');
    return;
  }
  try {
    const parsed = new URL(url);
    if (!SAFE_SCHEMES.includes(parsed.protocol)) {
      Alert.alert('Unsafe link', 'This link uses an unsupported scheme and was blocked.');
      return;
    }
  } catch {
    Alert.alert('Invalid link', 'Could not open this link.');
    return;
  }
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open link', 'Try again or open the article in your browser.');
  });
}
```
Replace all `Linking.openURL(url)` calls in headlines, calendar, and QA screens with `safeOpenUrl(url)`.

---

### P1-1 — CORS is fully open (wildcard) — no origin restriction

**File:** `api/server.js` line 14  
```js
app.use(cors()); // allows ANY origin
```
For a backend serving only one Expo app, the wildcard CORS header (`Access-Control-Allow-Origin: *`) means any web page can make authenticated requests to your API if cookies are ever introduced.

**Recommended fix for Cursor:**
```js
// Replace app.use(cors()) with:
app.use(cors({
  origin: [
    'https://send-it-ke7r.onrender.com',
    /\.expo\.dev$/,     // Expo dev client
    /localhost/,        // local dev
    /^http:\/\/192\.168\./,
  ],
  methods: ['GET', 'POST'],
}));
```

---

### P1-2 — No HTTPS enforcement / security headers on API

**File:** `api/server.js` — no Helmet, no HSTS  
The API currently sends no security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`). Render provides HTTPS termination, but the app itself doesn't enforce it.

**Recommended fix for Cursor:**
```bash
cd api && npm install helmet
```
```js
// api/server.js
import helmet from 'helmet';
app.use(helmet());
```

---

### P1-3 — No client-side URL validation before submitting custom RSS feed

**File:** `app/src/screens/HeadlinesSettingsScreen.tsx` lines 300–329  
The client sends any string the user types as a custom RSS source URL. Server-side validation exists (`validateCustomSourceUrl` in `scrapers.js`) but errors are surfaced only after the network round-trip, and the error message is generic. A user could also type non-URL garbage.

**Recommended fix for Cursor:**
```ts
// HeadlinesSettingsScreen.tsx — in handleAddCustom, before setAdding(true):
try {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    Alert.alert('Invalid URL', 'Feed URL must start with http:// or https://');
    return;
  }
} catch {
  Alert.alert('Invalid URL', 'Please enter a valid feed URL.');
  return;
}
```

---

### P1-4 — `EXPO_PUBLIC_*` vars are visible in the JS bundle

**File:** `app/.env`  
```
EXPO_PUBLIC_API_URL=https://send-it-ke7r.onrender.com
```
All `EXPO_PUBLIC_` prefixed variables are inlined into the production JS bundle and are trivially readable by anyone who downloads and extracts the APK/IPA. This is by Expo design — it is not a bug — but it means any secret placed in an `EXPO_PUBLIC_` var is exposed. The current `.env` only exposes the API URL (acceptable). **Never add `EXPO_PUBLIC_OPENAI_API_KEY` or any real secret here.**

**Recommended fix for Cursor:** Add a comment block to `app/.env.example`:
```
# WARNING: All EXPO_PUBLIC_ vars are embedded in the JS bundle and readable 
# by anyone who extracts the APK/IPA. Never put secrets here.
# Secrets (OpenAI key, admin passwords) go in api/.env on the server only.
```

---

### P1-5 — Sentry DSN missing — crash monitoring is silently disabled

**File:** `app/App.tsx` lines 252–265, `app/app.json` line 60  
```json
"sentryDsn": "${EXPO_PUBLIC_SENTRY_DSN}"
```
If `EXPO_PUBLIC_SENTRY_DSN` is not set, Sentry silently doesn't load. Crashes and JS exceptions are invisible in production. This is a security monitoring gap — you cannot detect attacks that cause crashes.

**Recommended fix for Cursor:**
Set `EXPO_PUBLIC_SENTRY_DSN` in your Expo/EAS build environment. Add a dev-mode warning:
```ts
// App.tsx — after the if (!dsn) return; line
if (__DEV__) console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash reporting disabled');
```

---

### P1-6 — Attachment MIME type is caller-supplied and not validated

**File:** `api/roadraceAi.js` lines 503–523  
```js
mimeType: String(att.mimeType || 'image/jpeg').slice(0, 80),
```
The server trusts the caller-supplied `mimeType` and passes it directly into the `data:` URL sent to OpenAI. A malicious caller could set `mimeType` to inject unexpected content-type strings.

**Recommended fix for Cursor:**
```js
// api/roadraceAi.js — normalizeAttachments()
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = ['text/plain', 'application/json', 'text/csv', 'text/xml', 'application/gpx+xml'];

// For images:
const mime = ALLOWED_IMAGE_TYPES.includes(att.mimeType) ? att.mimeType : 'image/jpeg';

// For files:
const fmime = ALLOWED_FILE_TYPES.includes(att.mimeType) ? att.mimeType : 'text/plain';
```

---

## SECTION 2 — COPYRIGHT & IP PROTECTION

---

### P0 — No license file — code is unprotected by default

**Evidence:** `ls` of repo root — no `LICENSE` file exists.  
Under international copyright law (Berne Convention), original code is automatically copyrighted by its authors. However without an explicit LICENSE file, no one knows what rights they have (including app store reviewers). More importantly, it does not put competitors on notice.

**Recommended fix for Cursor:**  
Create `LICENSE` in the repo root. Choose one:

Option A — Proprietary (maximum protection, no open source):
```
Copyright (c) 2025-2026 Send-It / RoadRacer. All rights reserved.

This software and its source code are proprietary and confidential.
Unauthorized copying, modification, distribution, or use of this software,
via any medium, is strictly prohibited without prior written permission
from the copyright holder.
```

Option B — Commercial open source (MIT for visibility, but keeps trademark):
Use the MIT License with your name and year, and add a separate `TRADEMARK.md` noting that "RoadRacer", "Send-It", and the logo are registered or unregistered trademarks not covered by the MIT License.

---

### P1 — No Terms of Use / Privacy Policy linked in app

**Evidence:** No `TERMS.md`, `PRIVACY.md`, or in-app links found.  
Google Play and Apple App Store **require** a Privacy Policy URL for any app that accesses camera, microphone, location, or photos (all of which this app does). Submission without one will be rejected. A Terms of Use also protects against misuse claims.

**Recommended fix for Cursor:**
1. Create a Privacy Policy page (can be a simple hosted page on Vercel). Minimum content: what data is collected (location, photos, usage), how it is used (local-only processing, sent to OpenAI for coach queries), and who to contact.
2. Link it from the Onboarding screen before the user accepts.
3. Add `"privacyPolicyUrl": "https://your-domain/privacy"` to `app.json` under `expo.ios` and `expo.android`.

---

### P1 — App bundle not obfuscated — business logic is readable

**Evidence:** Expo default build with no Metro minifier config beyond defaults. Expo bundles can be extracted from APKs and the JS is minified but not obfuscated — variable names are shortened but algorithms, system prompt content, and endpoint paths are readable.

**Recommended fix for Cursor:**
1. Add `hermes` JS engine (already set in `app.json` — good). Hermes bytecode is harder to reverse than plain JS.
2. For the EAS production build, add to `app.json`:
```json
"android": {
  "enableProguardInReleaseBuilds": true,
  "enableShrinkResourcesInReleaseBuilds": true
}
```
3. Move any sensitive business-logic constants (system prompts, scoring rules) into the API layer, not the app bundle.
4. The coach system prompts in `api/roadraceAi.js` are on the server — good. Keep them there.

---

### P2 — Deep-link scheme `roadrace://` has no handler — scheme squatting risk

**File:** `app/app.json` line 27: `"scheme": "roadrace"`  
No deep-link handler is registered in `App.tsx` (no `Linking.addEventListener` or `useURL` hook). The scheme is declared but unused, meaning another app could potentially intercept `roadrace://` links on a device. Additionally, deep links with no validation let phishing sites trigger the app.

**Recommended fix for Cursor:**
Either register a handler that validates incoming URLs before acting on them, or remove the scheme from `app.json` until deep linking is intentionally implemented. If keeping it, add an Android App Links / Apple Universal Links configuration (HTTPS-verified) instead of a bare custom scheme to prevent scheme hijacking.

---

### P2 — System prompts leak coach IP in API source

**File:** `api/roadraceAi.js` lines 7–85  
The coaching personas, pedagogical approach, and knowledge framing are hardcoded as JS strings. They are server-side (not in the app bundle) which is correct. However the GitHub repo is public (or may become public).

**Recommended fix for Cursor:**
Move the system prompt strings out of source into environment variables or a private config file loaded at runtime:
```js
// api/roadraceAi.js
const COACH_SYSTEM = process.env.COACH_SYSTEM_PROMPT || defaultCoachSystem;
```
Store the actual prompts in Render environment variables. This keeps the coaching IP out of source control.

---

### P2 — No app integrity check — repackaging / piracy risk

There is no certificate pinning, no app attestation (Play Integrity API / DeviceCheck), and no runtime check that the app is running from an official store installation. This makes it trivial to repackage the APK, strip branding, and redistribute under a different name.

**Recommended fix for Cursor:**
1. For Android: Integrate the Play Integrity API to verify the app is unmodified and installed from Play Store before enabling AI features.
2. For iOS: Leverage DeviceCheck or App Attest.
3. Shorter term: name/brand watermark in all AI replies ("RoadRacer AI Coach") — already done in system prompts — makes it harder to rebrand undetected.

---

### P2 — `console.error` leaks stack traces to server logs

**File:** `api/server.js` — multiple `console.error(e)` calls  
Full error objects including stack traces are logged to Render's log stream. If Render logs are ever exposed, they could reveal internal file paths, module names, and library versions.

**Recommended fix for Cursor:**
```js
// api/server.js — replace console.error(e) with:
console.error('[headlines] error:', e?.message ?? e);
// Never log the full Error object in production
```

---

## SECTION 3 — WHAT IS ALREADY DONE WELL (do not regress)

- OpenAI API key is server-side only (`api/.env`, never in app bundle) — GOOD
- Rate limiter on `/roadrace-ai` (10 req / 15 min per IP) — GOOD
- SSRF protection on custom RSS URLs (private IP check + DNS resolution check) — GOOD
- Attachment size limits enforced server-side (6MB image, 24KB text) — GOOD
- Attachment count capped at 3 — GOOD
- Chat history sliced to last 20 messages — GOOD
- `app/.env` is in `.gitignore` — GOOD
- No `EXPO_PUBLIC_OPENAI_API_KEY` anywhere — GOOD
- Camera permission restricted to no microphone (`"microphonePermission": false`) — GOOD
- AsyncStorage stores only non-sensitive user preferences (no tokens, no secrets) — GOOD
- Hermes JS engine enabled — makes bundle harder to reverse — GOOD

---

## TOP FIXES FOR CURSOR (ordered by priority)

1. [P0] Add `requireAppSecret` middleware to `/roadrace-ai/*` and `/headlines?refresh=1` — prevents API abuse and OpenAI cost theft
2. [P0] Drop global JSON body limit from `8mb` to `64kb`; only allow `8mb` on the specific attachment route
3. [P0] Add max-length check (4000 chars) on `message` in `/roadrace-ai/ask` and `/roadrace-ai/chat`
4. [P0] Create `safeOpenUrl()` helper and replace all bare `Linking.openURL(url)` calls — blocks `javascript:` / `intent:` injection
5. [P0] Add `LICENSE` file to repo root (proprietary copyright notice)
6. [P1] Add `helmet()` to Express for security headers
7. [P1] Replace `app.use(cors())` with an origin whitelist
8. [P1] Add client-side URL validation in `HeadlinesSettingsScreen` before sending to API
9. [P1] Whitelist allowed MIME types in `normalizeAttachments()` in `roadraceAi.js`
10. [P1] Create Privacy Policy page and link from Onboarding screen (required for App Store / Play Store)
11. [P1] Add `enableProguardInReleaseBuilds: true` to `app.json` android config

---

## Manual Verify on Device

- [ ] Attempt to POST to `/roadrace-ai/chat` from curl without the app — confirm rate limit fires and (after fix) secret header is enforced
- [ ] Try pasting `javascript:alert(1)` as a headline URL — confirm it is blocked after safeOpenUrl fix
- [ ] Try pasting a 10,000 character message in CoachChat — confirm rejection after fix
- [ ] Confirm Privacy Policy link appears before Onboarding completion
- [ ] Confirm APK build has Proguard enabled: `eas build --platform android --profile production`

---

*Report written by Hermes Agent — no files were modified. All fixes listed above are for implementation in Cursor.*
