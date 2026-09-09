/**
 * Gate for Track Details maps: every layout has a repo GPX and a GPX-only
 * polyline. Old board PNGs / boardMaps / mapProof must stay gone.
 *
 * Usage:
 *   node scripts/prove-track-maps.mjs
 *   node scripts/prove-track-maps.mjs phillip_island
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACK_DETAILS_IDS } from './lib/track-details-ids.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const APP_MAP_DIR = path.join(ROOT, 'app', 'src', 'data', 'gpxTrackMaps');
const ANDROID_MAP_DIR = path.join(ROOT, 'android-app', 'src', 'data', 'gpxTrackMaps');
const APP_LINE_DIR = path.join(ROOT, 'app', 'src', 'data', 'racingLines');
const ANDROID_LINE_DIR = path.join(ROOT, 'android-app', 'src', 'data', 'racingLines');
const APP_CORNER_DIR = path.join(ROOT, 'app', 'src', 'data', 'trackDetailsCorners');
const ANDROID_CORNER_DIR = path.join(ROOT, 'android-app', 'src', 'data', 'trackDetailsCorners');
// Half the asphalt width the app draws, in map units; see TrackFacilityMap.
const SURFACE_HALF_UNITS = 0.6;
const CATALOG_PATH = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const FORBIDDEN = [
  'app/src/assets/trackInfo/boards',
  'android-app/src/assets/trackInfo/boards',
  'app/src/data/trackInfo/boardMaps.ts',
  'android-app/src/data/trackInfo/boardMaps.ts',
  'app/src/data/trackInfo/mapProof.json',
  'android-app/src/data/trackInfo/mapProof.json',
  'app/src/data/trackInfo/maps',
  'android-app/src/data/trackInfo/maps',
  'scripts/build-rr-board-maps.py',
  'scripts/build-track-info-maps.mjs',
];

const only = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;
const ids = only ? [only] : TRACK_DETAILS_IDS;

const failures = [];
const warnings = [];
const lengths = catalogLengths();

function fail(id, line) {
  failures.push(`${id}: ${line}`);
}

function warn(id, line) {
  warnings.push(`${id}: ${line}`);
}

function readMap(dir, id) {
  const file = path.join(dir, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function segIntersect(a1, a2, b1, b2) {
  const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function countSelfIntersections(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 4) return 0;
  const pts = polyline.map((p) => [Number(p[0]), Number(100 - p[1])]);
  const n = pts.length;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j += 1) {
      if ((i + 1) % n === j) continue;
      if ((j + 1) % n === i) continue;
      const b1 = pts[j];
      const b2 = pts[(j + 1) % n];
      if (segIntersect(a1, a2, b1, b2)) total += 1;
    }
  }
  return total;
}

function closingGap(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2) return 0;
  const first = polyline[0];
  const last = polyline[polyline.length - 1];
  return Math.hypot(Number(first[0]) - Number(last[0]), Number(first[1]) - Number(last[1]));
}

function catalogLengths() {
  const doc = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const out = {};
  for (const t of doc.tracks || []) {
    const m = String(t.lengthKm || '').match(/([\d.]+)/);
    if (m) out[t.id] = Number(m[1]) * 1000;
  }
  return out;
}

/**
 * Perimeter divided by bounding-box diagonal is scale free, so pairing the
 * committed polyline's ratio with the GPX's real extent yields a length that
 * must match the catalog. A trace holding more than one lap lands near 2x; the
 * wrong layout lands short. Neither shows up as a self-intersection.
 */
function impliedLengthM(polyline, gpxPath) {
  const xml = fs.readFileSync(gpxPath, 'utf8');
  const lat = [];
  const lon = [];
  const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/gi;
  let m;
  while ((m = re.exec(xml))) {
    lat.push(Number(m[1]));
    lon.push(Number(m[2]));
  }
  if (lat.length < 8) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(lat[0]));
  const xs = lon.map((v) => toRad(v - lon[0]) * 6371000 * cosLat);
  const ys = lat.map((v) => toRad(v - lat[0]) * 6371000);
  const diagM = Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys)
  );

  let perim = 0;
  for (let i = 0; i < polyline.length; i += 1) {
    const a = polyline[i];
    const b = polyline[(i + 1) % polyline.length];
    perim += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const px = polyline.map((p) => p[0]);
  const py = polyline.map((p) => p[1]);
  const diagUnits = Math.hypot(Math.max(...px) - Math.min(...px), Math.max(...py) - Math.min(...py));
  if (diagUnits <= 0 || diagM <= 0) return null;
  return (perim / diagUnits) * diagM;
}

