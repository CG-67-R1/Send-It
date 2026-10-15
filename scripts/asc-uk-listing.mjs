/**
 * en-GB listing and UK circuit screenshots on the UK app only.
 * Does not submit for review and does not edit app 6799806571.
 *
 *   node scripts/asc-uk-listing.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asc, loadAscKey, signAscJwt } from './asc-session.mjs';

const AU_APP_ID = '6799806571';
const VERSION = '1.0.2';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UK_STATUS = path.resolve(__dirname, '../docs/ios/apple-setup-status-uk.json');
const SHOT_DIR = path.resolve(__dirname, '../docs/ios/screenshots/uk-iphone-6.5');

const DESCRIPTION = `RoadRacer is your motorcycle road-racing companion — circuit study, race calendar, track notes, bike setup, and AI coaching in one place.

Learn a circuit before you ride it. Track Details draws Brands Hatch, Donington Park, Silverstone, Cadwell Park, Snetterton, Oulton Park, Thruxton, Knockhill, Anglesey, and Mallory Park from their GPS traces, at the true width of the road, with a suggested racing line. Tap a turn to zoom that corner. Track Walk notes sit on the same page.

The calendar lists UK championship rounds that have a sourced date, plus official BSB, club, and track-day calendars. Trivia is UK. Official rule check points to the ACU Standing Regulations and does not cite clause numbers.

Bike Setup keeps the day sheet, gearing, tyre-wear photos, and bike balance on your device. Ask Bike Setup AI about suspension, gearing, and tyres, or ask the Rider Coach about race craft — both pitched at how you ride on a UK track day or club weekend.

Your profile, avatar, setups, and track notes stay private on your device. AI chats you send go to the RoadRacer API and may be processed by OpenAI; chat history is not kept on our server after the reply.

Everything here is informational: the suggested line is a suggestion, not instruction, and we do not model lap times for you.

Built for UK track-day riders and club racers who live motorsport.`;

const KEYWORDS = 'motorcycle,racing,BSB,superbike,track day,bike setup,coach,calendar';
const PROMO =
  'Prep the bike in the garage: track briefing, BSB events, gearing, and tyre-wear notes — plus Bike Setup AI at your level. Setups stay on your device.';
const WHATS_NEW =
  'UK circuits in Track Details, UK trivia, UK events, and an ACU rule check that links out instead of citing clause numbers.';
const SUPPORT_URL = 'https://roadracer.info';
const PRIVACY_URL = 'https://roadracer.info/privacy.html';

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

const status = JSON.parse(fs.readFileSync(UK_STATUS, 'utf8'));
const appId = String(status.appStoreConnectApp?.appleId || '');
if (!appId || appId === AU_APP_ID) throw new Error('UK Apple ID missing.');

const files = fs.readdirSync(SHOT_DIR).filter((name) => name.endsWith('.png')).sort();
if (files.length < 3) throw new Error('Need at least 3 UK screenshots. Run scripts/build-uk-asc-screenshots.py');

const token = signAscJwt(await loadAscKey());
const listed = await asc(token, 'GET', `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=10`);
let version = (listed.data ?? []).find((row) => row.attributes.versionString === VERSION);
if (!version) {
  const created = await asc(token, 'POST', '/v1/appStoreVersions', {
    data: {
      type: 'appStoreVersions',
      attributes: {
        versionString: VERSION,
        platform: 'IOS',
        releaseType: 'MANUAL',
        copyright: '2026 Christopher Craig Greene',
      },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    },
  });
  version = created.data;
  console.log(`Created version ${VERSION}`);
} else {
  console.log(`Version ${VERSION} already exists`);
}

let locs = await asc(token, 'GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`);
let loc = (locs.data ?? []).find((row) => row.attributes.locale === 'en-GB');
if (!loc) {
  const created = await asc(token, 'POST', '/v1/appStoreVersionLocalizations', {
    data: {
      type: 'appStoreVersionLocalizations',
      attributes: { locale: 'en-GB' },
      relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
    },
  });
  loc = created.data;
}
const attributes = {
  description: DESCRIPTION,
  keywords: KEYWORDS,
  promotionalText: PROMO,
  supportUrl: SUPPORT_URL,
  marketingUrl: SUPPORT_URL,
  whatsNew: WHATS_NEW,
};
try {
  await asc(token, 'PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes },
  });
} catch (err) {
  delete attributes.whatsNew;
  await asc(token, 'PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes },
  });
  console.log(`Listing saved without What's New (${err.message})`);
}
console.log('en-GB listing text saved.');

const infos = await asc(token, 'GET', `/v1/apps/${appId}/appInfos`);
for (const info of infos.data ?? []) {
  const infoLocs = await asc(token, 'GET', `/v1/appInfos/${info.id}/appInfoLocalizations`);
  for (const infoLoc of infoLocs.data ?? []) {
    await asc(token, 'PATCH', `/v1/appInfoLocalizations/${infoLoc.id}`, {
      data: {
        type: 'appInfoLocalizations',
        id: infoLoc.id,
        attributes: { privacyPolicyUrl: PRIVACY_URL },
      },
    });
    console.log(`Privacy URL set on ${infoLoc.attributes.locale}`);
  }
}

const sets = await asc(token, 'GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
let iphoneSet = (sets.data ?? []).find((set) => set.attributes.screenshotDisplayType === 'APP_IPHONE_65');
if (!iphoneSet) {
  const created = await asc(token, 'POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: 'APP_IPHONE_65' },
      relationships: {
        appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } },
      },
    },
  });
  iphoneSet = created.data;
}
const existing = await asc(token, 'GET', `/v1/appScreenshotSets/${iphoneSet.id}/appScreenshots`);
for (const shot of existing.data ?? []) {
  await asc(token, 'DELETE', `/v1/appScreenshots/${shot.id}`);
}
for (const name of files.slice(0, 3)) {
  await uploadScreenshot(token, iphoneSet.id, path.join(SHOT_DIR, name));
}
console.log('UK listing prepared. Not submitted for review.');
