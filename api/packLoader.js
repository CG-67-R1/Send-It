/**
 * Data-driven regional pack loader.
 * Active packs come from packs/active.json (or PACK_ACTIVE env comma-list).
 * Content resolution merges ancestor → child (child wins) by nodeId scoping.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKS_ROOT = path.resolve(__dirname, '..', 'packs');

let cache = null;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deepMerge(base, overlay) {
  if (Array.isArray(base) && Array.isArray(overlay)) {
    // Arrays: overlay replaces unless items have id — then merge by id
    if (
      overlay.length &&
      typeof overlay[0] === 'object' &&
      overlay[0] != null &&
      'id' in overlay[0]
    ) {
      const map = new Map();
      for (const item of base) {
        if (item && item.id != null) map.set(item.id, item);
      }
      for (const item of overlay) {
        if (item && item.id != null) {
          map.set(item.id, deepMerge(map.get(item.id) || {}, item));
        }
      }
      return [...map.values()];
    }
    return overlay;
  }
  if (
    base &&
    overlay &&
    typeof base === 'object' &&
    typeof overlay === 'object' &&
    !Array.isArray(base) &&
    !Array.isArray(overlay)
  ) {
    const out = { ...base };
    for (const [k, v] of Object.entries(overlay)) {
      out[k] = k in base ? deepMerge(base[k], v) : v;
    }
    return out;
  }
  return overlay === undefined ? base : overlay;
}

function loadCache() {
  if (cache) return cache;
  const registry = readJson(path.join(PACKS_ROOT, 'registry.json'));
  let activePacks;
  if (process.env.PACK_ACTIVE) {
    activePacks = process.env.PACK_ACTIVE.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    activePacks = readJson(path.join(PACKS_ROOT, 'active.json')).packs || [];
  }

  const nodes = new Map();
  for (const n of registry.nodes) nodes.set(n.id, n);

  const manifests = new Map();
  const hierarchies = new Map();
  for (const packId of activePacks) {
    const dir = path.join(PACKS_ROOT, 'regions', packId);
    const manifestPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn(`PackLoader: missing manifest for active pack ${packId}`);
      continue;
    }
    manifests.set(packId, readJson(manifestPath));
    const hierPath = path.join(dir, 'hierarchy.json');
    if (fs.existsSync(hierPath)) {
      hierarchies.set(packId, readJson(hierPath));
    }
  }

  cache = {
    registry,
    activePacks,
    nodes,
    manifests,
    hierarchies,
    packsRoot: PACKS_ROOT,
  };
  return cache;
}

/** Clear in-memory cache (tests / hot reload). */
export function clearPackCache() {
  cache = null;
}

export function getPacksRoot() {
  return PACKS_ROOT;
}

export function listActivePacks() {
  const cache = loadCache();
  return cache.activePacks.slice();
}

export function listActiveManifests() {
  const cache = loadCache();
  return cache.activePacks.map((id) => cache.manifests.get(id)).filter(Boolean);
}

export function getPrimaryPackId() {
  const packs = listActivePacks();
  return packs[0] || 'au';
}

export function getPrimaryManifest() {
  const cache = loadCache();
  return cache.manifests.get(getPrimaryPackId()) || null;
}

export function getNode(id) {
  return loadCache().nodes.get(id) || null;
}

export function getAncestorChain(nodeId) {
  const cache = loadCache();
  const chain = [];
  let cur = cache.nodes.get(nodeId);
  const guard = new Set();
  while (cur && !guard.has(cur.id)) {
    chain.unshift(cur);
    guard.add(cur.id);
    cur = cur.parentId ? cache.nodes.get(cur.parentId) : null;
  }
  return chain;
}

export function packDir(packId) {
  return path.join(PACKS_ROOT, 'regions', packId);
}

