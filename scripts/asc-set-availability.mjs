/**
 * United Kingdom only on the UK app. Remove the United Kingdom from the Australian app.
 * Does not change listing copy, screenshots, or review state.
 *
 *   node scripts/asc-set-availability.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asc, loadAscKey, signAscJwt } from './asc-session.mjs';

const AU_APP_ID = '6799806571';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UK_STATUS = path.resolve(__dirname, '../docs/ios/apple-setup-status-uk.json');

function localId(territory) {
  return `\${${territory}}`;
}

async function listAllTerritories(token) {
  const ids = [];
  let urlPath = '/v1/territories?limit=200';
  while (urlPath) {
    const json = await asc(token, 'GET', urlPath);
    for (const row of json.data ?? []) ids.push(row.id);
    const next = json.links?.next;
    urlPath = next ? next.replace('https://api.appstoreconnect.apple.com', '') : null;
  }
  return ids;
}

async function currentAvailability(token, appId) {
  const rel = await asc(token, 'GET', `/v1/apps/${appId}/appAvailabilityV2`);
  const avail = rel.data;
  if (!avail?.id) return { territoryIds: [], availableInNewTerritories: false };
  const availableInNewTerritories = Boolean(avail.attributes?.availableInNewTerritories);
  const ids = [];
  let urlPath = `/v2/appAvailabilities/${avail.id}/territoryAvailabilities?limit=200&include=territory`;
  while (urlPath) {
    const json = await asc(token, 'GET', urlPath);
    const territoryByLocal = new Map();
    for (const row of json.included ?? []) {
      if (row.type === 'territories') territoryByLocal.set(row.id, row.id);
    }
    for (const row of json.data ?? []) {
      if (row.attributes?.available === false) continue;
      const territoryId =
        row.relationships?.territory?.data?.id ||
        territoryByLocal.get(row.id) ||
        null;
      if (territoryId) ids.push(territoryId);
    }
    const next = json.links?.next;
    urlPath = next ? next.replace('https://api.appstoreconnect.apple.com', '') : null;
  }
  return { territoryIds: [...new Set(ids)], availableInNewTerritories };
}

async function setAvailability(token, appId, territoryIds, availableInNewTerritories) {
  const body = {
    data: {
      type: 'appAvailabilities',
      attributes: { availableInNewTerritories },
      relationships: {
        app: { data: { type: 'apps', id: appId } },
        territoryAvailabilities: {
          data: territoryIds.map((id) => ({ type: 'territoryAvailabilities', id: localId(id) })),
        },
      },
    },
    included: territoryIds.map((id) => ({
      type: 'territoryAvailabilities',
      id: localId(id),
      attributes: { available: true },
      relationships: {
        territory: { data: { type: 'territories', id } },
      },
    })),
  };
  return asc(token, 'POST', '/v2/appAvailabilities', body);
}

const status = JSON.parse(fs.readFileSync(UK_STATUS, 'utf8'));
const ukAppId = String(status.appStoreConnectApp?.appleId || '');
if (!ukAppId || ukAppId === AU_APP_ID) {
  throw new Error('UK Apple ID missing. Run node scripts/asc-uk-register.mjs first.');
}

const token = signAscJwt(await loadAscKey());
const all = await listAllTerritories(token);
if (!all.includes('GBR')) throw new Error('Territory list did not include GBR.');

console.log(`Setting UK app ${ukAppId} to GBR only.`);
await setAvailability(token, ukAppId, ['GBR'], false);
const ukAfter = await currentAvailability(token, ukAppId);
console.log(`UK territories: ${ukAfter.territoryIds.join(',') || '(none yet)'}`);
if (ukAfter.territoryIds.length && ukAfter.territoryIds.some((id) => id !== 'GBR')) {
  throw new Error(`UK app is available outside the United Kingdom: ${ukAfter.territoryIds.join(',')}`);
}

const auBefore = await currentAvailability(token, AU_APP_ID);
if (auBefore.territoryIds.length < 10) {
  throw new Error(`Australian availability read returned ${auBefore.territoryIds.length} territories. Aborting.`);
}
if (!auBefore.territoryIds.includes('GBR')) {
  console.log('Australian app is already unavailable in the United Kingdom.');
} else {
  const next = auBefore.territoryIds.filter((id) => id !== 'GBR');
  console.log(`Removing GBR from Australian app. ${auBefore.territoryIds.length} → ${next.length} territories.`);
  await setAvailability(token, AU_APP_ID, next, auBefore.availableInNewTerritories);
  const auAfter = await currentAvailability(token, AU_APP_ID);
  if (auAfter.territoryIds.includes('GBR')) {
    throw new Error('United Kingdom is still on the Australian app.');
  }
  if (auAfter.territoryIds.length < next.length - 2) {
    throw new Error(`Australian territory count dropped to ${auAfter.territoryIds.length}.`);
  }
  console.log(`Australian app territories now ${auAfter.territoryIds.length}, GBR absent.`);
}
