/**
 * Submit the next iOS App Store version (default 1.0.2). Does not edit live 1.0.1.
 *
 *   node scripts/asc-submit-101.mjs --diagnose
 *   node scripts/asc-submit-101.mjs --build 33
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ID = '6799806571';
const ACCOUNT = 'motorsport-is-life';
const ASC = 'https://api.appstoreconnect.apple.com';
const EXPO_GQL = 'https://api.expo.dev/graphql';
function cliArg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
    return process.argv[i + 1];
  }
  return fallback;
}
const WANT_VERSION = cliArg('--version', '1.0.2');
const WANT_BUILD = cliArg('--build', '');
const DIAGNOSE = process.argv.includes('--diagnose');

const WHATS_NEW =
  'Track Details now lets you place your own corner numbers, start/finish, and direction, with surface, camber, and entry notes. Track Walk notes show on the same page. Australian maps still use the confirmed turn numbers.';

const REVIEW_NOTES = `RoadRacer — App Review notes (version ${WANT_VERSION}${WANT_BUILD ? `, build ${WANT_BUILD}` : ''})

1) NO ACCOUNT
No registration, login, or account deletion. No IAP or subscriptions. No ATT prompt.

2) WHAT CHANGED
Track Details: riders can place extra corner numbers, start/finish, and direction, plus surface/camber/entry chips and a personal note. Track Walk notes appear on Track Details. Australian GPS maps still show confirmed turn numbers. UK circuits stay in Track Walk and the calendar until those GPS maps ship. We do not claim detector-placed UK corners.

3) HOW TO REVIEW
Open the app; complete or skip onboarding. Home, Settings, Events, Rider Coach (Track Walk + AI Coach + Track Details), Bike Setup, Q&A. On Track Details pick an Australian circuit (e.g. Phillip Island): zoom the GPS map, confirmed numbers, optional Place corner / Mark S/F. The suggested line is a suggestion only; no modelled lap times.

4) SERVICES
API https://send-it-ke7r.onrender.com — calendar, Q&A, Coach proxy. OpenAI for AI replies (not kept after the reply). First call after idle may take ~30s.

5) CONTACT
projectapex@outlook.com.au
Privacy: https://roadracer.info/privacy.html
Support/marketing: https://roadracer.info
`;

const LOCALE_COPY = {
  'en-AU': {
    whatsNew: WHATS_NEW,
    promotionalText:
      'Prep the bike in the garage: track briefing, events, gearing, and tyre-wear notes — plus an AI coach. Setups stay on your device.',
    supportUrl: 'https://roadracer.info',
    marketingUrl: 'https://roadracer.info',
  },
  'en-GB': {
    whatsNew: WHATS_NEW,
    promotionalText:
      'Prep the bike in the garage: track briefing, BSB events, gearing, and tyre-wear notes — plus an AI coach. Setups stay on your device.',
    supportUrl: 'https://roadracer.info',
    marketingUrl: 'https://roadracer.info',
  },
};

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signAscJwt({ keyId, issuerId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: issuerId, iat: now, exp: now + 12 * 60, aud: 'appstoreconnect-v1' }))}`;
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return `${data}.${b64url(sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' }))}`;
}
function expoAuthHeaders() {
  if (process.env.EXPO_TOKEN?.trim()) return { authorization: `Bearer ${process.env.EXPO_TOKEN.trim()}` };
  const raw = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.expo', 'state.json'), 'utf8'));
  const auth = raw.auth ?? raw;
  if (auth.accessToken) return { authorization: `Bearer ${auth.accessToken}` };
  if (auth.sessionSecret) return { 'expo-session': auth.sessionSecret };
  throw new Error('No Expo session.');
}
async function expoGql(query, variables) {
  const res = await fetch(EXPO_GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...expoAuthHeaders() },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}
async function loadAscKey() {
  const listed = await expoGql(
    `query Keys($accountName: String!) {
      account { byName(accountName: $accountName) {
        appStoreConnectApiKeysPaginated(first: 20) { edges { node { id keyIdentifier name } } }
      } }
    }`,
    { accountName: ACCOUNT },
  );
  const edges = listed.account?.byName?.appStoreConnectApiKeysPaginated?.edges ?? [];
  const match = edges.find((e) => e.node.keyIdentifier === 'GN85FV4P74') ?? edges[0];
  const full = await expoGql(
    `query Key($ascApiKeyId: ID!) {
      appStoreConnectApiKey { byId(id: $ascApiKeyId) { issuerIdentifier keyIdentifier keyP8 } }
    }`,
    { ascApiKeyId: match.node.id },
  );
  const key = full.appStoreConnectApiKey?.byId;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.errors?.map((e) => `${e.code}: ${e.detail || e.title}`).join(' | ') || JSON.stringify(json);
    throw new Error(`${method} ${urlPath} → ${res.status} ${err}`);
  }
  return json;
}
async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function diagnose(token) {
  const versions = await asc(token, 'GET', `/v1/apps/${APP_ID}/appStoreVersions?limit=20`);
  for (const v of versions.data ?? []) {
    const a = v.attributes;
    console.log(
      `version ${a.versionString} platform=${a.platform} store=${a.appStoreState} ver=${a.appVersionState} release=${a.releaseType} id=${v.id}`,
    );
  }
  const live = (versions.data ?? []).find((v) => v.attributes.versionString === '1.0.0');
  if (live) {
    const phased = await asc(token, 'GET', `/v1/appStoreVersions/${live.id}/appStoreVersionPhasedRelease`).catch(
      (e) => ({ error: e.message }),
    );
    console.log(`1.0.0 phased: ${phased.error || JSON.stringify(phased.data?.attributes || phased)}`);
    const build = await asc(token, 'GET', `/v1/appStoreVersions/${live.id}/build`).catch((e) => ({ error: e.message }));
    console.log(
      `1.0.0 attached build: ${build.error || `${build.data?.attributes?.version} ${build.data?.attributes?.processingState}`}`,
    );
  }
  const inflight = await asc(
    token,
    'GET',
    `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,WAITING_FOR_REVIEW,IN_REVIEW,PENDING_DEVELOPER_RELEASE,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED,READY_FOR_REVIEW`,
  );
  console.log(`in-flight versions: ${(inflight.data ?? []).length}`);
  const subs = await asc(token, 'GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=15`);
  for (const s of subs.data ?? []) {
    console.log(`reviewSubmission ${s.id} state=${s.attributes.state} submitted=${s.attributes.submitted}`);
  }
  const builds = await asc(
    token,
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=8`,
  );
  for (const b of builds.data ?? []) {
    console.log(
      `build ${b.attributes.version} processing=${b.attributes.processingState} expired=${b.attributes.expired} uploaded=${b.attributes.uploadedDate} id=${b.id}`,
    );
  }
  const price = await asc(token, 'GET', `/v1/apps/${APP_ID}/appPriceSchedule`).catch((e) => ({ error: e.message }));
  console.log(`priceSchedule: ${price.error || price.data?.id || JSON.stringify(price.data || price.errors || {}).slice(0, 200)}`);
  const avail = await asc(token, 'GET', `/v1/apps/${APP_ID}/appAvailabilityV2`).catch((e) => ({ error: e.message }));
  console.log(`availability: ${avail.error || JSON.stringify(avail.data?.attributes || avail.errors || {}).slice(0, 300)}`);
  return { versions: versions.data ?? [], builds: builds.data ?? [], subs: subs.data ?? [] };
}

async function findVersion(token) {
  const listed = await asc(token, 'GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=15`);
  return (listed.data ?? []).find((v) => v.attributes.versionString === WANT_VERSION) ?? null;
}

async function ensureVersion(token, tries = 8) {
  const existing = await findVersion(token);
  if (existing) {
    console.log(`Using existing ${WANT_VERSION} ${existing.attributes.appStoreState || existing.attributes.appVersionState}`);
    return existing;
  }
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const created = await asc(token, 'POST', '/v1/appStoreVersions', {
        data: {
          type: 'appStoreVersions',
          attributes: {
            versionString: WANT_VERSION,
            platform: 'IOS',
            releaseType: 'MANUAL',
            copyright: '2026 Christopher Craig Greene',
          },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      });
      console.log(`Created ${WANT_VERSION} ${created.data.id}`);
      return created.data;
    } catch (err) {
      lastErr = err;
      console.log(`Create ${WANT_VERSION} failed (${i + 1}/${tries}): ${err.message}`);
      if (i < tries - 1) await sleep(45_000);
    }
  }
  throw lastErr;
}

async function waitForBuild(token) {
  for (let i = 0; i < 20; i++) {
    const json = await asc(token, 'GET', `/v1/builds?filter[app]=${APP_ID}&filter[version]=${WANT_BUILD}&limit=5`);
    const ready = (json.data ?? []).find((b) => b.attributes.processingState === 'VALID' && b.attributes.expired !== true);
    if (ready) return ready;
    const state = json.data?.[0]?.attributes?.processingState ?? 'missing';
    console.log(`Build ${WANT_BUILD} is ${state}; waiting 30s (${i + 1}/20)…`);
    await sleep(30_000);
  }
  throw new Error(`Build ${WANT_BUILD} did not become VALID in time.`);
}

async function attachBuild(token, versionId, buildId) {
  await asc(token, 'PATCH', `/v1/appStoreVersions/${versionId}`, {
    data: {
      type: 'appStoreVersions',
      id: versionId,
      relationships: { build: { data: { type: 'builds', id: buildId } } },
    },
  });
  console.log(`Attached build ${WANT_BUILD}.`);
}

async function fillLocalizations(token, versionId) {
  const locs = await asc(token, 'GET', `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
  for (const loc of locs.data ?? []) {
    const copy = LOCALE_COPY[loc.attributes.locale];
    if (!copy) continue;
    await asc(token, 'PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: copy },
    });
    console.log(`Updated ${loc.attributes.locale} what's new + URLs.`);
  }
}

async function updateReviewDetail(token, versionId) {
  const detail = await asc(token, 'GET', `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`).catch(() => null);
  const existing = detail?.data;
  const attributes = {
    contactFirstName: existing?.attributes?.contactFirstName || 'Christopher',
    contactLastName: existing?.attributes?.contactLastName || 'Greene',
    contactEmail: 'projectapex@outlook.com.au',
    demoAccountRequired: false,
    notes: REVIEW_NOTES,
  };
  if (existing?.attributes?.contactPhone) attributes.contactPhone = existing.attributes.contactPhone;
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
  console.log('Updated App Review notes.');
}

async function submitForReview(token, versionId) {
  const existing = await asc(token, 'GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=8`);
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
    console.log(`Created review submission ${subId}.`);
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
    if (/cannot be reviewed|SCREENSHOT_REQUIRED/i.test(err.message)) throw err;
    if (!/already|exists/i.test(err.message)) throw err;
    console.log(`Review item already present: ${err.message}`);
  }
  await asc(token, 'PATCH', `/v1/reviewSubmissions/${subId}`, {
    data: { type: 'reviewSubmissions', id: subId, attributes: { submitted: true } },
  });
  console.log(`Submitted ${WANT_VERSION} (review submission ${subId}).`);
}

const creds = await loadAscKey();
let token = signAscJwt(creds);
const snap = await diagnose(token);
if (DIAGNOSE) process.exit(0);
if (!WANT_BUILD) {
  console.error('Pass --build <CFBundleVersion> after the EAS production IPA is in ASC (VALID).');
  process.exit(2);
}
if (REVIEW_NOTES.length > 4000) throw new Error(`Review notes ${REVIEW_NOTES.length} chars.`);

token = signAscJwt(creds);
const build = await waitForBuild(token);

let version;
try {
  token = signAscJwt(creds);
  version = await ensureVersion(token);
} catch (err) {
  console.error(err.message);
    console.error(
    `Apple is still blocking a new version. In App Store Connect: App Store → iOS App → + Version → ${WANT_VERSION}. Then rerun this script.`,
  );
  process.exit(2);
}
try {
  await asc(token, 'PATCH', `/v1/builds/${build.id}`, {
    data: {
      type: 'builds',
      id: build.id,
      attributes: { usesNonExemptEncryption: false },
    },
  });
  console.log('Set export compliance: usesNonExemptEncryption=false.');
} catch (err) {
  console.log(`Export compliance: ${err.message}`);
}
await attachBuild(token, version.id, build.id);
await fillLocalizations(token, version.id);
await updateReviewDetail(token, version.id);
token = signAscJwt(creds);
await submitForReview(token, version.id);
token = signAscJwt(creds);
const after = await diagnose(token);
const v101 = after.versions.find((v) => v.attributes.versionString === WANT_VERSION);
console.log(
  `Done. ${WANT_VERSION} state=${v101?.attributes.appStoreState || v101?.attributes.appVersionState || 'missing'}`,
);
