#!/usr/bin/env node
/**
 * Pull 1.0.0 back from Pending Developer Release (build 14), expire that
 * TestFlight build, attach build 26, update review notes, submit for review.
 *
 * Uses the same EAS-stored ASC API key eas-cli already uses. Never prints secrets.
 *
 *   node scripts/asc-ship-100.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_DIR = path.join(ROOT, 'docs', 'ios', 'screenshots');

const APP_ID = '6799806571';
const ACCOUNT = 'motorsport-is-life';
const WANT_BUILD = '26';
const EXPIRE_BUILD = '14';
const ASC = 'https://api.appstoreconnect.apple.com';
const EXPO_GQL = 'https://api.expo.dev/graphql';

const REVIEW_NOTES = `RoadRacer — App Review notes (version 1.0.0, build 26)

1) SCREEN RECORDING
No account registration, login, or account deletion — there is no user account.
No paid content, IAP, or subscriptions.
No App Tracking Transparency prompt — the app does not track users.
User-created track notes and photos are stored only on the device. The Track Walk Private/Team/Community control is a local label only; sessions are not published to other users. There is no public feed, so there is no content reporting or blocking UI.
If a previous Resolution Center reply included a physical-device recording, use that path: launch from Home Screen, then onboarding/Home, Settings, Events, Rider Coach (Track Walk + AI Coach + Track Details), Bike Setup, Q&A, and permission prompts as they appear.

2) DEVICES AND OS TESTED BEFORE SUBMISSION
Physical iPhone via TestFlight. Minimum iOS: 16.4. iPad is supported (same binary); primary testing is iPhone.
This submission attaches build 26 (Track Details with numbered turns and tap-to-zoom). Build 14 is no longer the review binary.

3) WHAT THE APP DOES AND WHO IT IS FOR
RoadRacer is a motorcycle road-racing companion for track-day riders, club racers, and fans.
It solves scattered prep: circuit study from real GPS traces, a race calendar, on-device track notes and setup sheets, and optional AI coaching.
Target audience: adults interested in motorcycle road racing (not children). Informational only — not professional race or mechanical advice.

4) HOW TO ACCESS MAIN FEATURES (NO LOGIN)
- No demo account. Open the app; complete or skip through onboarding (any bike/rider names; choose Track days or Race).
- Home: identity (bike photo/avatar) and shortcuts. Settings is reached from Home.
- Events: race calendar. Add reminder uses the device calendar (permission).
- Rider Coach: RR AI Coach, Track Prep/Walk, Track Details. Needs network for AI. Track Details is on-device: pick a circuit to see a zoomable map drawn from its GPS trace, numbered turns, a red suggested racing line where we have one, and matching notes. Tap a number to zoom that corner. Not a game and not multiplayer. The line is a suggestion only and no lap times are modelled for riders.
- Bike Setup: Bike Setup AI, Day Setup Sheet, Bike Balance (local). Needs network for AI only.
- Q & A: Ask, Official rule check, Trivia, FAQs. Needs network for Ask/rules.
- Settings → track arrival: optional foreground location near a known circuit.
- Settings → Your data & privacy: export/delete local data; Privacy Policy and Terms.
If AI is slow after idle, wait ~30s for the API to wake (Render). Privacy: https://github.com/CG-67-R1/Send-It/blob/main/docs/legal/PRIVACY.md

5) EXTERNAL SERVICES
- RoadRacer API (Render): https://send-it-ke7r.onrender.com — calendar, Q&A, Coach/Bike Setup proxy
- OpenAI — AI replies; chat is not kept on our server after the response
- Sentry — crash diagnostics only if configured in the build
- Apple: calendar, camera, photos, location, speech recognition as the user enables them
No authentication provider. No payment processor.

6) REGIONAL DIFFERENCES
Same features worldwide. Bundled content packs are Australia and United Kingdom (calendar series, track catalogs). No geo-locked paid features. Primary listing locale: English (Australia).

7) REGULATED INDUSTRY / PROTECTED MATERIAL
Not a regulated industry (not finance, health, gambling, or legal practice).
Not official championship software. Series names are used for identification only.
Circuit maps are drawn from GPS traces of the layouts; ASBK lap records are cited with their source.
Coach, Bike Setup, and Official rule check are informational aids, not a licensed rule book substitute. The suggested racing line is a suggestion, not instruction.
No extra credentials to attach.
There is no News feature and no social media feed.`;

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signAscJwt({ keyId, issuerId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 12 * 60, aud: 'appstoreconnect-v1' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const sig = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(sig)}`;
}

function expoAuthHeaders() {
  if (process.env.EXPO_TOKEN?.trim()) {
    return { authorization: `Bearer ${process.env.EXPO_TOKEN.trim()}` };
  }
  const statePath = path.join(os.homedir(), '.expo', 'state.json');
  const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const auth = raw.auth ?? raw;
  if (auth.accessToken) return { authorization: `Bearer ${auth.accessToken}` };
  if (auth.sessionSecret) return { 'expo-session': auth.sessionSecret };
  throw new Error('No Expo session. Run npx eas-cli login from app/.');
}

async function expoGql(query, variables) {
  const res = await fetch(EXPO_GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...expoAuthHeaders() },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Expo GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  return json.data;
}

async function loadAscKey() {
  const listed = await expoGql(
    `query Keys($accountName: String!) {
      account {
        byName(accountName: $accountName) {
          appStoreConnectApiKeysPaginated(first: 20) {
            edges { node { id keyIdentifier name } }
          }
        }
      }
    }`,
    { accountName: ACCOUNT },
  );
  const edges = listed.account?.byName?.appStoreConnectApiKeysPaginated?.edges ?? [];
  const match =
    edges.find((e) => e.node.keyIdentifier === 'GN85FV4P74') ??
    edges[0];
  if (!match) throw new Error('No App Store Connect API key on the Expo account.');
  console.log(`Using EAS ASC key ${match.node.keyIdentifier} (${match.node.name})`);
  const full = await expoGql(
    `query Key($ascApiKeyId: ID!) {
      appStoreConnectApiKey { byId(id: $ascApiKeyId) { issuerIdentifier keyIdentifier keyP8 } }
    }`,
    { ascApiKeyId: match.node.id },
  );
  const key = full.appStoreConnectApiKey?.byId;
  if (!key?.keyP8 || !key.issuerIdentifier || !key.keyIdentifier) {
    throw new Error('EAS did not return a usable ASC API key.');
  }
  return {
    keyId: key.keyIdentifier,
    issuerId: key.issuerIdentifier,
    privateKeyPem: key.keyP8.includes('BEGIN')
      ? key.keyP8
      : `-----BEGIN PRIVATE KEY-----\n${key.keyP8}\n-----END PRIVATE KEY-----`,
  };
}

async function asc(token, method, urlPath, body) {
  const res = await fetch(`${ASC}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    const err =
      json?.errors
        ?.map((e) => {
          const assoc = e.meta?.associatedErrors
            ? ` assoc=${JSON.stringify(e.meta.associatedErrors).slice(0, 800)}`
            : '';
          return `${e.code}: ${e.detail || e.title}${assoc}`;
        })
        .join(' | ') || text.slice(0, 800);
    throw new Error(`${method} ${urlPath} → ${res.status} ${err}`);
  }
  return json;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function latestIosVersion(token) {
  const json = await asc(
    token,
    'GET',
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5&include=build,appStoreVersionSubmission`,
  );
  const version = json.data?.[0];
  if (!version) throw new Error('No iOS App Store version found.');
  const buildRel = version.relationships?.build?.data?.id;
  const includedBuild = json.included?.find((i) => i.type === 'builds' && i.id === buildRel);
  const submission = json.included?.find((i) => i.type === 'appStoreVersionSubmissions');
  return {
    version,
    state: version.attributes.appStoreState || version.attributes.appVersionState,
    versionString: version.attributes.versionString,
    attachedBuild: includedBuild?.attributes?.version ?? null,
    submission,
  };
}

async function rejectPending(token, versionId, submission) {
  if (submission?.id && submission.attributes?.canReject !== false) {
    try {
      await asc(token, 'DELETE', `/v1/appStoreVersionSubmissions/${submission.id}`);
      console.log('Removed version from review (legacy submission).');
      return;
    } catch (err) {
      console.log(`Legacy reject failed: ${err.message}`);
    }
  }
  const subs = await asc(
    token,
    'GET',
    `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=10`,
  );
  const open = (subs.data ?? []).filter((s) =>
    ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES', 'READY_FOR_REVIEW'].includes(
      s.attributes?.state,
    ),
  );
  for (const sub of open) {
    try {
      await asc(token, 'PATCH', `/v1/reviewSubmissions/${sub.id}`, {
        data: { type: 'reviewSubmissions', id: sub.id, attributes: { canceled: true } },
      });
      console.log(`Canceled review submission ${sub.id} (${sub.attributes.state}).`);
      return;
    } catch (err) {
      console.log(`Cancel ${sub.id} failed: ${err.message}`);
    }
  }
  // Pending Developer Release sometimes only yields via a new review-submission cancel.
  const items = await asc(
    token,
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionSubmission`,
  ).catch(() => null);
  const subId = items?.data?.id;
  if (subId) {
    await asc(token, 'DELETE', `/v1/appStoreVersionSubmissions/${subId}`);
    console.log('Removed version from review via version relationship.');
    return;
  }
  throw new Error('Could not pull 1.0.0 back from Pending Developer Release via API.');
}

async function expireBuild(token, version) {
  const json = await asc(
    token,
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&filter[version]=${version}&limit=5`,
  );
  const builds = json.data ?? [];
  if (!builds.length) {
    console.log(`No ASC build ${version} to expire.`);
    return;
  }
  for (const b of builds) {
    if (b.attributes.expired) {
      console.log(`Build ${version} (${b.id}) already expired.`);
      continue;
    }
    await asc(token, 'PATCH', `/v1/builds/${b.id}`, {
      data: { type: 'builds', id: b.id, attributes: { expired: true } },
    });
    console.log(`Expired TestFlight build ${version} (${b.id}).`);
  }
}

async function waitForBuild(token, version, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const json = await asc(
      token,
      'GET',
      `/v1/builds?filter[app]=${APP_ID}&filter[version]=${version}&limit=5`,
    );
    const ready = (json.data ?? []).find(
      (b) =>
        b.attributes.processingState === 'VALID' &&
        b.attributes.expired !== true,
    );
    if (ready) return ready;
    const state = json.data?.[0]?.attributes?.processingState ?? 'missing';
    console.log(`Build ${version} is ${state}; waiting 30s (${i + 1}/${tries})…`);
    await sleep(30_000);
  }
  throw new Error(`Build ${version} did not become VALID in time.`);
}

async function attachBuild(token, versionId, buildId) {
  await asc(token, 'PATCH', `/v1/appStoreVersions/${versionId}`, {
    data: {
      type: 'appStoreVersions',
      id: versionId,
      relationships: { build: { data: { type: 'builds', id: buildId } } },
    },
  });
  console.log(`Attached build ${WANT_BUILD} to 1.0.0.`);
}

async function setSocialMediaNo(token, versionId) {
  try {
    const decl = await asc(token, 'GET', `/v1/appStoreVersions/${versionId}/ageRatingDeclaration`);
    const id = decl.data?.id;
    if (!id) return;
    await asc(token, 'PATCH', `/v1/ageRatingDeclarations/${id}`, {
      data: {
        type: 'ageRatingDeclarations',
        id,
        attributes: { socialMedia: false, socialMediaAgeRestricted: false },
      },
    });
    console.log('Age rating: social media = No.');
  } catch (err) {
    console.log(`Social-media questionnaire: ${err.message}`);
    const infos = await asc(token, 'GET', `/v1/apps/${APP_ID}/appInfos?include=ageRatingDeclaration&limit=5`);
    const age = infos.included?.find((i) => i.type === 'ageRatingDeclarations');
    if (!age) return;
    await asc(token, 'PATCH', `/v1/ageRatingDeclarations/${age.id}`, {
      data: {
        type: 'ageRatingDeclarations',
        id: age.id,
        attributes: { socialMedia: false, socialMediaAgeRestricted: false },
      },
    });
    console.log('Age rating (app info): social media = No.');
  }
}

async function updateReviewDetail(token, versionId) {
  let detail = await asc(token, 'GET', `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`).catch(
    () => null,
  );
  const existing = detail?.data;
  const attributes = {
    contactFirstName: existing?.attributes?.contactFirstName || 'Christopher',
    contactLastName: existing?.attributes?.contactLastName || 'Greene',
    contactEmail: 'projectapex@outlook.com.au',
    demoAccountRequired: false,
    notes: REVIEW_NOTES,
  };
  if (existing?.attributes?.contactPhone) {
    attributes.contactPhone = existing.attributes.contactPhone;
  }
  if (!existing) {
    await asc(token, 'POST', '/v1/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes,
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
      },
    });
    console.log('Created App Review notes.');
    return;
  }
  await asc(token, 'PATCH', `/v1/appStoreReviewDetails/${existing.id}`, {
    data: { type: 'appStoreReviewDetails', id: existing.id, attributes },
  });
  console.log('Updated App Review notes (kept existing review phone).');
}

async function screenshotFilesFor(displayType) {
  if (displayType === 'APP_IPHONE_65') {
    return [
      path.join(SHOT_DIR, 'iphone-6.5', 'asc-iphone65-02-track.png'),
      path.join(SHOT_DIR, 'iphone-6.5', 'asc-iphone65-03-setup.png'),
      path.join(SHOT_DIR, 'iphone-6.5', 'asc-iphone65-04-tyre.png'),
    ];
  }
  if (displayType === 'APP_IPAD_PRO_3GEN_129') {
    return [
      path.join(SHOT_DIR, 'ipad-13', 'asc-ipad13-02-track.png'),
      path.join(SHOT_DIR, 'ipad-13', 'asc-ipad13-03-setup.png'),
      path.join(SHOT_DIR, 'ipad-13', 'asc-ipad13-04-tyre.png'),
    ];
  }
  return [];
}

async function uploadScreenshot(token, setId, filePath) {
  const buf = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const reserved = await asc(token, 'POST', '/v1/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName, fileSize: buf.length },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
    },
  });
  const shotId = reserved.data.id;
  const ops = reserved.data.attributes.uploadOperations ?? [];
  for (const op of ops) {
    const start = op.offset ?? 0;
    const chunk = buf.subarray(start, start + (op.length ?? buf.length));
    const headers = {};
    for (const [k, v] of Object.entries(op.requestHeaders ?? {})) headers[k] = v;
    const put = await fetch(op.url, { method: op.method || 'PUT', headers, body: chunk });
    if (!put.ok) {
      throw new Error(`Upload ${fileName} → ${put.status} ${await put.text().then((t) => t.slice(0, 200))}`);
    }
  }
  const checksum = crypto.createHash('md5').update(buf).digest('hex');
  await asc(token, 'PATCH', `/v1/appScreenshots/${shotId}`, {
    data: {
      type: 'appScreenshots',
      id: shotId,
      attributes: { uploaded: true, sourceFileChecksum: checksum },
    },
  });
  console.log(`Uploaded ${fileName}`);
}

async function replaceNewsScreenshots(token, versionId) {
  const locs = await asc(
    token,
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  const au = (locs.data ?? []).find((l) => l.attributes.locale === 'en-AU') ?? locs.data?.[0];
  if (!au) return;
  const sets = await asc(
    token,
    'GET',
    `/v1/appStoreVersionLocalizations/${au.id}/appScreenshotSets?include=appScreenshots`,
  );
  const dropTypes = new Set(['APP_WATCH_ULTRA', 'IMESSAGE_APP_IPHONE_65']);
  for (const set of sets.data ?? []) {
    const type = set.attributes.screenshotDisplayType;
    const existing = await asc(token, 'GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`);
    const shots = existing.data ?? [];
    if (dropTypes.has(type)) {
      for (const shot of shots) {
        await asc(token, 'DELETE', `/v1/appScreenshots/${shot.id}`).catch(() => {});
      }
      await asc(token, 'DELETE', `/v1/appScreenshotSets/${set.id}`);
      console.log(`Removed unused screenshot set ${type}.`);
      continue;
    }
    const files = await screenshotFilesFor(type);
    if (!files.length) continue;
    if (shots.length >= 3) {
      console.log(`${type} already has ${shots.length} screenshot(s).`);
      continue;
    }
    for (const shot of shots) {
      await asc(token, 'DELETE', `/v1/appScreenshots/${shot.id}`);
    }
    for (const file of files) {
      if (!fs.existsSync(file)) throw new Error(`Missing screenshot ${file}`);
      await uploadScreenshot(token, set.id, file);
    }
    for (let i = 0; i < 12; i++) {
      const check = await asc(token, 'GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`);
      const states = (check.data ?? []).map((s) => s.attributes.assetDeliveryState?.state);
      if (states.length >= 3 && states.every((s) => s === 'COMPLETE')) {
        console.log(`${type} screenshots ready.`);
        break;
      }
      console.log(`${type} processing ${states.join(', ') || 'empty'}; waiting 15s…`);
      await sleep(15_000);
    }
  }
}

const LOCALE_COPY = {
  'en-AU': {
    description:
      'RoadRacer is your motorcycle road-racing companion — circuit study, race calendar, track notes, and AI coaching in one place.\n\nLearn a circuit before you ride it. Track Details draws each layout from its real GPS trace, at the true width of the road, with numbered turns and a suggested racing line. Tap a turn to zoom that corner. The list below uses the same numbers and holds your own notes. Walk the track with typed or spoken notes and photos, then send them straight to your coach.\n\nCheck the race calendar and add reminders to your own calendar. Keep Day Setup Sheets, bike balance, gearing, and tyre-wear notes on your device. Ask the Rider Coach or Bike Setup AI for practical guidance pitched at how you actually ride, or use Q&A and trivia to sharpen your knowledge.\n\nYour profile, avatar, setups, and track notes stay private on your device. AI chats you send go to the RoadRacer API and may be processed by OpenAI; chat history is not kept on our server after the reply.\n\nEverything here is informational: the suggested line is a suggestion, not instruction, and we do not model lap times for you.\n\nBuilt for track-day riders and race fans who live motorsport.',
    keywords: 'motorcycle,racing,motogp,superbike,track day,bike setup,coach,calendar',
    promotionalText:
      'GPS circuit maps, calendar, track walk, and AI coach for motorcycle road racing — setups stay on your device.',
    supportUrl: 'https://github.com/CG-67-R1/Send-It',
    marketingUrl: 'https://send-it-cg-67-r1s-projects.vercel.app/promo',
  },
  'en-GB': {
    description:
      'RoadRacer is your motorcycle road-racing companion — circuit study, race calendar, track notes, and AI coaching in one place.\n\nLearn a circuit before you ride it. Track Details draws each layout from its real GPS trace, at the true width of the road, with numbered turns and a suggested racing line. Tap a turn to zoom that corner. The list below uses the same numbers and holds your own notes. Walk Brands Hatch, Donington, Cadwell and more with typed or spoken notes and photos, then send them straight to your coach.\n\nCheck the race calendar and add reminders to your own calendar. Keep Day Setup Sheets, bike balance, gearing, and tyre-wear notes on your device. Ask the Rider Coach or Bike Setup AI for practical guidance for UK track days and club racing, or use Q&A and trivia to sharpen your knowledge.\n\nYour profile, avatar, setups, and track notes stay private on your device. AI chats you send go to the RoadRacer API and may be processed by OpenAI; chat history is not kept on our server after the reply.\n\nEverything here is informational: the suggested line is a suggestion, not instruction, and we do not model lap times for you.\n\nBuilt for UK track-day riders and club racers who live motorsport.',
    keywords: 'motorcycle,racing,BSB,superbike,track day,bike setup,coach,calendar',
    promotionalText:
      'GPS circuit maps, BSB calendar, UK track walk, and AI coach for motorcycle road racing — setups stay on your device.',
    supportUrl: 'https://github.com/CG-67-R1/Send-It',
    marketingUrl: 'https://send-it-cg-67-r1s-projects.vercel.app/promo',
  },
};

async function fillLocalizations(token, versionId) {
  const locs = await asc(
    token,
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  for (const loc of locs.data ?? []) {
    const copy = LOCALE_COPY[loc.attributes.locale];
    if (!copy) continue;
    if (loc.attributes.description && loc.attributes.keywords) {
      console.log(`Locale ${loc.attributes.locale} already has description and keywords.`);
      continue;
    }
    await asc(token, 'PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: copy },
    });
    console.log(`Filled ${loc.attributes.locale} listing copy.`);
  }
}

async function diagnose(token, versionId) {
  const locs = await asc(
    token,
    'GET',
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
  );
  for (const loc of locs.data ?? []) {
    const a = loc.attributes;
    console.log(
      `Locale ${a.locale} id=${loc.id} desc=${a.description ? a.description.length : 0}c keywords=${a.keywords ? 'yes' : 'NO'} support=${a.supportUrl || 'NO'} promo=${a.promotionalText ? 'yes' : 'no'}`,
    );
  }
  for (const loc of locs.data ?? []) {
    const sets = await asc(
      token,
      'GET',
      `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?include=appScreenshots`,
    );
    const counts = {};
    for (const set of sets.data ?? []) {
      const type = set.attributes.screenshotDisplayType;
      const shots = (sets.included ?? []).filter(
        (s) => s.type === 'appScreenshots' && s.relationships?.appScreenshotSet?.data?.id === set.id,
      );
      counts[type] = shots.map((s) => `${s.attributes.fileName || s.id}:${s.attributes.assetDeliveryState?.state || '?'}`);
    }
    console.log(`Screenshots ${loc.attributes.locale}: ${JSON.stringify(counts)}`);
  }
  const subs = await asc(
    token,
    'GET',
    `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=8`,
  );
  for (const s of subs.data ?? []) {
    console.log(`ReviewSubmission ${s.id} state=${s.attributes.state} submitted=${s.attributes.submitted}`);
  }
}

async function submitForReview(token, versionId) {
  try {
    const existing = await asc(
      token,
      'GET',
      `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=8`,
    );
    const open = (existing.data ?? []).find((s) =>
      ['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES'].includes(s.attributes?.state),
    );
    let subId = open?.id;
    if (!subId) {
      const created = await asc(token, 'POST', '/v1/reviewSubmissions', {
        data: {
          type: 'reviewSubmissions',
          attributes: { platform: 'IOS' },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      });
      subId = created.data.id;
    } else {
      console.log(`Reusing review submission ${subId} (${open.attributes.state}).`);
    }
    try {
      await asc(token, 'POST', '/v1/reviewSubmissionItems', {
        data: {
          type: 'reviewSubmissionItems',
          relationships: {
            reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
            appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
          },
        },
      });
    } catch (err) {
      if (!/409|already|exists|ENTITY_ERROR/i.test(err.message)) throw err;
      console.log(`Review item already on submission: ${err.message}`);
    }
    await asc(token, 'PATCH', `/v1/reviewSubmissions/${subId}`, {
      data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } },
    });
    console.log(`Submitted 1.0.0 for review (review submission ${subId}).`);
    return;
  } catch (err) {
    console.log(`Modern review submission failed: ${err.message}`);
  }
  await asc(token, 'POST', '/v1/appStoreVersionSubmissions', {
    data: {
      type: 'appStoreVersionSubmissions',
      relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
    },
  });
  console.log('Submitted 1.0.0 for review (legacy submission).');
}

async function main() {
  if (REVIEW_NOTES.length > 4000) {
    throw new Error(`Review notes are ${REVIEW_NOTES.length} chars (max 4000).`);
  }
  const creds = await loadAscKey();
  let token = signAscJwt(creds);

  let snap = await latestIosVersion(token);
  console.log(
    `Version ${snap.versionString} state=${snap.state} attachedBuild=${snap.attachedBuild ?? 'none'}`,
  );
  if (process.argv.includes('--diagnose-only')) {
    await diagnose(token, snap.version.id);
    return;
  }
  if (process.argv.includes('--cancel-only')) {
    const cancelable = [
      'PENDING_DEVELOPER_RELEASE',
      'WAITING_FOR_REVIEW',
      'IN_REVIEW',
      'PENDING_APPLE_RELEASE',
      'WAITING_FOR_EXPORT_COMPLIANCE',
      'READY_FOR_REVIEW',
    ];
    if (!cancelable.includes(snap.state)) {
      console.log(`State ${snap.state} — nothing to cancel.`);
      await diagnose(token, snap.version.id);
      return;
    }
    await rejectPending(token, snap.version.id, snap.submission);
    await sleep(4000);
    token = signAscJwt(creds);
    snap = await latestIosVersion(token);
    console.log(`After cancel: state=${snap.state} attachedBuild=${snap.attachedBuild ?? 'none'}`);
    await diagnose(token, snap.version.id);
    return;
  }

  const locked = [
    'PENDING_DEVELOPER_RELEASE',
    'WAITING_FOR_REVIEW',
    'IN_REVIEW',
    'PENDING_APPLE_RELEASE',
    'WAITING_FOR_EXPORT_COMPLIANCE',
  ];
  if (locked.includes(snap.state)) {
    await rejectPending(token, snap.version.id, snap.submission);
    await sleep(4000);
    token = signAscJwt(creds);
    snap = await latestIosVersion(token);
    console.log(`After pull-back: state=${snap.state} attachedBuild=${snap.attachedBuild ?? 'none'}`);
  }

  token = signAscJwt(creds);
  await expireBuild(token, EXPIRE_BUILD);
  await setSocialMediaNo(token, snap.version.id);
  await fillLocalizations(token, snap.version.id);
  await updateReviewDetail(token, snap.version.id);
  await replaceNewsScreenshots(token, snap.version.id);

  await asc(token, 'PATCH', `/v1/appStoreVersions/${snap.version.id}`, {
    data: {
      type: 'appStoreVersions',
      id: snap.version.id,
      attributes: { copyright: '2026 Christopher Craig Greene', releaseType: 'MANUAL' },
    },
  });
  console.log('Set copyright and manual release.');

  const ready = await waitForBuild(token, WANT_BUILD);
  if (snap.attachedBuild !== WANT_BUILD) {
    token = signAscJwt(creds);
    await attachBuild(token, snap.version.id, ready.id);
  } else {
    console.log(`Build ${WANT_BUILD} already attached.`);
  }

  if (process.argv.includes('--diagnose') || process.argv.includes('--no-submit')) {
    await diagnose(token, snap.version.id);
  }
  if (process.argv.includes('--no-submit')) {
    console.log('Stopped before Submit for Review (--no-submit). Push listing, then rerun without the flag.');
    return;
  }

  token = signAscJwt(creds);
  snap = await latestIosVersion(token);
  const submittable = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'READY_FOR_REVIEW'];
  if (!submittable.includes(snap.state) && snap.state !== 'WAITING_FOR_REVIEW') {
    console.log(`State ${snap.state} — attempting submit anyway.`);
  }
  if (snap.state === 'WAITING_FOR_REVIEW' || snap.state === 'IN_REVIEW') {
    console.log(`Already ${snap.state}; not submitting again.`);
    return;
  }
  await submitForReview(token, snap.version.id);
  token = signAscJwt(creds);
  snap = await latestIosVersion(token);
  console.log(`Done. Version ${snap.versionString} state=${snap.state} build=${snap.attachedBuild}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
