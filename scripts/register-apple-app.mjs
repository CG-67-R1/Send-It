#!/usr/bin/env node
/**
 * Register RoadRacer on App Store Connect / Apple Developer via ASC API:
 * 1) Confirm team (seller) identity from API key context
 * 2) Ensure explicit Bundle ID com.milroadracer.app + PUSH_NOTIFICATIONS
 * 3) Ensure App Store Connect app "RoadRacer" exists
 *
 * Required env (never commit secrets):
 *   ASC_API_KEY_ID       — Key ID from App Store Connect → Users and Access → Integrations → App Store Connect API
 *   ASC_API_ISSUER_ID    — Issuer ID (UUID) on that page
 *   ASC_API_KEY_PATH     — absolute path to AuthKey_<KEYID>.p8
 *
 * Optional:
 *   ASC_BUNDLE_ID        — default com.milroadracer.app
 *   ASC_APP_NAME         — default RoadRacer - Motorsport_Is_Life
 *   ASC_SKU              — default roadracer-ios-001
 *   ASC_PRIMARY_LOCALE   — default en-AU
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.appstoreconnect.apple.com';
const BUNDLE_ID = process.env.ASC_BUNDLE_ID || 'com.milroadracer.app';
const APP_NAME = process.env.ASC_APP_NAME || 'RoadRacer - Motorsport_Is_Life';
const SKU = process.env.ASC_SKU || 'roadracer-ios-001';
const PRIMARY_LOCALE = process.env.ASC_PRIMARY_LOCALE || 'en-AU';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_PATH = path.resolve(__dirname, '../docs/ios/apple-setup-status.json');

function requiredEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(2);
  }
  return v;
}

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
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 12 * 60,
    aud: 'appstoreconnect-v1',
  };
  const encHeader = b64url(JSON.stringify(header));
  const encPayload = b64url(JSON.stringify(payload));
  const data = `${encHeader}.${encPayload}`;
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const sig = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(sig)}`;
}

async function asc(token, method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
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
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${urlPath} → ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function writeStatus(status) {
  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  fs.writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${STATUS_PATH}`);
}

async function findBundleId(token, identifier) {
  const q = new URLSearchParams({
    'filter[identifier]': identifier,
    limit: '10',
  });
  const json = await asc(token, 'GET', `/v1/bundleIds?${q}`);
  return json.data?.[0] || null;
}

async function ensureBundleId(token) {
  let existing = await findBundleId(token, BUNDLE_ID);
  if (existing) {
    console.log(`Bundle ID already exists: ${BUNDLE_ID} (${existing.id})`);
    return existing;
  }
  console.log(`Creating Bundle ID ${BUNDLE_ID}…`);
  const created = await asc(token, 'POST', '/v1/bundleIds', {
    data: {
      type: 'bundleIds',
      attributes: {
        name: APP_NAME,
        identifier: BUNDLE_ID,
        platform: 'IOS',
      },
    },
  });
  return created.data;
}

async function listCapabilities(token, bundleResourceId) {
  const json = await asc(
    token,
    'GET',
    `/v1/bundleIds/${bundleResourceId}/bundleIdCapabilities`
  );
  return json.data || [];
}

async function ensurePush(token, bundleResourceId) {
  const caps = await listCapabilities(token, bundleResourceId);
  const hasPush = caps.some((c) => c.attributes?.capabilityType === 'PUSH_NOTIFICATIONS');
  if (hasPush) {
    console.log('PUSH_NOTIFICATIONS already enabled');
    return;
  }
  console.log('Enabling PUSH_NOTIFICATIONS…');
  await asc(token, 'POST', '/v1/bundleIdCapabilities', {
    data: {
      type: 'bundleIdCapabilities',
      attributes: { capabilityType: 'PUSH_NOTIFICATIONS' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: bundleResourceId } },
      },
    },
  });
  console.log('PUSH_NOTIFICATIONS enabled');
}

async function findApp(token, bundleId) {
  const q = new URLSearchParams({
    'filter[bundleId]': bundleId,
    limit: '10',
  });
  const json = await asc(token, 'GET', `/v1/apps?${q}`);
  return json.data?.[0] || null;
}

async function ensureApp(token) {
  let existing = await findApp(token, BUNDLE_ID);
  if (existing) {
    console.log(
      `App Store Connect app already exists: ${existing.attributes?.name} (${existing.id})`
    );
    return existing;
  }
  console.log(`Creating App Store Connect app "${APP_NAME}"…`);
  const created = await asc(token, 'POST', '/v1/apps', {
    data: {
      type: 'apps',
      attributes: {
        bundleId: BUNDLE_ID,
        name: APP_NAME,
        primaryLocale: PRIMARY_LOCALE,
        sku: SKU,
      },
    },
  });
  return created.data;
}

async function confirmMembership(token) {
  // ASC API keys are team-scoped; surface visible seller/team signals.
  const users = await asc(token, 'GET', '/v1/users?limit=50');
  const admins = (users.data || []).filter((u) =>
    (u.attributes?.roles || []).includes('ADMIN')
  );
  const sample = admins[0] || users.data?.[0];
  const sellerHint = sample
    ? `${sample.attributes?.firstName || ''} ${sample.attributes?.lastName || ''}`.trim()
    : '(no users returned — key may be role-limited)';

  let appsCount = 0;
  try {
    const apps = await asc(token, 'GET', '/v1/apps?limit=1');
    appsCount = apps.meta?.paging?.total ?? (apps.data || []).length;
  } catch {
    appsCount = -1;
  }

  const membership = {
    apiKeyIssuerId: process.env.ASC_API_ISSUER_ID,
    visibleAdminOrUser: sellerHint || null,
    existingAppsVisible: appsCount,
    note:
      'Public App Store seller name is your Program membership entity (Individual legal name or Organization). Confirm under https://developer.apple.com/account → Membership details. Do not use a Development provisioning profile as the seller name.',
  };
  console.log('Membership / team context:');
  console.log(JSON.stringify(membership, null, 2));
  return membership;
}

async function main() {
  const keyId = requiredEnv('ASC_API_KEY_ID');
  const issuerId = requiredEnv('ASC_API_ISSUER_ID');
  const keyPath = requiredEnv('ASC_API_KEY_PATH');
  if (!fs.existsSync(keyPath)) {
    console.error(`ASC API key file not found: ${keyPath}`);
    process.exit(2);
  }
  const privateKeyPem = fs.readFileSync(keyPath, 'utf8');
  const token = signAscJwt({ keyId, issuerId, privateKeyPem });

  const membership = await confirmMembership(token);
  const bundle = await ensureBundleId(token);
  await ensurePush(token, bundle.id);
  const app = await ensureApp(token);

  const status = {
    updatedAt: new Date().toISOString(),
    membership,
    bundleId: {
      identifier: BUNDLE_ID,
      resourceId: bundle.id,
      pushNotifications: true,
    },
    appStoreConnectApp: {
      name: app.attributes?.name || APP_NAME,
      appleId: app.id,
      sku: app.attributes?.sku || SKU,
      bundleId: BUNDLE_ID,
    },
    next: {
      easCredentials:
        'From app/: npx eas-cli login && npx eas init && npx eas credentials -p ios (choose Let EAS manage / remote Distribution + App Store profile).',
      submitAscAppId: app.id,
    },
  };
  writeStatus(status);
  console.log('\nApple registration OK.');
  console.log(`ASC App ID (for eas.json submit.production.ios.ascAppId): ${app.id}`);
}

main().catch((err) => {
  console.error(err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
