/**
 * Dump why 1.0.1 cannot be added to a review submission.
 *   node scripts/asc-diagnose-submit-block.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ID = '6799806571';
const ACCOUNT = 'motorsport-is-life';
const ASC = 'https://api.appstoreconnect.apple.com';
const EXPO_GQL = 'https://api.expo.dev/graphql';
const VERSION_ID = '5c5f755f-1394-4ad7-a988-76d2e88884f3';

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
        appStoreConnectApiKeysPaginated(first: 20) { edges { node { id keyIdentifier } } }
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
async function ascRaw(token, method, urlPath, body) {
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
  return { ok: res.ok, status: res.status, json };
}

const token = signAscJwt(await loadAscKey());

const version = await ascRaw(token, 'GET', `/v1/appStoreVersions/${VERSION_ID}`);
console.log('VERSION', version.status, JSON.stringify(version.json.data?.attributes, null, 2));

const build = await ascRaw(token, 'GET', `/v1/appStoreVersions/${VERSION_ID}/build`);
console.log(
  'ATTACHED BUILD',
  build.status,
  build.json.data
    ? `${build.json.data.attributes.version} ${build.json.data.attributes.processingState} expired=${build.json.data.attributes.expired}`
    : JSON.stringify(build.json.errors || build.json).slice(0, 400),
);

const review = await ascRaw(token, 'GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreReviewDetail`);
const reviewSafe = review.json.data?.attributes
  ? {
      contactFirstName: review.json.data.attributes.contactFirstName,
      contactLastName: review.json.data.attributes.contactLastName,
      contactEmail: review.json.data.attributes.contactEmail,
      demoAccountRequired: review.json.data.attributes.demoAccountRequired,
      notesChars: (review.json.data.attributes.notes || '').length,
    }
  : review.json.errors;
console.log('REVIEW DETAIL', review.status, JSON.stringify(reviewSafe, null, 2));

const locs = await ascRaw(token, 'GET', `/v1/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`);
for (const loc of locs.json.data ?? []) {
  const a = loc.attributes;
  console.log(
    `LOCALE ${a.locale} desc=${(a.description || '').length}c keywords=${(a.keywords || '').length}c whatsNew=${(a.whatsNew || '').length}c support=${a.supportUrl} marketing=${a.marketingUrl}`,
  );
  const sets = await ascRaw(token, 'GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
  if (!sets.json.data?.length) console.log('  (no screenshot sets)');
  for (const set of sets.json.data ?? []) {
    const shots = await ascRaw(token, 'GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`);
    console.log(`  ${set.attributes.screenshotDisplayType} count=${shots.json.data?.length ?? 0}`);
    for (const s of shots.json.data ?? []) {
      console.log(`    ${s.attributes.fileName} ${s.attributes.assetDeliveryState?.state} ${JSON.stringify(s.attributes.assetDeliveryState?.errors || [])}`);
    }
  }
}

const infos = await ascRaw(token, 'GET', `/v1/apps/${APP_ID}/appInfos?limit=8`);
for (const info of infos.json.data ?? []) {
  console.log('APP INFO', JSON.stringify(info.attributes));
  const age = await ascRaw(token, 'GET', `/v1/appInfos/${info.id}/ageRatingDeclaration`);
  console.log('  age', age.status, JSON.stringify(age.json.data?.attributes || age.json.errors || {}).slice(0, 400));
  const cats = await ascRaw(token, 'GET', `/v1/appInfos/${info.id}/appCategories`);
  console.log('  cats', cats.status, JSON.stringify(cats.json.data || cats.json.errors || {}).slice(0, 300));
}

const subs = await ascRaw(token, 'GET', `/v1/apps/${APP_ID}/reviewSubmissions?filter[platform]=IOS&limit=8`);
for (const s of subs.json.data ?? []) {
  const items = await ascRaw(token, 'GET', `/v1/reviewSubmissions/${s.id}/items`);
  console.log(
    `SUB ${s.id} state=${s.attributes.state} submitted=${s.attributes.submittedDate || s.attributes.submitted} items=${items.json.data?.length ?? 0}`,
  );
}

const open = (subs.json.data ?? []).find((s) =>
  ['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES'].includes(s.attributes?.state),
);
const subId = open?.id;
console.log('OPEN SUB', subId || 'none', open?.attributes?.state);

if (subId) {
  const tryAdd = await ascRaw(token, 'POST', '/v1/reviewSubmissionItems', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
      },
    },
  });
  console.log('TRY ADD ITEM', tryAdd.status);
  console.log(JSON.stringify(tryAdd.json, null, 2));
} else {
  const created = await ascRaw(token, 'POST', '/v1/reviewSubmissions', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  console.log('CREATE SUB', created.status, JSON.stringify(created.json, null, 2).slice(0, 800));
  const newId = created.json.data?.id;
  if (newId) {
    const tryAdd = await ascRaw(token, 'POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: newId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
        },
      },
    });
    console.log('TRY ADD ITEM', tryAdd.status);
    console.log(JSON.stringify(tryAdd.json, null, 2));
  }
}
