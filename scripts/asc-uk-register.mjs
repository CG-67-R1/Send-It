/**
 * Register the UK iOS app (com.milroadracer.uk, en-GB).
 * Writes docs/ios/apple-setup-status-uk.json and does not touch the Australian status file.
 * Does not submit for review.
 *
 *   node scripts/asc-uk-register.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { asc, loadAscKey, signAscJwt } from './asc-session.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_PATH = path.resolve(__dirname, '../docs/ios/apple-setup-status-uk.json');
const EAS_PATH = path.resolve(__dirname, '../app/eas.json');
const keyPath = path.join(os.tmpdir(), `asc-uk-${process.pid}.p8`);

const key = await loadAscKey();
fs.writeFileSync(keyPath, key.privateKeyPem, { mode: 0o600 });
process.env.ASC_API_KEY_ID = key.keyId;
process.env.ASC_API_ISSUER_ID = key.issuerId;
process.env.ASC_API_KEY_PATH = keyPath;
process.env.ASC_BUNDLE_ID = 'com.milroadracer.uk';
process.env.ASC_BUNDLE_NAME = 'RoadRacer UK';
process.env.ASC_APP_NAME = 'RoadRacer - Motorsport_Is_Life';
process.env.ASC_SKU = 'roadracer-uk-ios-001';
process.env.ASC_PRIMARY_LOCALE = 'en-GB';
process.env.ASC_STATUS_PATH = STATUS_PATH;

function writeUkStatus(status) {
  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  fs.writeFileSync(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  console.log(`Wrote ${STATUS_PATH}`);
}

function rememberAppleId(appleId) {
  const eas = JSON.parse(fs.readFileSync(EAS_PATH, 'utf8'));
  eas.submit = eas.submit || {};
  eas.submit['production-uk'] = { ios: { ascAppId: String(appleId) } };
  if (eas.submit.production?.ios?.ascAppId !== '6799806571') {
    throw new Error('Refusing to rewrite the Australian submit profile.');
  }
  fs.writeFileSync(EAS_PATH, `${JSON.stringify(eas, null, 2)}\n`);
  console.log(`UK Apple ID ${appleId} saved. Australian app 6799806571 unchanged.`);
}

try {
  const { main: registerAppleApp } = await import('./register-apple-app.mjs');
  await registerAppleApp();
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const appleId = status.appStoreConnectApp?.appleId;
  if (!appleId || appleId === '6799806571') {
    throw new Error('UK registration did not return a new Apple ID.');
  }
  rememberAppleId(appleId);
} catch (err) {
  const blocked = err.status === 403 || String(err.message).includes('403');
  if (!blocked) throw err;
  const token = signAscJwt(await loadAscKey());
  const found = await asc(
    token,
    'GET',
    '/v1/bundleIds?filter[identifier]=com.milroadracer.uk&limit=5'
  );
  const bundle = found.data?.[0];
  writeUkStatus({
    updatedAt: new Date().toISOString(),
    bundleId: {
      identifier: 'com.milroadracer.uk',
      resourceId: bundle?.id || null,
      name: bundle?.attributes?.name || 'RoadRacer UK',
      pushNotifications: true,
    },
    appStoreConnectApp: null,
    blocked: {
      reason:
        'Apple refused POST /v1/apps (403). The API key can read and update apps, and the UK bundle exists, but it cannot create the App Store record.',
      sku: 'roadracer-uk-ios-001',
      primaryLocale: 'en-GB',
      appName: 'RoadRacer - Motorsport_Is_Life',
    },
  });
  console.error(err.message);
  console.error(
    'Create the app in App Store Connect (bundle com.milroadracer.uk, locale en-GB, SKU roadracer-uk-ios-001), then run this script again.'
  );
  process.exitCode = 1;
} finally {
  fs.rmSync(keyPath, { force: true });
}
