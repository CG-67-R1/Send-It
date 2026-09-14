/**
 * Read-only: what listing media can change in the current ASC state.
 *   node scripts/asc-listing-editability.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ID = '6799806571';
const ACCOUNT = 'motorsport-is-life';
const ASC = 'https://api.appstoreconnect.apple.com';
const EXPO_GQL = 'https://api.expo.dev/graphql';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function signAscJwt({ keyId, issuerId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 12 * 60, aud: 'appstoreconnect-v1' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
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
async function asc(token, method, urlPath) {
  const res = await fetch(`${ASC}${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const token = signAscJwt(await loadAscKey());
const versions = await asc(token, 'GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`);
const v = versions.json.data[0];
const a = v.attributes;
console.log('VERSION');
console.log(`  ${a.versionString} state=${a.appStoreState || a.appVersionState} releaseType=${a.releaseType}`);
console.log(`  created=${a.createdDate} release=${a.earliestReleaseDate || 'manual'}`);
console.log('  attrs:', JSON.stringify(a));

const locked = [
  'PENDING_DEVELOPER_RELEASE',
  'WAITING_FOR_REVIEW',
  'IN_REVIEW',
  'PENDING_APPLE_RELEASE',
  'READY_FOR_SALE',
];
const state = a.appStoreState || a.appVersionState;
console.log(`\nSCREENSHOTS editable in UI/API: ${locked.includes(state) ? 'NO — version is locked' : 'YES'}`);
console.log('PROMO TEXT editable: YES (already patched)');

const locs = await asc(token, 'GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
for (const loc of locs.json.data ?? []) {
  const promo = loc.attributes.promotionalText || '';
  console.log(`\n${loc.attributes.locale} promo=${promo.length}c`);
  console.log(`  promo preview: ${promo.slice(0, 80)}…`);
  const sets = await asc(token, 'GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
  for (const set of sets.json.data ?? []) {
    const shots = await asc(token, 'GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`);
    console.log(`  ${set.attributes.screenshotDisplayType}: ${(shots.json.data ?? []).map((s) => s.attributes.fileName).join(', ') || '(empty)'}`);
  }
  const previews = await asc(token, 'GET', `/v1/appStoreVersionLocalizations/${loc.id}/appPreviewSets`);
  console.log(`  preview sets: ${previews.json.data?.length ?? 0} (http ${previews.status})`);
}

const cpp = await asc(token, 'GET', `/v1/apps/${APP_ID}/customProductPages?limit=10`);
console.log(`\nCustom product pages: ${cpp.status} count=${cpp.json.data?.length ?? 'n/a'}`);
if (cpp.json.errors) console.log('  cpp errors:', JSON.stringify(cpp.json.errors).slice(0, 300));

const infos = await asc(token, 'GET', `/v1/apps/${APP_ID}/appInfos?limit=5`);
console.log(`App infos: ${infos.status} count=${infos.json.data?.length ?? 0}`);
for (const info of infos.json.data ?? []) {
  console.log(`  appInfo state=${info.attributes.state || info.attributes.appStoreState} ${JSON.stringify(info.attributes)}`);
}
