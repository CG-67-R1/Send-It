/**
 * Bake a Track Memory layout JSON from Emtron GPX + catalog corner labels.
 *
 * Usage:
 *   node scripts/bake-track-memory-layout.mjs mallala
 *   node scripts/bake-track-memory-layout.mjs mallala --gpx "C:/Users/Administrator/Desktop/Australian_Track_GPX/gpx/Mallala_Raceway.gpx"
 *
 * Corner hands/labels always come from app/src/data/tracks.json (and turn
 * verification where present). GPX is geometry only — never invents L/R.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TRACK_GPX = {
  mallala: {
    gpxName: 'Mallala_Raceway.gpx',
    catalogId: 'mallala',
  },
};

const DEFAULT_GPX_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Desktop',
  'Australian_Track_GPX',
  'gpx'
);

const TARGET_POINTS = 720;

function parseArgs(argv) {
  const trackId = argv[2];
  let gpxPath = null;
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === '--gpx' && argv[i + 1]) {
      gpxPath = argv[++i];
    }
  }
  return { trackId, gpxPath };
}

function extractTrkpts(gpxXml) {
  const segments = [];
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let segMatch;
  while ((segMatch = segRe.exec(gpxXml))) {
    const pts = [];
    const ptRe = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/gi;
    let ptMatch;
    while ((ptMatch = ptRe.exec(segMatch[1]))) {
      pts.push({ lat: Number(ptMatch[1]), lon: Number(ptMatch[2]) });
    }
    if (pts.length >= 8) segments.push(pts);
  }
  return segments;
}

/** Prefer the longest closed-ish segment; else the longest by point count. */
function pickCentreline(segments) {
  if (!segments.length) throw new Error('No trkseg points found in GPX');
  let best = segments[0];
  let bestScore = -1;
  for (const seg of segments) {
    const first = seg[0];
    const last = seg[seg.length - 1];
    const closeM = haversineM(first.lat, first.lon, last.lat, last.lon);
    const closedBonus = closeM < 80 ? 1e6 : 0;
    const score = closedBonus + seg.length;
    if (score > bestScore) {
      bestScore = score;
      best = seg;
    }
  }
  return best;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function projectLocal(pts) {
  const origin = pts[0];
  const toRad = (d) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(origin.lat));
  const meters = pts.map((p) => {
    const x = toRad(p.lon - origin.lon) * 6371000 * cosLat;
    const y = toRad(p.lat - origin.lat) * 6371000;
    return { x, y };
  });
  return meters;
}

function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  return total;
}

/** One Chaikin corner-cutting pass on a closed ring (drops open endpoints). */
function chaikinClosed(pts, iterations = 2) {
  let cur = pts.map((p) => ({ x: p.x, y: p.y }));
  for (let iter = 0; iter < iterations; iter++) {
    const n = cur.length;
    if (n < 4) break;
    const next = [];
    for (let i = 0; i < n; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % n];
      next.push({
        x: 0.75 * a.x + 0.25 * b.x,
        y: 0.75 * a.y + 0.25 * b.y,
      });
      next.push({
        x: 0.25 * a.x + 0.75 * b.x,
        y: 0.25 * a.y + 0.75 * b.y,
      });
    }
    cur = next;
  }
  return cur;
}

function closeLoop(pts) {
  const first = pts[0];
  const last = pts[pts.length - 1];
  const gap = Math.hypot(first.x - last.x, first.y - last.y);
  if (gap > 1) return [...pts, { x: first.x, y: first.y }];
  return pts.map((p, i) => (i === pts.length - 1 ? { x: first.x, y: first.y } : p));
}

/** Resample polyline to N points evenly by distance (including closed end). */
function resample(pts, n) {
  const closed = closeLoop(pts);
  const segLens = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const len = Math.hypot(closed[i].x - closed[i - 1].x, closed[i].y - closed[i - 1].y);
    segLens.push(len);
    total += len;
  }
  if (total < 1) throw new Error('Track length too small');

  const out = [];
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    let acc = 0;
    let placed = false;
    for (let s = 0; s < segLens.length; s++) {
      if (acc + segLens[s] >= target || s === segLens.length - 1) {
        const t = segLens[s] < 1e-9 ? 0 : (target - acc) / segLens[s];
        const a = closed[s];
        const b = closed[s + 1];
        out.push({
          x: a.x + (b.x - a.x) * Math.min(1, Math.max(0, t)),
          y: a.y + (b.y - a.y) * Math.min(1, Math.max(0, t)),
        });
        placed = true;
        break;
      }
      acc += segLens[s];
    }
    if (!placed) out.push({ ...closed[closed.length - 1] });
  }
  return { points: out, lengthM: total };
}

function cumulativeS(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) {
    s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  // close to start
  const close = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y);
  return { s, loopLength: s[s.length - 1] + close };
}

