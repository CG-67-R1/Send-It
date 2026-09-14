/**
 * PATCH Support + Marketing URLs on the current iOS version localizations.
 * Does not touch screenshots, builds, or review.
 *
 *   node scripts/asc-set-listing-urls.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_ID = '6799806571';
const ACCOUNT = 'motorsport-is-life';
const ASC = 'https://api.appstoreconnect.apple.com';
const EXPO_GQL = 'https://api.expo.dev/graphql';

const SUPPORT_URL = 'https://roadracer.info';
const MARKETING_URL = 'https://roadracer.info';

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

const token = signAscJwt(await loadAscKey());
const versions = await asc(token, 'GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`);
const v = versions.data[0];
const state = v.attributes.appStoreState || v.attributes.appVersionState;
console.log(`version ${v.attributes.versionString} state=${state}`);

const locs = await asc(token, 'GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
for (const loc of locs.data ?? []) {
  const before = {
    supportUrl: loc.attributes.supportUrl,
    marketingUrl: loc.attributes.marketingUrl,
  };
  await asc(token, 'PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
    data: {
      type: 'appStoreVersionLocalizations',
      id: loc.id,
      attributes: {
        supportUrl: SUPPORT_URL,
        marketingUrl: MARKETING_URL,
      },
    },
  });
  console.log(
    `${loc.attributes.locale}: support ${before.supportUrl} → ${SUPPORT_URL}; marketing ${before.marketingUrl} → ${MARKETING_URL}`,
  );
}
