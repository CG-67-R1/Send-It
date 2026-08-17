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

/** Optional gpxDir: repo-relative folder (defaults to Desktop Emtron GPX). */
const ZTRACKS_GPX_DIR = 'scripts/track-memory-gpx';

const TRACK_GPX = {
  baskerville: {
    gpxName: 'baskerville.gpx',
    catalogId: 'baskerville',
    gpxDir: ZTRACKS_GPX_DIR,
  },
  broadford: { gpxName: 'broadford.gpx', catalogId: 'broadford', gpxDir: ZTRACKS_GPX_DIR },
  calder_park: { gpxName: 'calder_park.gpx', catalogId: 'calder_park', gpxDir: ZTRACKS_GPX_DIR },
  hidden_valley: {
    gpxName: 'hidden_valley.gpx',
    catalogId: 'hidden_valley',
    gpxDir: ZTRACKS_GPX_DIR,
  },
  mac_park: { gpxName: 'mac_park.gpx', catalogId: 'mac_park', gpxDir: ZTRACKS_GPX_DIR },
  mallala: { gpxName: 'mallala.gpx', catalogId: 'mallala', gpxDir: ZTRACKS_GPX_DIR },
  morgan_park: { gpxName: 'morgan_park.gpx', catalogId: 'morgan_park', gpxDir: ZTRACKS_GPX_DIR },
  mount_panorama: { gpxName: 'Mount_Panorama.gpx', catalogId: 'mount_panorama' },
  phillip_island: {
    gpxName: 'phillip_island.gpx',
    catalogId: 'phillip_island',
    gpxDir: ZTRACKS_GPX_DIR,
  },
  // Leave on Desktop Emtron — DEM span ~5 m / KB flat; do not bake elevation
  queensland_raceway: { gpxName: 'Queensland_Raceway.gpx', catalogId: 'queensland_raceway' },
  sandown: { gpxName: 'sandown.gpx', catalogId: 'sandown', gpxDir: ZTRACKS_GPX_DIR },
  smp_brabham: { gpxName: 'Sydney_Motorsport_Park_-_Brabham.gpx', catalogId: 'smp_brabham' },
  smp_druitt: { gpxName: 'smp_druitt.gpx', catalogId: 'smp_druitt', gpxDir: ZTRACKS_GPX_DIR },
  smp_gardner: { gpxName: 'Sydney_Motorsport_Park_-_GP.gpx', catalogId: 'smp_gardner' },
  the_bend_gt: { gpxName: 'the_bend_gt.gpx', catalogId: 'the_bend_gt', gpxDir: ZTRACKS_GPX_DIR },
  the_bend_international: {
    gpxName: 'the_bend_international.gpx',
    catalogId: 'the_bend_international',
    gpxDir: ZTRACKS_GPX_DIR,
  },
  wakefield_park: { gpxName: 'Wakefield_Park_Raceway.gpx', catalogId: 'wakefield_park' },
  wanneroo: { gpxName: 'wanneroo.gpx', catalogId: 'wanneroo', gpxDir: ZTRACKS_GPX_DIR },
  winton: { gpxName: 'winton.gpx', catalogId: 'winton', gpxDir: ZTRACKS_GPX_DIR },
  lakeside: { gpxName: 'lakeside.gpx', catalogId: 'lakeside', gpxDir: ZTRACKS_GPX_DIR },
};

const BAKEABLE = Object.entries(TRACK_GPX)
  .filter(([, meta]) => meta && meta.gpxName)
  .map(([id]) => id);

const DEFAULT_GPX_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Desktop',
  'Australian_Track_GPX',
  'gpx'
);

/** ~1.85 m spacing (Mallala density); clamped for short/long circuits. */
function targetPointCount(lengthM) {
  return Math.max(700, Math.min(2200, Math.round(lengthM / 1.85)));
}