function bearingDeg(a, b) {
  return (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
}

function angleDelta(a, b) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** Peak turn strength along path for placing non-finish corners. */
function turnPeaks(pts, loopLength) {
  const window = 4;
  const peaks = [];
  for (let i = 0; i < pts.length; i++) {
    const i0 = (i - window + pts.length) % pts.length;
    const i1 = i;
    const i2 = (i + window) % pts.length;
    const b0 = bearingDeg(pts[i0], pts[i1]);
    const b1 = bearingDeg(pts[i1], pts[i2]);
    const delta = Math.abs(angleDelta(b0, b1));
    const sNorm = i / pts.length;
    peaks.push({ i, sNorm, strength: delta });
  }
  // Non-max suppression
  const kept = [];
  const sorted = [...peaks].sort((a, b) => b.strength - a.strength);
  for (const p of sorted) {
    if (p.strength < 8) continue;
    if (kept.some((k) => Math.min(Math.abs(k.sNorm - p.sNorm), 1 - Math.abs(k.sNorm - p.sNorm)) < 0.035)) {
      continue;
    }
    kept.push(p);
  }
  kept.sort((a, b) => a.sNorm - b.sNorm);
  return kept;
}

function placeCorners(catalogCorners, pts) {
  const playable = catalogCorners.filter((c) => !c.isFinish);
  const peaks = turnPeaks(pts);
  const corners = [];

  if (peaks.length >= playable.length) {
    // Pick evenly from strongest peaks ordered around the lap
    const step = peaks.length / playable.length;
    for (let i = 0; i < playable.length; i++) {
      const peak = peaks[Math.min(peaks.length - 1, Math.floor(i * step + step / 2))];
      const c = playable[i];
      corners.push({
        id: c.id,
        number: c.number,
        label: c.label,
        direction: c.direction,
        sNorm: round4(peak.sNorm),
      });
    }
  } else {
    // Fallback: even spacing (skip start/finish band)
    for (let i = 0; i < playable.length; i++) {
      const c = playable[i];
      const sNorm = round4((i + 1) / (playable.length + 1));
      corners.push({
        id: c.id,
        number: c.number,
        label: c.label,
        direction: c.direction,
        sNorm,
      });
    }
  }

  corners.sort((a, b) => a.sNorm - b.sNorm);
  return corners;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function main() {
  const { trackId, gpxPath: gpxArg } = parseArgs(process.argv);
  if (!trackId || !TRACK_GPX[trackId]) {
    console.error(`Usage: node scripts/bake-track-memory-layout.mjs <trackId>`);
    console.error(`Known: ${Object.keys(TRACK_GPX).join(', ')}`);
    process.exit(1);
  }

  const meta = TRACK_GPX[trackId];
  const gpxPath = gpxArg || path.join(DEFAULT_GPX_DIR, meta.gpxName);
  if (!fs.existsSync(gpxPath)) {
    console.error(`GPX not found: ${gpxPath}`);
    process.exit(1);
  }

  const catalogPath = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const track = catalog.tracks.find((t) => t.id === meta.catalogId);
  if (!track) {
    console.error(`Catalog track missing: ${meta.catalogId}`);
    process.exit(1);
  }

  const gpxXml = fs.readFileSync(gpxPath, 'utf8');
  const segments = extractTrkpts(gpxXml);
  const raw = pickCentreline(segments);
  const local = projectLocal(raw);
  // Soften polyline corners before even resampling
  const smoothed = chaikinClosed(local, 2);
  const { points, lengthM } = resample(smoothed, TARGET_POINTS);

  // Normalize so centroid is origin (nicer minimap)
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const centered = points.map((p) => ({ x: round2(p.x - cx), y: round2(p.y - cy) }));

  // Prefer previously baked corner stations so Brake Now! / labels stay stable
  const outDir = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');
  const outPath = path.join(outDir, `${trackId}.json`);
  let corners = placeCorners(track.corners, centered);
  if (fs.existsSync(outPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (Array.isArray(prev.corners) && prev.corners.length) {
        const byId = new Map(prev.corners.map((c) => [c.id, c]));
        corners = corners.map((c) => {
          const old = byId.get(c.id);
          return old && typeof old.sNorm === 'number' ? { ...c, sNorm: old.sNorm } : c;
        });
      }
    } catch {
      /* keep freshly placed corners */
    }
  }

  const out = {
    trackId: meta.catalogId,
    name: track.name,
    direction: track.direction,
    lengthM: Math.round(lengthM),
    points: centered,
    corners,
    bakedAt: new Date().toISOString().slice(0, 10),
    sourceGpx: path.basename(gpxPath),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${outPath}`);
  console.log(`  points=${out.points.length} lengthM=${out.lengthM} corners=${out.corners.length}`);
}

main();