export function readPackFile(packId, relativePath) {
  const filePath = path.join(packDir(packId), relativePath);
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

/**
 * Load a content file from each active pack and merge (later packs override).
 * For node-scoped arrays (items with nodeId), filter/merge along ancestor chain when nodeId set.
 */
export function resolveContent(relativePath, nodeId = null) {
  const cache = loadCache();
  let merged = null;
  for (const packId of cache.activePacks) {
    const data = readPackFile(packId, relativePath);
    if (data == null) continue;
    merged = merged == null ? structuredClone(data) : deepMerge(merged, data);
  }
  if (merged == null) return null;

  if (nodeId) {
    const allowed = new Set(getAncestorChain(nodeId).map((n) => n.id));
    allowed.add(nodeId);
    for (const key of Object.keys(merged)) {
      if (Array.isArray(merged[key]) && merged[key][0] && 'nodeId' in merged[key][0]) {
        const scoped = merged[key].filter((item) => !item.nodeId || allowed.has(item.nodeId));
        // Prefer more specific nodeId (longer chain index)
        const specificity = (id) => getAncestorChain(id).length;
        scoped.sort((a, b) => specificity(a.nodeId || nodeId) - specificity(b.nodeId || nodeId));
        const byId = new Map();
        for (const item of scoped) {
          const k = item.id ?? JSON.stringify(item);
          byId.set(k, item);
        }
        merged[key] = [...byId.values()];
      }
    }
  }
  return merged;
}

export function getAiPrompts(packId = null) {
  const id = packId || getPrimaryPackId();
  return readPackFile(id, 'ai/prompts.json');
}

export function getHeadlineSourceIds(packId = null) {
  const id = packId || getPrimaryPackId();
  const data = readPackFile(id, 'headlines/sources.json');
  return data?.sourceIds || [];
}

export function getAllHeadlineSourceIds() {
  const ids = new Set();
  for (const packId of listActivePacks()) {
    for (const sid of getHeadlineSourceIds(packId)) ids.add(sid);
  }
  return [...ids];
}

export function getCalendarSources(packId = null) {
  const id = packId || getPrimaryPackId();
  return readPackFile(id, 'calendar/sources.json');
}

export function getCalendarStatic(packId = null) {
  const id = packId || getPrimaryPackId();
  return readPackFile(id, 'calendar/static.json');
}

export function getTracksCatalog(packId = null) {
  if (packId) return readPackFile(packId, 'tracks/tracks.json');
  const catalogs = listActivePacks()
    .map((id) => readPackFile(id, 'tracks/tracks.json'))
    .filter(Boolean);
  if (!catalogs.length) return { version: 1, tracks: [] };
  const tracks = [];
  const seen = new Set();
  for (const cat of catalogs) {
    for (const t of cat.tracks || []) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      tracks.push(t);
    }
  }
  return { version: catalogs[0].version || 1, tracks };
}

export function getOnboardingAreas(packId = null) {
  const id = packId || getPrimaryPackId();
  return readPackFile(id, 'onboarding/areas.json');
}

export function getLocalSeriesIds() {
  const ids = new Set();
  for (const packId of listActivePacks()) {
    const series = readPackFile(packId, 'competitions/series.json');
    for (const s of series?.series || []) {
      if (s.id) ids.add(s.id);
      if (s.local) ids.add(s.id);
    }
    // Compatibility aliases used by existing AU calendar
    if (packId === 'au') {
      for (const a of ['asbk', 'au_club', 'au_national', 'au_track_day', 'australia']) {
        ids.add(a);
      }
    }
  }
  return ids;
}

export function getLocalCountryNames() {
  const names = new Set();
  for (const m of listActiveManifests()) {
    if (m.displayName) names.add(m.displayName);
    for (const countryCode of m.isoCountries || []) {
      // Human labels for common ISO used by static calendar
      const map = {
        AU: 'Australia',
        GB: 'United Kingdom',
        ES: 'Spain',
        IT: 'Italy',
      };
      if (map[countryCode]) names.add(map[countryCode]);
    }
  }
  return names;
}

export function getDefaultLocalFilterKey() {
  return getPrimaryPackId();
}

export function getLocalUiLabel() {
  const manifest = getPrimaryManifest();
  return manifest?.defaultLocalLabel || manifest?.displayName || 'Local';
}
