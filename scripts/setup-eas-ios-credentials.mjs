#!/usr/bin/env node
/**
 * Initialize Expo project link (if needed) and configure remote iOS credentials
 * via EAS (Apple Distribution + App Store provisioning profile).
 *
 * Prerequisites:
 *   - Expo account: EXPO_TOKEN or prior `eas login`
 *   - Apple auth for EAS (preferred ASC API key):
 *       EXPO_ASC_API_KEY_PATH  (or ASC_API_KEY_PATH)
 *       EXPO_ASC_KEY_ID        (or ASC_API_KEY_ID)
 *       EXPO_ASC_ISSUER_ID     (or ASC_API_ISSUER_ID)
 *   - Optional: APPLE_TEAM_ID
 *   - Run scripts/register-apple-app.mjs first (Bundle ID + ASC app)
 *
 * Usage (from repo root):
 *   node scripts/setup-eas-ios-credentials.mjs
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '../app');
const STATUS_PATH = path.resolve(__dirname, '../docs/ios/apple-setup-status.json');

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    cwd: APP_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
    ...opts,
  });
  if (res.status !== 0) {
    throw new Error(`${cmd} exited with ${res.status}`);
  }
}

function mapAscEnvForExpo() {
  if (!process.env.EXPO_ASC_KEY_ID && process.env.ASC_API_KEY_ID) {
    process.env.EXPO_ASC_KEY_ID = process.env.ASC_API_KEY_ID;
  }
  if (!process.env.EXPO_ASC_ISSUER_ID && process.env.ASC_API_ISSUER_ID) {
    process.env.EXPO_ASC_ISSUER_ID = process.env.ASC_API_ISSUER_ID;
  }
  if (!process.env.EXPO_ASC_API_KEY_PATH && process.env.ASC_API_KEY_PATH) {
    process.env.EXPO_ASC_API_KEY_PATH = process.env.ASC_API_KEY_PATH;
  }
}

function readStatus() {
  if (!fs.existsSync(STATUS_PATH)) return null;
  return JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
}

function patchEasAscAppId(ascAppId) {
  if (!ascAppId) return;
  const easPath = path.join(APP_DIR, 'eas.json');
  const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
  eas.submit = eas.submit || {};
  eas.submit.production = eas.submit.production || {};
  eas.submit.production.ios = eas.submit.production.ios || {};
  if (eas.submit.production.ios.ascAppId !== ascAppId) {
    eas.submit.production.ios.ascAppId = ascAppId;
    fs.writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`, 'utf8');
    console.log(`Updated eas.json submit.production.ios.ascAppId = ${ascAppId}`);
  }
}

function ensureAppJsonHasEasProjectHint() {
  const appJsonPath = path.join(APP_DIR, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  appJson.expo.extra = appJson.expo.extra || {};
  if (!appJson.expo.extra.eas) {
    appJson.expo.extra.eas = {};
  }
  // projectId is filled by `eas init`; do not invent one.
  fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`, 'utf8');
}

async function main() {
  mapAscEnvForExpo();
  ensureAppJsonHasEasProjectHint();

  const status = readStatus();
  if (status?.appStoreConnectApp?.appleId) {
    patchEasAscAppId(status.appStoreConnectApp.appleId);
  } else {
    console.warn(
      'Warning: docs/ios/apple-setup-status.json missing ASC app id. Run register-apple-app.mjs first.'
    );
  }

  if (!process.env.EXPO_TOKEN) {
    console.log('EXPO_TOKEN unset — relying on interactive eas login / existing session.');
  }
  if (!process.env.EXPO_ASC_KEY_ID || !process.env.EXPO_ASC_ISSUER_ID || !process.env.EXPO_ASC_API_KEY_PATH) {
    console.error(
      'Missing Expo ASC API env (EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID, EXPO_ASC_API_KEY_PATH). Map from ASC_API_* or set EXPO_ASC_*.'
    );
    process.exit(2);
  }

  // whoami
  run('npx', ['--yes', 'eas-cli@latest', 'whoami']);

  // Link project if needed (non-interactive when possible)
  const appJson = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'app.json'), 'utf8'));
  const projectId = appJson.expo?.extra?.eas?.projectId;
  if (!projectId) {
    console.log('No eas.projectId yet — running eas init…');
    run('npx', ['--yes', 'eas-cli@latest', 'init', '--non-interactive']);
  }

  // First production build (no wait) forces EAS to create remote Distribution cert + App Store profile.
  // Set EAS_SKIP_BUILD=1 to only init/link the project.
  if (process.env.EAS_SKIP_BUILD === '1') {
    console.log('EAS_SKIP_BUILD=1 — skipping build; run: npx eas-cli build -p ios --profile production');
  } else {
    run('npx', [
      '--yes',
      'eas-cli@latest',
      'build',
      '-p',
      'ios',
      '--profile',
      'production',
      '--non-interactive',
      '--no-wait',
    ]);
  }

  const nextStatus = status || {};
  nextStatus.easCredentials = {
    updatedAt: new Date().toISOString(),
    credentialsSource: 'remote',
    note: 'EAS manages Apple Distribution certificate + App Store provisioning profile for com.milroadracer.app',
    buildQueued: process.env.EAS_SKIP_BUILD !== '1',
  };
  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  fs.writeFileSync(STATUS_PATH, `${JSON.stringify(nextStatus, null, 2)}\n`, 'utf8');
  console.log('\nEAS iOS credentials step finished (remote / EAS-managed).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