/**
 * Furthest the racing line strays from the map polyline, in map units. The
 * ribbon is a round-joined stroke, so it covers exactly the points within half
 * the asphalt width of that polyline — this is the containment test, and it is
 * why the app must stroke in map units rather than device pixels.
 */
function maxStrayUnits(line, polyline) {
  let worst = 0;
  for (const p of line) {
    let best = Infinity;
    for (let i = 0; i < polyline.length; i += 1) {
      const a = polyline[i];
      const b = polyline[(i + 1) % polyline.length];
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const len2 = abx * abx + aby * aby;
      let t = 0;
      if (len2 > 1e-12) {
        t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2));
      }
      const d = Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + aby * t));
      if (d < best) best = d;
    }
    if (best > worst) worst = best;
  }
  return worst;
}

console.log('Track Details GPX maps');
console.log(`Repo: ${ROOT}`);
console.log('');

for (const rel of FORBIDDEN) {
  if (fs.existsSync(path.join(ROOT, rel))) {
    fail('legacy', `${rel} must not exist — delete old board-map work`);
  }
}

if (only && !TRACK_DETAILS_IDS.includes(only)) {
  fail(only, 'not a Track Details layout');
}

for (const id of ids) {
  const variants = {};
  const gpxPath = path.join(GPX_DIR, `${id}.gpx`);
  if (!fs.existsSync(gpxPath)) {
    fail(id, `missing ${path.relative(ROOT, gpxPath)}`);
  }

  for (const [label, dir] of [
    ['app', APP_MAP_DIR],
    ['android-app', ANDROID_MAP_DIR],
  ]) {
    const map = readMap(dir, id);
    if (!map) {
      fail(id, `missing ${label} gpxTrackMaps/${id}.json`);
      continue;
    }
    variants[label] = map;
    if (map.trackId !== id) fail(id, `${label} trackId mismatch`);
    if (!Array.isArray(map.polyline) || map.polyline.length < 32) {
      fail(id, `${label} polyline too short`);
    }
    for (const [idx, p] of map.polyline.entries()) {
      if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
        fail(id, `${label} polyline point ${idx} is invalid`);
        break;
      }
    }
    const selfX = countSelfIntersections(map.polyline);
    if (selfX > 0) fail(id, `${label} polyline self-intersections: ${selfX}`);
    const gap = closingGap(map.polyline);
    if (gap > 15) warn(id, `${label} large closing gap (${gap.toFixed(2)} in 0-100 map space)`);
    const extra = Object.keys(map).filter((k) => !['trackId', 'name', 'polyline'].includes(k));
    if (extra.length) fail(id, `${label} extra keys: ${extra.join(', ')}`);
    if (map.corners || map.derivedInfra || map.sisters) {
      fail(id, `${label} still carries old map overlay data`);
    }
  }
  if (variants.app && variants['android-app']) {
    const appBody = JSON.stringify(variants.app);
    const androidBody = JSON.stringify(variants['android-app']);
    if (appBody !== androidBody) {
      fail(id, 'app and android-app map JSON differ; rebuild both copies together');
    }
  }

  const target = lengths[id];
  if (target && variants.app && fs.existsSync(gpxPath)) {
    const implied = impliedLengthM(variants.app.polyline, gpxPath);
    if (implied) {
      const ratio = implied / target;
      const summary = `map implies ${Math.round(implied)} m vs catalog ${Math.round(
        target
      )} m (${ratio.toFixed(2)}x)`;
      if (ratio > 1.15) {
        fail(id, `${summary} — GPX holds more than one lap; rebuild with build-gpx-track-maps`);
      } else if (ratio < 0.85) {
        fail(id, `${summary} — GPX is a different or partial layout; replace the GPX or fix lengthKm`);
      } else if (ratio > 1.08 || ratio < 0.93) {
        warn(id, summary);
      }
    }
  }

  proveRacingLine(id, variants.app);
  proveCorners(id, variants.app);
}

function inMap(p) {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    p[0] >= -5 &&
    p[0] <= 105 &&
    p[1] >= -5 &&
    p[1] <= 105
  );
}

