/**
 * Build Track Details map polylines from repo GPX only.
 *
 * The GPX centreline is the road. Do not Chaikin, RDP-simplify, or taper it.
 * Only drop painted S/F ticks that are not the centreline.
 *
 * Usage: node scripts/build-gpx-track-maps.mjs
 *
 * Writes { trackId, name, polyline } — no corners, pits, sisters, or proof.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACK_DETAILS_IDS } from './lib/track-details-ids.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const APP_OUT = path.join(ROOT, 'app', 'src', 'data', 'gpxTrackMaps');
const ANDROID_OUT = path.join(ROOT, 'android-app', 'src', 'data', 'gpxTrackMaps');
const CATALOG_PATH = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');

const PAD_FRAC = 0.1;
const TARGET_POINTS = 1400;

function round(n, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lon2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function extractTrkpts(gpxXml) {
  const segments = [];
  const segRe = /<trkseg>([\s\S]*?)<\/trkseg>/gi;
  let segMatch;
  while ((segMatch = segRe.exec(gpxXml))) {
    const pts = [];
    const ptRe = /<trkpt\s+([^>]+)>([\s\S]*?)<\/trkpt>/gi;
    let ptMatch;
    while ((ptMatch = ptRe.exec(segMatch[1]))) {
      const lat = /lat="([^"]+)"/i.exec(ptMatch[1]);
      const lon = /lon="([^"]+)"/i.exec(ptMatch[1]);
      if (!lat || !lon) continue;
      pts.push({ lat: Number(lat[1]), lon: Number(lon[1]) });
    }
    if (pts.length >= 8) segments.push(pts);
  }
  return segments;
}

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

function projectLocal(pts) {
  const origin = pts[0];
  const toRad = (d) => (d * Math.PI) / 180;
  const cosLat = Math.cos(toRad(origin.lat));
  return pts.map((p) => ({
    x: toRad(p.lon - origin.lon) * 6371000 * cosLat,
    y: toRad(p.lat - origin.lat) * 6371000,
  }));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cumulative(points) {
  const acc = [0];
  for (let i = 1; i < points.length; i++) {
    acc.push(acc[i - 1] + dist(points[i - 1], points[i]));
  }
  return acc;
}

function parseLengthM(lengthKm) {
  const m = String(lengthKm || '').match(/([\d.]+)/);
  return m ? Number(m[1]) * 1000 : null;
}

/** Keep one closed lap when the GPX is a double-pass or out-and-back. */
function extractSingleLap(pts, targetM) {
  const n = pts.length;
  if (n < 24) return pts;
  const cum = cumulative(pts);
  const traced = cum[n - 1];
  // A multi-lap trace is also closed end-to-end, so the start/end gap cannot
  // decide this. Traced distance against the catalog length is what tells us
  // whether more than one lap was recorded.
  if (!targetM || traced <= targetM * 1.22) return pts;

  const minT = targetM * 0.88;
  const maxT = targetM * 1.12;
  let best = null;
  for (let i = 0; i < n; i++) {
    if (traced - cum[i] < minT) break;
    for (let j = i + 20; j < n; j++) {
      const travel = cum[j] - cum[i];
      if (travel < minT) continue;
      if (travel > maxT) break;
      const gap = dist(pts[i], pts[j]);
      if (gap > 40) continue;
      const score = gap + Math.abs(travel - targetM) * 0.05;
      if (!best || score < best.score) best = { i, j, score };
    }
  }
  if (!best) {
    throw new Error(
      `traced ${Math.round(traced)} m is ${(traced / targetM).toFixed(2)} laps of ` +
        `${Math.round(targetM)} m and no single closing lap was found`
    );
  }
  return pts.slice(best.i, best.j + 1);
}

function perpDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function rdp(points, epsilon) {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const d = perpDist(points[i], points[0], points[last]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[last]];
}