function parseArgs(argv) {
  const trackId = argv[2];
  let gpxPath = null;
  let all = false;
  let freshCorners = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--all') all = true;
    if (argv[i] === '--fresh-corners') freshCorners = true;
    if (argv[i] === '--gpx' && argv[i + 1]) {
      gpxPath = argv[++i];
    }
  }
  return {
    trackId: all ? null : trackId === '--all' ? null : trackId,
    gpxPath,
    all,
    freshCorners,
  };
}

function extractTrkpts(gpxXml) {
  const segments = [];
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let segMatch;
  while ((segMatch = segRe.exec(gpxXml))) {
    const pts = [];
    const ptRe = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
    let ptMatch;
    while ((ptMatch = ptRe.exec(segMatch[1]))) {
      const eleM = /<ele>([^<]+)<\/ele>/i.exec(ptMatch[3] || '');
      pts.push({
        lat: Number(ptMatch[1]),
        lon: Number(ptMatch[2]),
        ele: eleM ? Number(eleM[1]) : 0,
      });
    }
    if (pts.length >= 8) segments.push(pts);
  }
  return segments;
}

function elevSpanM(pts) {
  const eles = pts.map((p) => p.ele ?? p.z ?? 0).filter((e) => Number.isFinite(e));
  if (!eles.length) return 0;
  return Math.max(...eles) - Math.min(...eles);
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
    return { x, y, z: Number.isFinite(p.ele) ? p.ele : 0 };
  });
  return meters;
}

function parseLengthM(lengthKm) {
  const m = String(lengthKm || '').match(/([\d.]+)/);
  return m ? Number(m[1]) * 1000 : null;
}

function hypot2(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cumulativeDist(pts) {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + hypot2(pts[i], pts[i - 1]));
  return c;
}

/** Skip GPS out-and-back scribbles at the start of a trace. */
function startReversalIndex(pts) {
  if (pts.length < 24) return 0;
  const probe = Math.min(30, pts.length - 1);
  let hx = 0;
  let hy = 0;
  for (let i = 10; i < probe; i++) {
    hx += pts[i].x - pts[i - 1].x;
    hy += pts[i].y - pts[i - 1].y;
  }
  const len = Math.hypot(hx, hy) || 1;
  hx /= len;
  hy /= len;
  let i = 1;
  while (i < 18) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const step = Math.hypot(dx, dy) || 1;
    if ((dx * hx + dy * hy) / step > 0.25) break;
    i += 1;
  }
  return Math.max(0, i - 1);
}

function bearingXY(a, b) {
  return Math.atan2(b.x - a.x, b.y - a.y);
}

function angDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Drop a GPS U-turn / out-and-back in the first 80 m (not a real T1). */
function skipInitialUTurn(pts) {
  const cum = cumulativeDist(pts);
  for (let i = 4; i < pts.length - 4; i++) {
    if (cum[i] > 80) break;
    const h0 = bearingXY(pts[i - 4], pts[i]);
    const h1 = bearingXY(pts[i], pts[i + 4]);
    if (Math.abs(angDelta(h0, h1)) < 2.4) continue;
    let j = i + 1;
    while (j < pts.length && cum[j] - cum[i] < 20) j += 1;
    return j;
  }
  return 0;
}

/** Pick the prefix/suffix pair that actually meets, so the close doesn't chord across grass. */
function tightenLoopClose(pts) {
  const n = pts.length;
  if (n < 40) return pts;
  const origGap = hypot2(pts[0], pts[n - 1]);
  if (origGap < 8) return pts;
  const headN = Math.min(36, Math.floor(n * 0.08));
  const tailN = Math.min(36, Math.floor(n * 0.08));
  let best = { i: 0, j: n - 1, score: origGap + 20, gap: origGap };
  for (let i = 0; i < headN; i++) {
    const hi = bearingXY(pts[i], pts[Math.min(n - 1, i + 3)]);
    for (let j = n - tailN; j < n; j++) {
      if (j - i < n * 0.72) continue;
      const gap = hypot2(pts[i], pts[j]);
      if (gap > 40) continue;
      const hj = bearingXY(pts[Math.max(0, j - 3)], pts[j]);
      const score = gap + Math.abs(angDelta(hi, hj)) * 10;
      if (score < best.score) best = { i, j, score, gap };
    }
  }
  if (best.gap > origGap - 3) return pts;
  console.log(`  tightened loop close by ${best.i}+${n - 1 - best.j} pts (gap ${origGap.toFixed(1)}→${best.gap.toFixed(1)}m)`);
  return pts.slice(best.i, best.j + 1);
}

