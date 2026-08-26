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
import {
  alignCornersToEvents,
  expandCornerSlots,
  findKinks,
  scoreAlignment,
  snapStationsToVerifiedHands,
  turnEvents,
  turnRate,
} from './lib/track-geometry.mjs';

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
  phillip_island: {
    gpxName: 'phillip_island.gpx',
    catalogId: 'phillip_island',
    gpxDir: ZTRACKS_GPX_DIR,
  },
  // Leave on Desktop Emtron — DEM span ~5 m / KB flat; do not bake elevation
  queensland_raceway: { gpxName: 'Queensland_Raceway.gpx', catalogId: 'queensland_raceway' },
  sandown: { gpxName: 'sandown.gpx', catalogId: 'sandown', gpxDir: ZTRACKS_GPX_DIR, planarSmoothM: 24 },
  smp_brabham: { gpxName: 'Sydney_Motorsport_Park_-_Brabham.gpx', catalogId: 'smp_brabham', planarSmoothM: 22 },
  smp_druitt: { gpxName: 'smp_druitt.gpx', catalogId: 'smp_druitt', gpxDir: ZTRACKS_GPX_DIR },
  smp_gardner: { gpxName: 'Sydney_Motorsport_Park_-_GP.gpx', catalogId: 'smp_gardner' },
  // Emtron (Tallem_* typo) is a single clean lap. The DEM copies are ~2× catalog
  // length and invent a right-hand kink at the entrance to the pit straight.
  the_bend_gt: { gpxName: 'Tallem_Bend_GT.gpx', catalogId: 'the_bend_gt' },
  the_bend_international: {
    gpxName: 'Tallem_Bend_International.gpx',
    catalogId: 'the_bend_international',
  },
  wakefield_park: { gpxName: 'Wakefield_Park_Raceway.gpx', catalogId: 'wakefield_park' },
  wanneroo: { gpxName: 'wanneroo.gpx', catalogId: 'wanneroo', gpxDir: ZTRACKS_GPX_DIR, planarSmoothM: 22 },
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
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--all') all = true;
    if (argv[i] === '--gpx' && argv[i + 1]) {
      gpxPath = argv[++i];
    }
  }
  return {
    trackId: all ? null : trackId === '--all' ? null : trackId,
    gpxPath,
    all,
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

  /*
   * A trace that already returns to its own start is one complete lap. Trimming
   * its head — the start-reversal heuristic misfires on sparse traces, where the
   * first 30 points span a corner — opens a gap of a few hundred metres that then
   * has to be bridged with road nobody rode.
   */
  if (hypot2(pts[0], pts[n - 1]) < 12 && (!targetM || total <= targetM * 1.22)) {
    return pts;
  }

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
      // Keep point j itself: it is the one measured as closing the lap, and on a
      // trace that samples every couple of seconds it can be 100 m of straight
      // away from its neighbour.
      return tightenLoopClose(pts.slice(startIdx, loop.j + 1));
    }

    // The trace may start in the pit lane, so no lap ever returns to point 0.
    // Sweep further starts and keep the tightest single lap of about the right
    // length.
    let best = null;
    const stride = Math.max(1, Math.round(n * 0.02));
    for (let i0 = startIdx + stride; i0 < n * 0.6; i0 += stride) {
      const found = findReturn(i0, 0.85, 1.15, 60);
      if (found && (!best || found.score < best.score)) best = { ...found, i0 };
    }
    if (best) {
      console.log(
        `  cropped ${total.toFixed(0)}m → single lap ${best.travel.toFixed(0)}m` +
          ` from point ${best.i0} (close ${best.gap.toFixed(1)}m)`
      );
      return tightenLoopClose(pts.slice(best.i0, best.j + 1));
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

/**
 * Ease the *sideways* part of the loop-closure gap away.
 *
 * A trace starts and stops on the main straight a few metres apart across the
 * track. Closing that directly turns the offset into a pair of opposing 40 deg
 * breaks — a chicane on the start/finish straight that does not exist.
 *
 * Only the component across the direction of travel is a fault. The component
 * along it is road the trace simply never recorded, and the closing chord
 * covers it correctly; dragging the tail along its own heading would just
 * shorten the lap.
 */
const MAX_LATERAL_CLOSE_M = 25;

function taperLoopClose(pts, blendM = 120) {
  const n = pts.length;
  if (n < 40) return pts;
  const gapX = pts[0].x - pts[n - 1].x;
  const gapY = pts[0].y - pts[n - 1].y;
  if (Math.hypot(gapX, gapY) < 0.5) return pts;

  const tail = pts[Math.max(0, n - 9)];
  const heading = Math.hypot(pts[n - 1].x - tail.x, pts[n - 1].y - tail.y);
  if (heading < 1e-6) return pts;
  const tx = (pts[n - 1].x - tail.x) / heading;
  const ty = (pts[n - 1].y - tail.y) / heading;
  // Normal to the direction of travel
  const lateral = gapX * -ty + gapY * tx;
  if (Math.abs(lateral) < 0.4) return pts;
  if (Math.abs(lateral) > MAX_LATERAL_CLOSE_M) {
    console.log(
      `  WARN loop closes ${lateral.toFixed(1)}m across the track — trace is not one clean lap`
    );
    return pts;
  }

  const dx = -ty * lateral;
  const dy = tx * lateral;
  const cum = cumulativeDist(pts);
  const total = cum[n - 1];
  const blend = Math.min(blendM, total * 0.25);
  const startS = total - blend;
  const out = pts.map((p) => ({ ...p }));
  for (let i = 0; i < n; i++) {
    if (cum[i] <= startS) continue;
    const t = (cum[i] - startS) / blend;
    const w = t * t * (3 - 2 * t);
    out[i].x += dx * w;
    out[i].y += dy * w;
  }
  console.log(
    `  eased ${lateral.toFixed(1)}m sideways loop-closure offset over ${Math.round(blend)}m` +
      ` (total gap ${Math.hypot(gapX, gapY).toFixed(1)}m)`
  );
  return out;
}

/** Unit heading of the trace at an end, measured over a few points. */
function endHeading(pts, atStart) {
  const n = pts.length;
  const span = Math.min(5, n - 1);
  const a = atStart ? pts[0] : pts[n - 1 - span];
  const b = atStart ? pts[span] : pts[n - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/**
 * Fill the road the trace never recorded with a curve that leaves the tail and
 * arrives at the head on their own headings.
 *
 * Chording straight across leaves a heading break that smoothing cannot absorb:
 * corner-cutting trims a fixed *fraction* of each neighbouring segment, so a
 * 100 m chord beside 2 m segments still meets them at a hard angle. That break
 * is what reads as a chicane that isn't there.
 */
function bridgeLoopGap(pts, spacingM) {
  const n = pts.length;
  const a = pts[n - 1];
  const b = pts[0];
  const gap = Math.hypot(b.x - a.x, b.y - a.y);
  if (gap < Math.max(8, spacingM * 2)) return pts;

  const tail = endHeading(pts, false);
  const head = endHeading(pts, true);
  const steps = Math.max(2, Math.round(gap / Math.max(2, spacingM)));
  // Hermite tangents shorter than the span keep the link from bulging sideways
  const m = gap * 0.8;
  const out = pts.map((p) => ({ ...p }));
  for (let k = 1; k < steps; k++) {
    const t = k / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    out.push({
      x: h00 * a.x + h10 * tail.x * m + h01 * b.x + h11 * head.x * m,
      y: h00 * a.y + h10 * tail.y * m + h01 * b.y + h11 * head.y * m,
      z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
    });
  }
  console.log(`  bridged ${gap.toFixed(0)}m of unrecorded road with ${steps - 1} points`);
  return out;
}

/** Low-pass the height profile so the road reads as terrain, not DEM stairsteps. */
function smoothElevation(pts, lengthM, windowM) {
  const n = pts.length;
  const half = Math.max(1, Math.round((windowM / lengthM) * n * 0.5));
  let src = pts.map((p) => p.z ?? 0);
  for (let pass = 0; pass < 2; pass++) {
    const next = new Array(n);
    for (let i = 0; i < n; i++) {
      let acc = 0;
      let wsum = 0;
      for (let k = -half; k <= half; k++) {
        const w = 1 - Math.abs(k) / (half + 1);
        acc += src[(((i + k) % n) + n) % n] * w;
        wsum += w;
      }
      next[i] = acc / wsum;
    }
    src = next;
  }
  return pts.map((p, i) => ({ ...p, z: src[i] }));
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

/** Triangle-smooth the plan so GPS jitter does not become wavy edges. */
function smoothPlanar(pts, lengthM, windowM) {
  const n = pts.length;
  if (n < 8 || lengthM <= 0) return pts;
  const half = Math.max(1, Math.round((windowM / lengthM) * n * 0.5));
  const out = pts.map((p) => ({ ...p }));
  for (let i = 0; i < n; i++) {
    let ax = 0;
    let ay = 0;
    let wsum = 0;
    for (let k = -half; k <= half; k++) {
      const w = 1 - Math.abs(k) / (half + 1);
      const p = pts[(((i + k) % n) + n) % n];
      ax += p.x * w;
      ay += p.y * w;
      wsum += w;
    }
    out[i].x = ax / wsum;
    out[i].y = ay / wsum;
  }
  return out;
}

function ensureCircuitDirection(pts, lengthM, catalogCorners, verifiedHands) {
  const { slots } = expandCornerSlots(catalogCorners, verifiedHands);
  const checked = slots.filter((s) => s.hand).length;
  if (checked < 3) return pts;
  const scoreOf = (ring) => {
    const events = turnEvents(ring, lengthM);
    const al = alignCornersToEvents(slots, events);
    return al ? scoreAlignment(slots, al.pairs).agreed : 0;
  };
  const fwd = scoreOf(pts);
  const revPts = [...pts].reverse();
  const rev = scoreOf(revPts);
  if (rev >= fwd + 2) {
    console.log(`  reversed path (verified hands ${fwd} → ${rev})`);
    return revPts;
  }
  return pts;
}

/**
 * Put s=0 at the start of the pit straight (the straight that feeds T1).
 *
 * Picking the globally longest straight is wrong at Bathurst — Conrod is longer
 * than the pit straight. Prefer a matching-hand feed of hairpin scale, in the
 * 220–1000 m pit-straight band.
 */
function rotateToStraightBeforeT1(pts, lengthM, catalogCorners, verifiedHands) {
  const { slots } = expandCornerSlots(catalogCorners, verifiedHands);
  const t1Hand = slots[0]?.hand ?? null;
  const events = turnEvents(pts, lengthM);
  if (!events.length) return pts;

  const n = pts.length;
  const rate = turnRate(pts, 12);
  const perPoint = lengthM / n;
  const runs = [];
  let runStart = null;
  for (let k = 0; k < n * 2; k++) {
    const i = k % n;
    if (Math.abs(rate[i]) < 0.22) {
      if (runStart === null) runStart = k;
      const lenM = (k - runStart + 1) * perPoint;
      if (lenM > 120 && lenM < lengthM * 0.55) {
        const startI = runStart % n;
        const existing = runs.find((r) => r.startI === startI);
        const rec = { startI, endI: i, lenM };
        if (!existing) runs.push(rec);
        else if (lenM > existing.lenM) Object.assign(existing, rec);
      }
    } else {
      runStart = null;
    }
  }

  const following = (run) => {
    const after = (run.endI + 1) % n;
    let best = null;
    let bestDist = Infinity;
    for (const ev of events) {
      const dist = (ev.startI - after + n) % n;
      if (dist < bestDist) {
        bestDist = dist;
        best = ev;
      }
    }
    return best;
  };

  let best = null;
  let longest = null;
  for (const run of runs) {
    const next = following(run);
    const match = Boolean(t1Hand && next && next.hand === t1Hand);
    const pitBand = run.lenM >= 220 && run.lenM <= 1100;
    const score =
      (match ? 1e6 : 0) +
      (match && pitBand ? 3e5 : 0) +
      run.lenM * 4 +
      (next ? next.totalDeg : 0);
    if (!best || score > best.score) best = { run, next, score, match };
    if (!longest || run.lenM > longest.lenM) longest = { run, next, lenM: run.lenM };
  }
  // When the pit is clearly the longest road and the hand-matching candidate
  // is a short leftover (The Bend's 290 m vs 987 m), take the long one.
  // Skip if the matching candidate is already a real pit (≥400 m) — otherwise
  // Bathurst Conrod (~1089 m) beats the pit.
  if (
    longest &&
    best &&
    best.run.lenM < 400 &&
    longest.lenM > best.run.lenM * 1.7 &&
    longest.lenM > 600
  ) {
    best = { run: longest.run, next: longest.next, score: longest.lenM, match: false };
  }
  if (!best || best.run.startI === 0) return pts;

  console.log(
    `  rotated lap — S/F ${Math.round(best.run.lenM)}m pit straight` +
      (best.next ? ` feeding ${best.next.hand} ${best.next.totalDeg}deg` : '')
  );
  const i = best.run.startI;
  return [...pts.slice(i), ...pts.slice(0, i)];
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

function pathLengthClosed(pts) {
  if (pts.length < 2) return 0;
  let total = pathLength(pts);
  const a = pts[0];
  const b = pts[pts.length - 1];
  total += Math.hypot(a.x - b.x, a.y - b.y);
  return total;
}

/**
 * Place catalog corners on the centreline by matching the *verified* hand
 * sequence to the turns the path actually makes.
 *
 * Turn 1 is the first turn after the start-finish line, so slots consume turn
 * events in lap order from s=0. Corners the geometry cannot place are spread
 * between their placed neighbours rather than dropped.
 */
function placeCorners(catalogCorners, pts, lengthM, verifiedHands) {
  const { playable, slots } = expandCornerSlots(catalogCorners, verifiedHands);
  if (!playable.length) return { corners: [], report: null };

  const events = turnEvents(pts, lengthM);
  const alignment = alignCornersToEvents(slots, events);
  const placed = new Map();
  if (alignment) {
    for (const [slotIdx, ev] of alignment.pairs) {
      const slot = slots[slotIdx];
      if (slot.primary && !placed.has(slot.cornerIndex)) placed.set(slot.cornerIndex, ev.sNorm);
    }
  }

  // Corners with no event of their own sit evenly between the ones that landed
  const sNorms = new Array(playable.length).fill(null);
  for (const [i, s] of placed) sNorms[i] = s;
  for (let i = 0; i < playable.length; i++) {
    if (sNorms[i] != null) continue;
    let before = i - 1;
    while (before >= 0 && sNorms[before] == null) before--;
    let after = i + 1;
    while (after < playable.length && sNorms[after] == null) after++;
    const from = before >= 0 ? sNorms[before] : 0;
    const to = after < playable.length ? sNorms[after] : 1;
    sNorms[i] = from + ((to - from) * (i - before)) / (after - before);
  }

  sNorms.splice(
    0,
    sNorms.length,
    ...snapStationsToVerifiedHands(playable, sNorms, pts, lengthM, verifiedHands)
  );

  const corners = playable.map((c, i) => ({
    id: c.id,
    number: c.number,
    label: c.label,
    direction: c.direction,
    sNorm: round4(Math.min(0.9995, Math.max(0, sNorms[i]))),
  }));

  const score = alignment ? scoreAlignment(slots, alignment.pairs) : { checked: 0, agreed: 0 };
  return {
    corners: corners.sort((a, b) => a.sNorm - b.sNorm),
    report: {
      events: events.length,
      slots: slots.length,
      placed: placed.size,
      total: playable.length,
      handsChecked: score.checked,
      handsAgreed: score.agreed,
    },
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function bakeOne(trackId, gpxArg) {
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
  const cropped = extractSingleLap(local, parseLengthM(track.lengthKm));
  const traceSpacing = pathLength(cropped) / Math.max(1, cropped.length - 1);
  const oneLap = bridgeLoopGap(taperLoopClose(cropped), traceSpacing);
  const smoothed = chaikinClosed(oneLap, 3);
  const approxLen = pathLengthClosed(smoothed);
  const nPoints = targetPointCount(approxLen);
  const resampled = resample(smoothed, nPoints);
  const planar = smoothPlanar(resampled.points, resampled.lengthM, meta.planarSmoothM ?? 14);
  const lengthM = pathLengthClosed(planar);
  // DEM cells are ~30 m and GPS altitude is noisy; smooth here so the renderer
  // can read heights straight off the point list.
  const elevated =
    elevSource && spanRaw >= 5
      ? smoothElevation(planar, lengthM, elevSource === 'dem' ? 130 : 90)
      : planar;

  const cx = elevated.reduce((s, p) => s + p.x, 0) / elevated.length;
  const cy = elevated.reduce((s, p) => s + p.y, 0) / elevated.length;
  const meanZ = elevated.reduce((s, p) => s + (p.z ?? 0), 0) / elevated.length;
  const hasElevation = elevSpanM(elevated) >= 5;
  const centeredRaw = elevated.map((p) => {
    const row = { x: round2(p.x - cx), y: round2(p.y - cy) };
    if (hasElevation) row.z = round2((p.z ?? 0) - meanZ);
    return row;
  });
  const verifiedHands = loadVerifiedHands(meta.catalogId);
  const oriented = ensureCircuitDirection(
    centeredRaw,
    lengthM,
    track.corners,
    verifiedHands
  );
  const centered = rotateToStraightBeforeT1(
    oriented,
    lengthM,
    track.corners,
    verifiedHands
  );
  const elevSpan = hasElevation
    ? Math.round(
        (Math.max(...centered.map((p) => p.z)) - Math.min(...centered.map((p) => p.z))) * 10
      ) / 10
    : 0;

  const outDir = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');
  const outPath = path.join(outDir, `${trackId}.json`);
  const { corners, report } = placeCorners(track.corners, centered, lengthM, verifiedHands);

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
  if (report) {
    console.log(
      `  corners: ${report.placed}/${report.total} on a detected turn` +
        ` (${report.events} turns found, ${report.slots} expected)` +
        `  verified hands ${report.handsAgreed}/${report.handsChecked}`
    );
  }
  const kinks = findKinks(centered).filter((k) => k.deg >= 22);
  if (kinks.length) {
    console.log(
      `  WARN ${kinks.length} sharp kink(s): ` +
        kinks.map((k) => `s=${k.sNorm.toFixed(3)}(${Math.round(k.deg)}deg)`).join(' ')
    );
  }
  return outPath;
}

/** Human-verified turn hands override the catalog for matching purposes. */
function loadVerifiedHands(catalogId) {
  const file = path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json');
  if (!fs.existsSync(file)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data.verifiedHands?.[catalogId] ?? {};
  } catch {
    return {};
  }
}

/**
 * Layouts that exist on disk but must not reach the track picker, with the
 * reason. Keeping this beside the bake stops a re-bake quietly re-listing a
 * layout that was pulled for bad geometry.
 */
const NOT_PLAYABLE = {};

function writeLayoutsTs(bakedIds) {
  const ids = [...bakedIds].filter((id) => !NOT_PLAYABLE[id]).sort();
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

/** Baked but withheld from the picker — see NOT_PLAYABLE in the bake script. */
export const TRACK_MEMORY_NEEDS_REBAKE = ${JSON.stringify(Object.keys(NOT_PLAYABLE), null, 2)} as const;

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
  const { trackId, gpxPath: gpxArg, all } = parseArgs(process.argv);
  if (!all && (!trackId || trackId.startsWith('-') || !TRACK_GPX[trackId] || !TRACK_GPX[trackId]?.gpxName)) {
    console.error(`Usage: node scripts/bake-track-memory-layout.mjs <trackId>|--all`);
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
      bakeOne(id, all ? null : gpxArg);
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
