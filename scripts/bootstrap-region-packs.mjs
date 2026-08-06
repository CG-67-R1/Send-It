/**
 * Create scaffold/seed pack folders from packs/registry.json + CONTENT_SLOTS.json.
 * Idempotent: does not overwrite existing non-empty content files.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PACKS = path.join(ROOT, 'packs');
const REGISTRY = JSON.parse(fs.readFileSync(path.join(PACKS, 'registry.json'), 'utf8'));
const SLOTS = JSON.parse(fs.readFileSync(path.join(PACKS, 'CONTENT_SLOTS.json'), 'utf8')).slots;

const EMPTY_BY_NAME = {
  'tracks/tracks.json': { version: 1, tracks: [] },
  'tracks/geofences.json': { type: 'FeatureCollection', features: [], metadata: {} },
  'tracks/turn_verification.json': { tracks: {} },
  'calendar/sources.json': { meta: {}, sources: [] },
  'calendar/static.json': { national: [], club: [] },
  'headlines/sources.json': { sourceIds: [], sources: [] },
  'organisations/federations.json': { items: [] },
  'organisations/clubs.json': { items: [] },
  'organisations/coaching.json': { items: [] },
  'licensing/pathways.json': { pathways: [] },
  'competitions/classes.json': { classes: [] },
  'competitions/series.json': { series: [] },
  'rules/rulebook.json': { governingBody: null, edition: null, urls: {}, chapters: {} },
  'rules/technical_variations.json': { variations: [] },
  'news/sources.json': { sources: [] },
  'progression/pathways.json': { pathways: [] },
  'terminology.json': { terms: [] },
  'suppliers.json': { items: [] },
  'services.json': { items: [] },
  'emergency.json': { contacts: [], notes: null },
  'weather/sources.json': { sources: [] },
  'ai/prompts.json': {
    coachHomeContext: null,
    askPriority: null,
    rulesModeName: null,
    webSearchCountry: null,
    spellingLocale: null,
  },
  'ai/knowledge/index.json': { files: [] },
  'i18n/strings.json': { locales: {} },
  'onboarding/areas.json': { areas: [] },
};

function writeJson(filePath, data, { overwrite = false } = {}) {
  if (fs.existsSync(filePath) && !overwrite) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return true;
}

const packRoots = new Map();
for (const node of REGISTRY.nodes) {
  if (!node.packId) continue;
  if (!packRoots.has(node.packId)) {
    const root = REGISTRY.nodes.find((n) => n.id === node.packId && n.parentId == null);
    packRoots.set(node.packId, root || node);
  }
}

let created = 0;
for (const [packId, root] of packRoots) {
  const packDir = path.join(PACKS, 'regions', packId);
  const childNodes = REGISTRY.nodes.filter((n) => n.packId === packId);

  const contentIndex = SLOTS.filter((s) => s !== 'manifest.json' && s !== 'hierarchy.json');
  const manifest = {
    id: packId,
    regionNumber: root.regionNumber ?? null,
    displayName: root.displayName,
    kind: root.kind || 'region',
    locales: root.locales || [],
    timezones: root.timezones || [],
    isoCountries: root.isoCountries || [],
    adminAreas: root.adminAreas || [],
    status: root.status || 'scaffold',
    defaultLocalLabel: root.displayName,
    spelling: {
      tyre: (root.locales || []).some((l) => l.startsWith('en-US')) ? 'tire' : 'tyre',
      dateFormat: 'YYYY-MM-DD',
    },
    contentIndex,
    notes: root.notes || undefined,
  };
  if (manifest.notes === undefined) delete manifest.notes;

  if (writeJson(path.join(packDir, 'manifest.json'), manifest)) created++;

  const hierarchy = {
    packId,
    nodes: childNodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      kind: n.kind,
      displayName: n.displayName,
      locales: n.locales || [],
      timezones: n.timezones || [],
      isoCountries: n.isoCountries || [],
      adminAreas: n.adminAreas || [],
      status: n.status || 'scaffold',
    })),
  };
  if (writeJson(path.join(packDir, 'hierarchy.json'), hierarchy)) created++;

  for (const slot of contentIndex) {
    const empty = EMPTY_BY_NAME[slot] ?? {};
    if (writeJson(path.join(packDir, slot), empty)) created++;
  }
}

console.log(`bootstrap-region-packs: ensured ${packRoots.size} packs (${created} files written)`);