/** Numbered turns baked from the autonomous detector onto the GPX map. */
function proveCorners(id, map) {
  const copies = {};
  for (const [label, dir] of [
    ['app', APP_CORNER_DIR],
    ['android-app', ANDROID_CORNER_DIR],
  ]) {
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) {
      fail(id, `missing ${label} trackDetailsCorners/${id}.json`);
      continue;
    }
    copies[label] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  if (!copies.app || !copies['android-app']) return;
  if (JSON.stringify(copies.app) !== JSON.stringify(copies['android-app'])) {
    fail(id, 'app and android-app corner JSON differ; rebuild both copies together');
    return;
  }

  const doc = copies.app;
  if (doc.trackId !== id) fail(id, 'corner overlay trackId mismatch');
  if (!Array.isArray(doc.corners) || doc.corners.length < 1) {
    fail(id, 'corner overlay has no turns');
    return;
  }
  if (!inMap(doc.startFinish)) fail(id, 'start/finish is off the map');
  for (const [i, corner] of doc.corners.entries()) {
    if (corner.number !== i + 1) {
      fail(id, `corner numbering is not sequential at ${corner.number}`);
      break;
    }
    if (corner.direction != null && corner.direction !== 'left' && corner.direction !== 'right') {
      fail(id, `T${corner.number} has an invalid hand`);
    }
    if (!inMap(corner.apex) || !inMap(corner.label) || !inMap(corner.entry) || !inMap(corner.exit)) {
      fail(id, `T${corner.number} has a point off the map`);
    }
    if (map) {
      const stray = maxStrayUnits([corner.apex], map.polyline);
      if (stray > 4) {
        fail(id, `T${corner.number} apex is ${stray.toFixed(2)} map units off the ribbon`);
      }
    }
    if (!corner.summary || !corner.approachFrom) {
      fail(id, `T${corner.number} is missing rider copy`);
    }
  }
}

/** A racing line is optional, but a broken one must never ship. */
function proveRacingLine(id, map) {
  const lines = {};
  for (const [label, dir] of [
    ['app', APP_LINE_DIR],
    ['android-app', ANDROID_LINE_DIR],
  ]) {
    const file = path.join(dir, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    lines[label] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  if (!lines.app && !lines['android-app']) {
    warn(id, 'no racing line overlay; run build-racing-lines.py');
    return;
  }
  if (!lines.app || !lines['android-app']) {
    fail(id, 'racing line exists for only one of app / android-app');
    return;
  }
  if (JSON.stringify(lines.app) !== JSON.stringify(lines['android-app'])) {
    fail(id, 'app and android-app racing line JSON differ; rebuild both copies together');
    return;
  }

  const line = lines.app;
  if (line.trackId !== id) fail(id, 'racing line trackId mismatch');
  const extra = Object.keys(line).filter(
    (k) => !['trackId', 'name', 'polyline', 'palette', 'bands'].includes(k)
  );
  if (extra.length) fail(id, `racing line extra keys: ${extra.join(', ')}`);
  if (line.palette || line.bands) {
    if (!Array.isArray(line.palette) || line.palette.length < 2) {
      fail(id, 'racing line palette missing');
    } else {
      for (const [i, hex] of line.palette.entries()) {
        if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
          fail(id, `racing line palette[${i}] is not a six-digit hex colour`);
        }
      }
    }
    if (!Array.isArray(line.bands) || line.bands.length !== line.polyline.length) {
      fail(id, 'racing line bands must be parallel to polyline');
    } else {
      const maxBand = Array.isArray(line.palette) ? line.palette.length - 1 : -1;
      for (const [i, b] of line.bands.entries()) {
        if (!Number.isInteger(b) || b < 0 || b > maxBand) {
          fail(id, `racing line band ${i} is out of range`);
          break;
        }
      }
    }
  }
  if (!Array.isArray(line.polyline) || line.polyline.length < 32) {
    fail(id, 'racing line polyline too short');
    return;
  }
  for (const [idx, p] of line.polyline.entries()) {
    if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      fail(id, `racing line point ${idx} is invalid`);
      return;
    }
  }
  const selfX = countSelfIntersections(line.polyline);
  if (selfX > 0) fail(id, `racing line self-intersections: ${selfX}`);
  const gap = closingGap(line.polyline);
  if (gap > 0.5) fail(id, `racing line does not close (gap ${gap.toFixed(2)} map units)`);
  if (map) {
    const stray = maxStrayUnits(line.polyline, map.polyline);
    if (stray > SURFACE_HALF_UNITS + 1e-3) {
      fail(
        id,
        `racing line reaches ${stray.toFixed(2)} map units from the centreline but the ` +
          `asphalt is only ${SURFACE_HALF_UNITS} either side — it would draw off the road`
      );
    }
  }
}

if (failures.length) {
  console.error(' FAIL Track Details GPX maps');
  for (const line of failures) console.error(`      ${line}`);
  process.exit(1);
}

for (const id of ids) console.log(`  OK  ${id}`);
for (const w of warnings) console.warn(` WARN ${w}`);
console.log('');
console.log(
  `GPX maps passed (${ids.length} layout${ids.length === 1 ? '' : 's'}; ${warnings.length} warning${
    warnings.length === 1 ? '' : 's'
  })`
);