/**
 * Keep one closed circuit. Multi-lap GPX splices reverse at the join —
 * the bike rides onto grass then snaps back onto the asphalt.
 */
function extractSingleLap(pts, targetM) {
  const n = pts.length;
  if (n < 24) return pts;
  const cum = cumulativeDist(pts);
  const total = cum[n - 1] + hypot2(pts[0], pts[n - 1]);
  const startIdx = Math.max(startReversalIndex(pts), skipInitialUTurn(pts));

  const findReturn = (i0, minRatio, maxRatio, maxGap) => {
    if (!targetM) return null;
    const start = pts[i0];
    const minT = targetM * minRatio;
    const maxT = targetM * maxRatio;
    let best = null;
    for (let j = i0 + 16; j < n; j++) {
      const travel = cum[j] - cum[i0];
      if (travel < minT) continue;
      if (travel > maxT) break;
      const gap = hypot2(pts[j], start);
      if (gap > maxGap) continue;
      const score = gap + Math.abs(travel - targetM) * 0.12;
      if (!best || score < best.score) best = { j, travel, gap, score };
    }
    return best;
  };

  if (targetM && total > targetM * 1.22) {
    const loop = findReturn(startIdx, 0.7, 1.22, 90);
    if (loop) {
      console.log(
        `  cropped extra lap ${total.toFixed(0)}m → ${loop.travel.toFixed(0)}m (close ${loop.gap.toFixed(1)}m)`
      );
      return tightenLoopClose(pts.slice(startIdx, loop.j));
    }
    console.log(
      `  WARN path ${total.toFixed(0)}m vs catalog ${targetM.toFixed(0)}m — left uncropped`
    );
  }

  if (startIdx > 0) {
    console.log(`  trimmed ${startIdx} start-reversal points`);
    return pts.slice(startIdx);
  }
  return pts;
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
  let cur = pts.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
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
        z: 0.75 * a.z + 0.25 * b.z,
      });
      next.push({
        x: 0.25 * a.x + 0.75 * b.x,
        y: 0.25 * a.y + 0.75 * b.y,
        z: 0.25 * a.z + 0.75 * b.z,
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
  if (gap > 1) return [...pts, { x: first.x, y: first.y, z: first.z ?? 0 }];
  return pts.map((p, i) =>
    i === pts.length - 1 ? { x: first.x, y: first.y, z: first.z ?? 0 } : p
  );
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
        const u = Math.min(1, Math.max(0, t));
        const a = closed[s];
        const b = closed[s + 1];
        out.push({
          x: a.x + (b.x - a.x) * u,
          y: a.y + (b.y - a.y) * u,
          z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * u,
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
function turnPeaks(pts, minCount = 8) {
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

  // Allow enough peaks for dense catalogs (e.g. Mac Park 12 turns)
  const minSpacing = Math.min(0.035, 0.8 / Math.max(minCount, 6));
  const strengthFloors = [8, 5, 3, 1.5];

  for (const floor of strengthFloors) {
    const kept = [];
    const sorted = [...peaks].sort((a, b) => b.strength - a.strength);
    for (const p of sorted) {
      if (p.strength < floor) continue;
      if (
        kept.some(
          (k) =>
            Math.min(Math.abs(k.sNorm - p.sNorm), 1 - Math.abs(k.sNorm - p.sNorm)) < minSpacing
        )
      ) {
        continue;
      }
      kept.push(p);
    }
    kept.sort((a, b) => a.sNorm - b.sNorm);
    if (kept.length >= minCount) return kept;
    if (floor === strengthFloors[strengthFloors.length - 1]) return kept;
  }
  return [];
}

function pathLengthClosed(pts) {
  if (pts.length < 2) return 0;
  let total = pathLength(pts);
  const a = pts[0];
  const b = pts[pts.length - 1];
  total += Math.hypot(a.x - b.x, a.y - b.y);
  return total;
}

/**
 * Place catalog corners on the centreline.
 * Assign in turn-number order to peaks sorted around the lap so T1..Tn
 * advance in circuit order (avoids late-lap clustering / number scramble).
 */
function placeCorners(catalogCorners, pts) {
  const playable = catalogCorners
    .filter((c) => !c.isFinish)
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
  const peaks = turnPeaks(pts, playable.length);
  const corners = [];

  const evenFallback = (i, n) => round4((i + 0.55) / Math.max(1, n));

  if (peaks.length === 0) {
    for (let i = 0; i < playable.length; i++) {
      const c = playable[i];
      corners.push({
        id: c.id,
        number: c.number,
        label: c.label,
        direction: c.direction,
        sNorm: evenFallback(i, playable.length),
      });
    }
    return corners.sort((a, b) => a.sNorm - b.sNorm);
  }

  // Keep the strongest N peaks, then assign turn 1..N in circuit order
  const selected = [...peaks]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, playable.length)
    .sort((a, b) => a.sNorm - b.sNorm);

  for (let i = 0; i < playable.length; i++) {
    const c = playable[i];
    const sNorm = selected[i] ? selected[i].sNorm : evenFallback(i, playable.length);
    corners.push({
      id: c.id,
      number: c.number,
      label: c.label,
      direction: c.direction,
      sNorm: round4(sNorm),
    });
  }

  // Ensure strictly increasing sNorm in turn-number order (unwrap duplicates)
  corners.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  for (let i = 1; i < corners.length; i++) {
    if (corners[i].sNorm <= corners[i - 1].sNorm) {
      corners[i].sNorm = round4(Math.min(0.995, corners[i - 1].sNorm + 0.012));
    }
  }

  return corners.sort((a, b) => a.sNorm - b.sNorm);
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function bakeOne(trackId, gpxArg, freshCorners = false) {
  const meta = TRACK_GPX[trackId];
  if (!meta || !meta.gpxName) {
    throw new Error(`No GPX mapping for ${trackId}`);
  }
  const gpxPath =
    gpxArg ||
    (meta.gpxDir
      ? path.join(ROOT, meta.gpxDir, meta.gpxName)
      : path.join(DEFAULT_GPX_DIR, meta.gpxName));
  if (!fs.existsSync(gpxPath)) {
    throw new Error(`GPX not found: ${gpxPath}`);
  }

  const catalogPath = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const track = catalog.tracks.find((t) => t.id === meta.catalogId);
  if (!track) {
    throw new Error(`Catalog track missing: ${meta.catalogId}`);
  }

  const gpxXml = fs.readFileSync(gpxPath, 'utf8');
  const segments = extractTrkpts(gpxXml);
  const raw = pickCentreline(segments);
  const spanRaw = elevSpanM(raw);
  const elevSource = spanRaw >= 5 ? (meta.gpxDir ? 'dem' : 'gpx') : null;
  const local = projectLocal(raw);
  const oneLap = extractSingleLap(local, parseLengthM(track.lengthKm));
  const smoothed = chaikinClosed(oneLap, 3);
  const approxLen = pathLengthClosed(smoothed);
  const nPoints = targetPointCount(approxLen);
  const { points, lengthM } = resample(smoothed, nPoints);

  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const meanZ = points.reduce((s, p) => s + (p.z ?? 0), 0) / points.length;
  const hasElevation = elevSpanM(points) >= 5;
  const centered = points.map((p) => {
    const row = { x: round2(p.x - cx), y: round2(p.y - cy) };
    if (hasElevation) row.z = round2((p.z ?? 0) - meanZ);
    return row;
  });
  const elevSpan = hasElevation
    ? Math.round(
        (Math.max(...centered.map((p) => p.z)) - Math.min(...centered.map((p) => p.z))) * 10
      ) / 10
    : 0;

  const outDir = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');
  const outPath = path.join(outDir, `${trackId}.json`);
  let corners = placeCorners(track.corners, centered);
  // Keep prior stations stable unless --fresh-corners is requested
  if (!freshCorners && fs.existsSync(outPath)) {
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
    ...(hasElevation
      ? { hasElevation: true, elevSpanM: elevSpan, elevSource: elevSource || 'gpx' }
      : {}),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${outPath}`);
  console.log(
    `  points=${out.points.length} lengthM=${out.lengthM} corners=${out.corners.length}` +
      (hasElevation ? ` elevSpan=${elevSpan}m (${out.elevSource})` : ' flat')
  );
  return outPath;
}

function writeLayoutsTs(bakedIds) {
  const ids = [...bakedIds].sort();
  const rows = ids.map((id) => ({
    id,
    varName: id.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()),
  }));

  const importBlock = rows
    .map((r) => `import ${r.varName} from '../data/trackMemory/${r.id}.json';`)
    .join('\n');
  const layoutEntries = rows.map((r) => `  ${r.id}: ${r.varName} as TrackMemoryLayout,`).join('\n');

  const missing = Object.entries(TRACK_GPX)
    .filter(([, meta]) => !meta)
    .map(([id]) => id)
    .sort();

  const body = `${importBlock}
import type { TrackMemoryLayout } from './types';

const LAYOUTS: Record<string, TrackMemoryLayout> = {
${layoutEntries}
};

export const TRACK_MEMORY_TRACK_IDS = Object.keys(LAYOUTS);

/** Catalog track ids with no Emtron GPX bake yet. */
export const TRACK_MEMORY_MISSING_GPX = ${JSON.stringify(missing, null, 2)} as const;

export function getTrackMemoryLayout(trackId: string): TrackMemoryLayout | undefined {
  return LAYOUTS[trackId];
}

export function getDefaultTrackMemoryLayout(): TrackMemoryLayout {
  return LAYOUTS.mallala ?? LAYOUTS[TRACK_MEMORY_TRACK_IDS[0]];
}

/** Layouts available for the Track Memory game (id + display name). */
export function listTrackMemoryTracks(): { id: string; name: string }[] {
  return TRACK_MEMORY_TRACK_IDS.map((id) => {
    const layout = LAYOUTS[id];
    return { id, name: layout.name };
  });
}
`;

  const outPath = path.join(ROOT, 'app', 'src', 'trackMemory', 'layouts.ts');
  fs.writeFileSync(outPath, body);
  console.log(`Updated ${outPath} (${ids.length} layouts)`);
}

function main() {
  const { trackId, gpxPath: gpxArg, all, freshCorners } = parseArgs(process.argv);
  if (!all && (!trackId || trackId.startsWith('-') || !TRACK_GPX[trackId] || !TRACK_GPX[trackId]?.gpxName)) {
    console.error(`Usage: node scripts/bake-track-memory-layout.mjs <trackId>|--all [--fresh-corners]`);
    console.error(`Bakeable: ${BAKEABLE.join(', ')}`);
    const missing = Object.entries(TRACK_GPX)
      .filter(([, m]) => !m)
      .map(([id]) => id);
    if (missing.length) console.error(`No GPX yet: ${missing.join(', ')}`);
    process.exit(1);
  }

  const ids = all ? BAKEABLE : [trackId];
  const baked = [];
  let failed = 0;
  for (const id of ids) {
    try {
      bakeOne(id, all ? null : gpxArg, freshCorners);
      baked.push(id);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${id}: ${err.message || err}`);
    }
  }

  // Always merge with any existing JSON layouts on disk
  const outDir = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');
  const onDisk = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
  writeLayoutsTs(onDisk);

  if (failed) process.exit(1);
}

main();
