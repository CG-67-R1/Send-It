/**
 * The Track Details bake must call the detector with these options — the
 * same autonomous run as scripts/export-gpx-corner-maps.mjs.
 *
 * Corner markers use the detector polyline (the test PNG), fitted into the
 * same 0–100 box as build-gpx-track-maps.mjs, then snapped onto the live
 * ribbon so they stay on the road.
 */
import { RIDER_PROFILE, detectCornersFromGpxFile } from './gpx-corner-detector.mjs';

/** Must match scripts/build-gpx-track-maps.mjs PAD_FRAC. */
const PAD_FRAC = 0.1;

export function detectForTrackDetails(gpxPath, options = {}) {
  return detectCornersFromGpxFile(gpxPath, {
    profile: RIDER_PROFILE,
    expectedLengthM: Number.isFinite(options.expectedLengthM) ? options.expectedLengthM : null,
    strictLapIsolation: false,
    includeGeometry: true,
    startFinishCornerShift: Number.isInteger(options.startFinishCornerShift)
      ? options.startFinishCornerShift
      : 0,
  });
}

/** Local-metre detector points → 0–100 map units (north up). */
export function fitDetectorToMapUnits(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
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
    ((p[0] - originX) / size) * 100,
    (1 - (p[1] - originY) / size) * 100,
  ]);
}

function dropClosedDuplicate(pts) {
  if (pts.length < 2) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05) return pts.slice(0, -1);
  return pts;
}

/** Closest point on the live ribbon. Keeps a fitted detector index on the road. */
export function snapToRibbon(point, polyline) {
  const ring = dropClosedDuplicate(polyline);
  let best = point;
  let bestD = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const len2 = abx * abx + aby * aby;
    let t = 0;
    if (len2 > 1e-12) {
      t = Math.max(0, Math.min(1, ((point[0] - a[0]) * abx + (point[1] - a[1]) * aby) / len2));
    }
    const q = [a[0] + abx * t, a[1] + aby * t];
    const d = Math.hypot(point[0] - q[0], point[1] - q[1]);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

export function pointOnFitted(fitted, index) {
  if (!fitted.length) return [50, 50];
  const i = ((Number(index) % fitted.length) + fitted.length) % fitted.length;
  return fitted[i];
}