function downsample(points) {
  if (points.length <= TARGET_POINTS) return points;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  let epsilon = span / 1800;
  let out = rdp(points, epsilon);
  let guard = 0;
  while (out.length > TARGET_POINTS && guard < 14) {
    epsilon *= 1.25;
    out = rdp(points, epsilon);
    guard += 1;
  }
  return out;
}

function heading(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function angDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Drop a vertex that is a needle off the centreline (S/F paint tick, GPS spike).
 * Skipping it must be almost as short as going via the point, and the detour
 * must be sideways — not a real hairpin.
 */
function stripSpikes(pts) {
  let out = pts;
  for (let pass = 0; pass < 6; pass += 1) {
    if (out.length < 5) return out;
    const next = [out[0]];
    let dropped = 0;
    for (let i = 1; i < out.length - 1; i += 1) {
      const a = out[i - 1];
      const b = out[i];
      const c = out[i + 1];
      const mid = dist(a, c);
      const via = dist(a, b) + dist(b, c);
      const extra = via - mid;
      if (mid > 2 && extra > 8 && via > mid * 1.55) {
        dropped += 1;
        continue;
      }
      next.push(b);
    }
    next.push(out[out.length - 1]);
    out = next;
    if (!dropped) break;
  }
  return out;
}

/**
 * Remove short out-and-back spurs (classic S/F marker: leave the straight,
 * cross the road, come back). Hairpins do not return within ~8 m after 12–50 m.
 */
function stripSpurs(pts) {
  if (pts.length < 8) return pts;
  const acc = cumulative(pts);
  const keep = pts.map(() => true);
  for (let i = 0; i < pts.length; i += 1) {
    if (!keep[i]) continue;
    for (let j = i + 3; j < pts.length && acc[j] - acc[i] < 55; j += 1) {
      const path = acc[j] - acc[i];
      const gap = dist(pts[i], pts[j]);
      if (path < 12 || gap > 8 || path < gap * 2.2) continue;
      const before = Math.max(0, i - 3);
      const after = Math.min(pts.length - 1, j + 3);
      const mainH = heading(pts[before], pts[after]);
      const mid = pts[Math.floor((i + j) / 2)];
      const spurH = heading(pts[i], mid);
      if (Math.abs(angDelta(mainH, spurH)) < 0.7) continue;
      for (let k = i + 1; k < j; k += 1) keep[k] = false;
      break;
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** S/F ticks often sit on the lap join. Inspect the wrapped start/end only. */
function stripJoinSpur(pts) {
  if (pts.length < 16) return pts;
  const acc = cumulative(pts);
  const total = acc[acc.length - 1] || 1;
  let headN = 0;
  while (headN < pts.length - 1 && acc[headN] < 45) headN += 1;
  let tailStart = pts.length - 1;
  while (tailStart > 1 && acc[tailStart] > total - 45) tailStart -= 1;
  if (headN < 3 || tailStart >= pts.length - 2) return pts;

  const wrap = pts.slice(tailStart).concat(pts.slice(0, headN + 1));
  const tailLen = pts.length - tailStart;
  const wacc = cumulative(wrap);
  const keep = wrap.map(() => true);
  for (let i = 0; i < wrap.length; i += 1) {
    if (!keep[i]) continue;
    for (let j = i + 3; j < wrap.length && wacc[j] - wacc[i] < 55; j += 1) {
      const path = wacc[j] - wacc[i];
      const gap = dist(wrap[i], wrap[j]);
      if (path < 12 || gap > 8 || path < gap * 2.2) continue;
      const before = Math.max(0, i - 3);
      const after = Math.min(wrap.length - 1, j + 3);
      const mainH = heading(wrap[before], wrap[after]);
      const mid = wrap[Math.floor((i + j) / 2)];
      const spurH = heading(wrap[i], mid);
      if (Math.abs(angDelta(mainH, spurH)) < 0.7) continue;
      for (let k = i + 1; k < j; k += 1) keep[k] = false;
      break;
    }
  }

  const drop = new Set();
  keep.forEach((ok, k) => {
    if (ok) return;
    const orig = k < tailLen ? tailStart + k : k - tailLen;
    drop.add(orig);
  });
  if (drop.size === 0) return pts;
  return pts.filter((_, i) => !drop.has(i));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Typical step length, ignoring the longest 15% (chords / S/F ticks). */
function bodyMedianStep(pts) {
  const steps = [];
  for (let i = 1; i < pts.length; i += 1) steps.push(dist(pts[i - 1], pts[i]));
  if (!steps.length) return 10;
  const sorted = [...steps].sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor(sorted.length * 0.85));
  return median(sorted.slice(0, cut)) || 10;
}

/** Drop a start/end vertex that jumps far off the lap body. */
function dropFarEndJumps(pts) {
  if (pts.length < 12) return pts;
  let out = pts.slice();
  for (let guard = 0; guard < 8 && out.length > 24; guard += 1) {
    const limit = Math.max(100, bodyMedianStep(out) * 8);
    const tail = dist(out[out.length - 2], out[out.length - 1]);
    let changed = false;
    if (tail > limit) {
      out = out.slice(0, -1);
      changed = true;
    }
    if (out.length > 24 && dist(out[0], out[1]) > limit) {
      out = out.slice(1);
      changed = true;
    } else if (
      out.length > 26 &&
      dist(out[0], out[1]) < 50 &&
      dist(out[1], out[2]) > limit
    ) {
      out = out.slice(1);
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

/**
 * Some exports sample track *width* at the start (short cross, long along)
 * before switching to a centreline. Skip that prefix.
 */
function skipWidthBarPrefix(pts) {
  if (pts.length < 24) return pts;
  let i = 0;
  let pairs = 0;
  while (i + 2 < pts.length && i < 30) {
    const a = dist(pts[i], pts[i + 1]);
    const b = dist(pts[i + 1], pts[i + 2]);
    const ang = Math.abs(angDelta(heading(pts[i], pts[i + 1]), heading(pts[i + 1], pts[i + 2])));
    const perp = Math.abs(ang - Math.PI / 2) < 0.6;
    if (!((a < 50 && b > 90 && perp) || (a > 90 && b < 50 && perp))) break;
    pairs += 1;
    i += 1;
  }
  if (pairs < 3) return pts;
  for (let k = i; k < pts.length - 12; k += 1) {
    const segs = [];
    for (let j = 0; j < 12; j += 1) segs.push(dist(pts[k + j], pts[k + j + 1]));
    if (median(segs) < 22) return pts.slice(k);
  }
  return pts.slice(i);
}

/**
 * Painted S/F line: first few points cross the road (or go out-and-back)
 * then the lap heading begins.
 */
function dropLeadingPaint(pts) {
  if (pts.length < 16) return pts;
  let best = null;
  for (let cut = 1; cut <= 8; cut += 1) {
    if (cut + 5 >= pts.length) break;
    const a = pts[cut];
    const b = pts[cut + 4];
    if (dist(a, b) < 12) continue;
    const trackH = heading(a, b);
    let prefix = 0;
    let maxPerp = 0;
    for (let i = 0; i < cut; i += 1) {
      if (i > 0) prefix += dist(pts[i - 1], pts[i]);
      maxPerp = Math.max(maxPerp, perpDist(pts[i], a, b));
    }
    const gap = dist(pts[0], a);
    const paintH = heading(pts[0], pts[Math.max(1, cut - 1)]);
    const ang = Math.abs(angDelta(paintH, trackH));
    const sideways = Math.abs(ang - Math.PI / 2) < 0.8 || ang > 0.85;
    const outAndBack = prefix > 10 && gap < 22 && prefix > gap * 1.25;
    if (prefix >= 90 || maxPerp < 4.5) continue;
    if (!(outAndBack || (sideways && maxPerp > 6))) continue;
    const score = maxPerp + (outAndBack ? 15 : 0) + (Math.abs(ang - Math.PI / 2) < 0.35 ? 10 : 0);
    if (!best || score > best.score) best = { cut, score };
  }
  return best ? pts.slice(best.cut) : pts;
}

/**
 * Start and end sit a few metres apart *across* the straight. Connecting
 * them draws the S/F tick as road. Ease only the sideways component.
 */
function straightenJoin(pts) {
  const n = pts.length;
  if (n < 24) return pts;
  const tail = heading(pts[n - 8], pts[n - 1]);
  const head = heading(pts[0], pts[7]);
  if (Math.abs(angDelta(tail, head)) > 0.22) return pts;
  const hx = Math.cos((tail + head) / 2);
  const hy = Math.sin((tail + head) / 2);
  const origin = {
    x: (pts[0].x + pts[n - 1].x) / 2,
    y: (pts[0].y + pts[n - 1].y) / 2,
  };
  const project = (p) => {
    const vx = p.x - origin.x;
    const vy = p.y - origin.y;
    const along = vx * hx + vy * hy;
    return { x: origin.x + hx * along, y: origin.y + hy * along };
  };
  const out = pts.map((p) => ({ x: p.x, y: p.y }));
  const span = 6;
  for (let i = 0; i < span; i += 1) {
    const t = 1 - i / span;
    const a = project(out[i]);
    out[i].x = out[i].x * (1 - t) + a.x * t;
    out[i].y = out[i].y * (1 - t) + a.y * t;
    const j = n - 1 - i;
    const b = project(out[j]);
    out[j].x = out[j].x * (1 - t) + b.x * t;
    out[j].y = out[j].y * (1 - t) + b.y * t;
  }
  return out;
}

function taperLoopClose(pts, blendM = 120) {
  const n = pts.length;
  if (n < 40) return pts;
  const gapX = pts[0].x - pts[n - 1].x;
  const gapY = pts[0].y - pts[n - 1].y;
  const gap = Math.hypot(gapX, gapY);
  if (gap < 0.5) return pts;
  const tail = pts[Math.max(0, n - 9)];
  const hLen = Math.hypot(pts[n - 1].x - tail.x, pts[n - 1].y - tail.y);
  if (hLen < 1e-6) return pts;
  const tx = (pts[n - 1].x - tail.x) / hLen;
  const ty = (pts[n - 1].y - tail.y) / hLen;
  const lateral = gapX * -ty + gapY * tx;
  if (Math.abs(lateral) < 0.4 || Math.abs(lateral) > 25) return pts;
  const dx = -ty * lateral;
  const dy = tx * lateral;
  const cum = cumulative(pts);
  const total = cum[n - 1];
  const blend = Math.min(blendM, total * 0.25);
  const startS = total - blend;
  const out = pts.map((p) => ({ x: p.x, y: p.y }));
  for (let i = 0; i < n; i += 1) {
    if (cum[i] <= startS) continue;
    const t = (cum[i] - startS) / blend;
    const w = t * t * (3 - 2 * t);
    out[i].x += dx * w;
    out[i].y += dy * w;
  }
  return out;
}

function chaikinClosed(pts, iterations = 1) {
  let cur = pts.map((p) => ({ x: p.x, y: p.y }));
  const gap = dist(cur[0], cur[cur.length - 1]);
  const ring = gap < 60;
  if (ring && gap > 1e-6) cur = cur.slice(0, -1);
  else if (gap < 1e-6) cur = cur.slice(0, -1);
  for (let iter = 0; iter < iterations; iter += 1) {
    const n = cur.length;
    if (n < 4) break;
    const next = [];
    const last = ring ? n : n - 1;
    for (let i = 0; i < last; i += 1) {
      const a = cur[i];
      const b = cur[ring ? (i + 1) % n : i + 1];
      next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    if (!ring) next.push(cur[n - 1]);
    cur = next;
  }
  return ring ? closeLoop(cur) : cur;
}

/** Drop a leftover 0–100-space tick (short ~90° fold). */
function stripPolyTicks(pl) {
  if (pl.length < 8) return pl;
  const out = [pl[0]];
  for (let i = 1; i < pl.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = pl[i];
    const c = pl[i + 1];
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const h0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const h1 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = h1 - h0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const mid = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (Math.min(ab, bc) < 1.8 && Math.abs(d) > 0.9 && ab + bc > mid * 1.25) continue;
    out.push(b);
  }
  out.push(pl[pl.length - 1]);
  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    const close = Math.hypot(first[0] - last[0], first[1] - last[1]);
    if (close > 1e-6 && close < 3.5) {
      out.push([first[0], first[1]]);
    }
  }
  return out;
}

/**
 * Druitt's GPX is width-bar samples then a dense centreline then a jump.
 * Other circuits must not use this — long straights are real road.
 */
function closeBestLap(pts, targetM) {
  const n = pts.length;
  if (n < 40) return pts;
  const cum = cumulative(pts);
  const total = cum[n - 1];
  const minT = targetM ? targetM * 0.65 : total * 0.7;
  const maxT = targetM ? targetM * 1.15 : total;
  const stride = Math.max(1, Math.floor(n / 80));
  let best = null;
  for (let i = 0; i < n * 0.4; i += stride) {
    for (let j = i + 20; j < n; j += 1) {
      const travel = cum[j] - cum[i];
      if (travel < minT) continue;
      if (travel > maxT) break;
      const gap = dist(pts[i], pts[j]);
      if (gap > 80) continue;
      const score = gap + Math.abs(travel - (targetM || travel)) * 0.1;
      if (!best || score < best.score) best = { i, j, score };
    }
  }
  if (!best) return pts;
  return pts.slice(best.i, best.j + 1);
}

/** Old Emtron scribble only. A closed one-lap GPX is already the road. */
function druittNeedsScribbleClean(pts, targetM) {
  if (!pts.length) return false;
  const traced = cumulative(pts)[pts.length - 1];
  const closeM = dist(pts[0], pts[pts.length - 1]);
  if (targetM && traced <= targetM * 1.22 && traced >= targetM * 0.9 && closeM < 80) {
    return false;
  }
  return true;
}

function druittCentreline(pts) {
  if (pts.length < 40) return pts;
  let start = 0;
  for (let i = 0; i < pts.length - 16; i += 1) {
    let ok = true;
    for (let j = 0; j < 15; j += 1) {
      if (dist(pts[i + j], pts[i + j + 1]) > 40) {
        ok = false;
        break;
      }
    }
    if (ok) {
      start = i;
      break;
    }
  }
  let end = pts.length;
  for (let i = pts.length - 1; i > start + 16; i -= 1) {
    if (dist(pts[i - 1], pts[i]) > 80) {
      end = i;
      break;
    }
  }
  const out = pts.slice(start, end);
  return out.length >= 40 ? out : pts;
}

/** Pick the prefix/suffix pair that actually meets, so the close doesn't chord grass. */
function tightenLoopClose(pts) {
  const n = pts.length;
  if (n < 40) return pts;
  const origGap = dist(pts[0], pts[n - 1]);
  if (origGap < 8) return pts;
  const headN = Math.min(36, Math.floor(n * 0.08));
  const tailN = Math.min(36, Math.floor(n * 0.08));
  let best = { i: 0, j: n - 1, score: origGap + 20, gap: origGap };
  for (let i = 0; i < headN; i += 1) {
    const hi = heading(pts[i], pts[Math.min(n - 1, i + 3)]);
    for (let j = n - tailN; j < n; j += 1) {
      if (j - i < n * 0.72) continue;
      const gap = dist(pts[i], pts[j]);
      if (gap > 40) continue;
      const hj = heading(pts[Math.max(0, j - 3)], pts[j]);
      const score = gap + Math.abs(angDelta(hi, hj)) * 10;
      if (score < best.score) best = { i, j, score, gap };
    }
  }
  if (best.gap > origGap - 3) return pts;
  return pts.slice(best.i, best.j + 1);
}

function stripStartFinishMarks(pts, trackId) {
  let cleaned = skipWidthBarPrefix(dropFarEndJumps(pts));
  if (trackId === 'smp_druitt') cleaned = druittCentreline(cleaned);
  cleaned = dropLeadingPaint(cleaned);
  cleaned = dropLeadingPaint(cleaned.slice().reverse()).reverse();
  cleaned = dropFarEndJumps(cleaned);
  cleaned = dropEndStubs(stripJoinSpur(stripSpurs(stripSpikes(cleaned))));
  cleaned = tightenLoopClose(cleaned);
  cleaned = taperLoopClose(cleaned);
  cleaned = straightenJoin(cleaned);
  if (cleaned.length < 32) return pts;
  return cleaned;
}

/**
 * GPX often starts on a painted S/F tick: first/last vertex sits ~track-width
 * off the straight. Closing the loop then draws that tick as part of the ribbon.
 */
function dropEndStubs(pts) {
  let out = pts.slice();
  for (let guard = 0; guard < 2 && out.length > 10; guard += 1) {
    let changed = false;
    if (perpDist(out[0], out[1], out[2]) > 6 && dist(out[0], out[1]) < 40) {
      out = out.slice(1);
      changed = true;
    }
    const n = out.length;
    if (n > 10 && perpDist(out[n - 1], out[n - 2], out[n - 3]) > 6 && dist(out[n - 1], out[n - 2]) < 40) {
      out = out.slice(0, -1);
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

function closeLoop(points) {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const gap = dist(first, last);
  if (gap < 1e-6) return points;
  if (gap > 60) return points;
  return [...points, { x: first.x, y: first.y }];
}

function toPolyline(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * PAD_FRAC;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = span / 2 + pad;
  const size = half * 2;
  const originX = cx - half;
  const originY = cy - half;
  return points.map((p) => [
    round(((p.x - originX) / size) * 100),
    round((1 - (p.y - originY) / size) * 100),
  ]);
}

function buildOne(trackId, catalogName, targetM) {
  const gpxPath = path.join(GPX_DIR, `${trackId}.gpx`);
  if (!fs.existsSync(gpxPath)) {
    throw new Error(`Missing GPX ${path.relative(ROOT, gpxPath)}`);
  }
  const xml = fs.readFileSync(gpxPath, 'utf8');
  const raw = projectLocal(pickCentreline(extractTrkpts(xml)));
  const prepped =
    trackId === 'smp_druitt' && druittNeedsScribbleClean(raw, targetM)
      ? closeBestLap(druittCentreline(skipWidthBarPrefix(dropFarEndJumps(raw))), targetM)
      : raw;
  const lap = extractSingleLap(prepped, targetM);
  const tracedM = cumulative(prepped)[prepped.length - 1];
  const lapM = cumulative(lap)[lap.length - 1];
  if (targetM && lapM > targetM * 1.22) {
    throw new Error(
      `${trackId}: kept lap is ${Math.round(lapM)} m = ${(lapM / targetM).toFixed(2)} laps of ` +
        `catalog ${Math.round(targetM)} m (traced ${Math.round(tracedM)} m). ` +
        `A map from this draws the ribbon and the guide line more than once.`
    );
  }
  if (targetM && lapM < targetM * 0.9) {
    throw new Error(
      `${trackId}: trace covers only ${Math.round(lapM)} m of the ${Math.round(targetM)} m ` +
        `catalog lap (${Math.round((lapM / targetM) * 100)}%). The GPX is an incomplete lap.`
    );
  }
  // Paint ticks are not the centreline. Do not Chaikin, RDP, or taper —
  // those change the road the GPX actually rode.
  const geo = dropLeadingPaint(dropLeadingPaint(lap.slice().reverse()).reverse());
  const paintDropped = lap.length - geo.length;
  if (paintDropped > 0) {
    console.log(`  ${trackId}  dropped ${paintDropped} S/F paint pts (centreline unchanged)`);
  }
  const polyline = toPolyline(closeLoop(geo));
  if (polyline.length < 32) {
    throw new Error(`${trackId}: polyline too short (${polyline.length})`);
  }
  return {
    trackId,
    name: catalogName || trackId,
    polyline,
  };
}

function writeIndex(outDir, maps) {
  const rows = maps.map((m) => {
    const varName = m.trackId.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    return { id: m.trackId, varName };
  });
  const imports = rows
    .map((r) => `import ${r.varName} from './${r.id}.json';`)
    .join('\n');
  const entries = rows.map((r) => `  ${r.id}: ${r.varName} as GpxTrackMap,`).join('\n');
  const body = `${imports}
import type { GpxTrackMap } from './types';

const MAPS: Record<string, GpxTrackMap> = {
${entries}
};

export const GPX_TRACK_MAP_IDS = Object.keys(MAPS);

export function getGpxTrackMap(trackId: string): GpxTrackMap | undefined {
  return MAPS[trackId];
}

export function listGpxTrackMaps(): { id: string; name: string }[] {
  return GPX_TRACK_MAP_IDS.map((id) => ({ id, name: MAPS[id].name }));
}
`;
  fs.writeFileSync(path.join(outDir, 'index.ts'), body);
}

function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const names = Object.fromEntries((catalog.tracks || []).map((t) => [t.id, t.name]));
  const lengths = Object.fromEntries(
    (catalog.tracks || []).map((t) => [t.id, parseLengthM(t.lengthKm)])
  );

  fs.mkdirSync(APP_OUT, { recursive: true });
  fs.mkdirSync(ANDROID_OUT, { recursive: true });

  // Named ids rebuild a subset and leave index.ts alone; no args does the lot.
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const ids = requested.length ? requested : TRACK_DETAILS_IDS;

  // Build every track before writing anything, so one bad GPX cannot leave a
  // half-updated map set on disk.
  const maps = [];
  const failures = [];
  for (const id of ids) {
    try {
      maps.push(buildOne(id, names[id], lengths[id]));
    } catch (err) {
      failures.push(`${id}: ${err.message}`);
    }
  }
  if (failures.length) {
    console.error(`\nFAIL ${failures.length} track(s) rejected, nothing written:`);
    for (const line of failures) console.error(`  - ${line}`);
    process.exit(1);
  }

  for (const map of maps) {
    const json = `${JSON.stringify(map, null, 2)}\n`;
    fs.writeFileSync(path.join(APP_OUT, `${map.trackId}.json`), json);
    fs.writeFileSync(path.join(ANDROID_OUT, `${map.trackId}.json`), json);
    console.log(`  ${map.trackId}  pts ${map.polyline.length}`);
  }

  if (requested.length) {
    console.log(`Rebuilt ${maps.length} track(s); index.ts left as is`);
    return;
  }

  const types = `export type GpxTrackMap = {
  trackId: string;
  name: string;
  polyline: number[][];
};
`;
  fs.writeFileSync(path.join(APP_OUT, 'types.ts'), types);
  fs.writeFileSync(path.join(ANDROID_OUT, 'types.ts'), types);
  writeIndex(APP_OUT, maps);
  writeIndex(ANDROID_OUT, maps);

  console.log(`Wrote ${maps.length} GPX maps to ${path.relative(ROOT, APP_OUT)} and android-app copy`);
}

main();
