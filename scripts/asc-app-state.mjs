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
  const match =
    listed.account?.byName?.appStoreConnectApiKeysPaginated?.edges?.find((e) => e.node.keyIdentifier === 'GN85FV4P74') ??
    listed.account?.byName?.appStoreConnectApiKeysPaginated?.edges?.[0];
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
    privateKeyPem: key.keyP8.includes('BEGIN') ? key.keyP8 : `-----BEGIN PRIVATE KEY-----\n${key.keyP8}\n-----END PRIVATE KEY-----`,
  };
}
async function asc(token, urlPath) {
  const res = await fetch(`${ASC}${urlPath}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const json = await res.json();
  console.log(urlPath, res.status);
  console.log(JSON.stringify(json.data?.attributes || json.errors || json, null, 2).slice(0, 2500));
}

const token = signAscJwt(await loadAscKey());
await asc(token, `/v1/apps/${APP_ID}`);
await asc(token, `/v1/apps/${APP_ID}/appInfos?limit=5`);
await asc(token, `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=8`);
