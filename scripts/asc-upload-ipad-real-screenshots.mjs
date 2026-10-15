/**
 * Add iPad 12.9" (3rd gen) shots so a universal binary can go to review.
 * Uses the same real photos as the iPhone 6.5" set. Does not submit.
 *
 *   node scripts/asc-upload-ipad-real-screenshots.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_ID = '6799806571';
const ACCOUNT = 'motorsport-is-life';
const ASC = 'https://api.appstoreconnect.apple.com';
const EXPO_GQL = 'https://api.expo.dev/graphql';
const IPAD_TYPE = 'APP_IPAD_PRO_3GEN_129';

const IPAD_FILES = [
  path.join(ROOT, 'docs/ios/screenshots/ipad-12.9/asc-ipad129-lifestyle-gearing.png'),
  path.join(ROOT, 'docs/ios/screenshots/ipad-12.9/asc-ipad129-real-tyre-wear.png'),
  path.join(ROOT, 'docs/ios/screenshots/ipad-12.9/asc-ipad129-real-setup-ai.png'),
  path.join(ROOT, 'docs/ios/screenshots/ipad-12.9/asc-ipad129-real-lifestyle-tyre.png'),
];

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
  for (const op of reserved.data.attributes.uploadOperations ?? []) {
    const start = op.offset ?? 0;
    const chunk = buf.subarray(start, start + (op.length ?? buf.length));
    const headers = {};
    for (const [k, v] of Object.entries(op.requestHeaders ?? {})) headers[k] = v;
    const put = await fetch(op.url, { method: op.method || 'PUT', headers, body: chunk });
    if (!put.ok) throw new Error(`Upload ${fileName} → ${put.status}`);
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

for (const file of IPAD_FILES) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const creds = await loadAscKey();
let token = signAscJwt(creds);
const versions = await asc(token, 'GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`);
const v = versions.data.find((row) => row.attributes.versionString === '1.0.1') ?? versions.data[0];
const state = v.attributes.appStoreState || v.attributes.appVersionState;
console.log(`version ${v.attributes.versionString} state=${state}`);
if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'READY_FOR_SALE'].includes(state)) {
  throw new Error(`Screenshots locked in state ${state}.`);
}

const locs = await asc(token, 'GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
const au = (locs.data ?? []).find((l) => l.attributes.locale === 'en-AU') ?? locs.data?.[0];
const sets = await asc(token, 'GET', `/v1/appStoreVersionLocalizations/${au.id}/appScreenshotSets`);

let ipadSet = (sets.data ?? []).find((s) => s.attributes.screenshotDisplayType === IPAD_TYPE);
if (ipadSet) {
  const shots = await asc(token, 'GET', `/v1/appScreenshotSets/${ipadSet.id}/appScreenshots`);
  for (const shot of shots.data ?? []) {
    await asc(token, 'DELETE', `/v1/appScreenshots/${shot.id}`);
    console.log(`Deleted ${shot.attributes.fileName || shot.id}`);
  }
} else {
  const created = await asc(token, 'POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: IPAD_TYPE },
      relationships: {
        appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: au.id } },
      },
    },
  });
  ipadSet = created.data;
  console.log(`Created ${IPAD_TYPE} set.`);
}

for (const file of IPAD_FILES) {
  token = signAscJwt(creds);
  await uploadScreenshot(token, ipadSet.id, file);
}

for (let i = 0; i < 16; i++) {
  const check = await asc(token, 'GET', `/v1/appScreenshotSets/${ipadSet.id}/appScreenshots`);
  const rows = (check.data ?? []).map((s) => `${s.attributes.fileName}:${s.attributes.assetDeliveryState?.state}`);
  if (rows.length >= IPAD_FILES.length && rows.every((r) => r.endsWith(':COMPLETE'))) {
    console.log(`Ready: ${rows.join(', ')}`);
    process.exit(0);
  }
  console.log(`Processing ${rows.join(', ') || 'empty'}; waiting 15s…`);
  await sleep(15_000);
}
throw new Error('iPad screenshots uploaded but Apple is still processing.');
