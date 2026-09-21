export type MapPoint = [number, number];

function dist(a: MapPoint, b: MapPoint): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Closest point on the GPX polyline (map units). */
export function snapToRibbon(point: MapPoint, polyline: number[][]): MapPoint {
  if (polyline.length < 2) return point;
  let best: MapPoint = [polyline[0][0], polyline[0][1]];
  let bestD = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a: MapPoint = [polyline[i][0], polyline[i][1]];
    const b: MapPoint = [polyline[i + 1][0], polyline[i + 1][1]];
    const snapped = closestOnSegment(point, a, b);
    const d = dist(point, snapped);
    if (d < bestD) {
      bestD = d;
      best = snapped;
    }
  }
  return best;
}

function closestOnSegment(p: MapPoint, a: MapPoint, b: MapPoint): MapPoint {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-12) return a;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2));
  return [a[0] + abx * t, a[1] + aby * t];
}

/** Screen/view coords → 0–100 map units for a full-layout SVG. */
export function viewToMapPoint(
  locationX: number,
  locationY: number,
  width: number,
  height: number
): MapPoint | null {
  if (width <= 0 || height <= 0) return null;
  return [(locationX / width) * 100, (locationY / height) * 100];
}

/**
 * Signed area of a closed polyline. In SVG (y down), a positive value is
 * clockwise on the picture. Used only to aim the rider's direction chevron —
 * never to set a corner hand.
 */
export function polylineSignedArea(polyline: number[][]): number {
  if (polyline.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polyline.length; i++) {
    const a = polyline[i];
    const b = polyline[(i + 1) % polyline.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

export type DirectionArrow = { base: MapPoint; tip: MapPoint; left: MapPoint; right: MapPoint };

/** Chevron on the ribbon from S/F in the chosen circuit direction. */
export function directionArrowOnRibbon(
  polyline: number[][],
  startFinish: MapPoint,
  direction: 'clockwise' | 'anticlockwise',
  travel = 6
): DirectionArrow | null {
  if (polyline.length < 3) return null;
  const loc = nearestSegment(startFinish, polyline);
  if (!loc) return null;
  const clockwiseOnPicture = polylineSignedArea(polyline) > 0;
  const forward = direction === 'clockwise' ? clockwiseOnPicture : !clockwiseOnPicture;
  const tip = walkAlong(polyline, loc.index, loc.t, travel, forward);
  if (!tip) return null;
  const base = startFinish;
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const wing = 1.6;
  return {
    base,
    tip,
    left: [tip[0] - (dx / len) * 2.2 + nx * wing, tip[1] - (dy / len) * 2.2 + ny * wing],
    right: [tip[0] - (dx / len) * 2.2 - nx * wing, tip[1] - (dy / len) * 2.2 - ny * wing],
  };
}

function nearestSegment(
  point: MapPoint,
  polyline: number[][]
): { index: number; t: number } | null {
  let bestI = 0;
  let bestT = 0;
  let bestD = Infinity;
  const n = polyline.length;
  for (let i = 0; i < n; i++) {
    const a: MapPoint = [polyline[i][0], polyline[i][1]];
    const b: MapPoint = [polyline[(i + 1) % n][0], polyline[(i + 1) % n][1]];
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const len2 = abx * abx + aby * aby;
    const t = len2 < 1e-12 ? 0 : Math.max(0, Math.min(1, ((point[0] - a[0]) * abx + (point[1] - a[1]) * aby) / len2));
    const d = dist(point, [a[0] + abx * t, a[1] + aby * t]);
    if (d < bestD) {
      bestD = d;
      bestI = i;
      bestT = t;
    }
  }
  return { index: bestI, t: bestT };
}

function walkAlong(
  polyline: number[][],
  startIndex: number,
  startT: number,
  distance: number,
  forward: boolean
): MapPoint | null {
  const n = polyline.length;
  let remaining = distance;
  let i = startIndex;
  let t = startT;
  let guard = 0;
  while (remaining > 0 && guard < n + 2) {
    guard += 1;
    const a: MapPoint = [polyline[i][0], polyline[i][1]];
    const nextI = forward ? (i + 1) % n : (i - 1 + n) % n;
    const b: MapPoint = [polyline[nextI][0], polyline[nextI][1]];
    const from: MapPoint = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const to = forward ? b : a;
    const seg = dist(from, to);
    if (seg >= remaining || seg < 1e-9) {
      const u = seg < 1e-9 ? 0 : remaining / seg;
      return [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u];
    }
    remaining -= seg;
    if (forward) {
      i = nextI;
      t = 0;
    } else {
      i = (i - 1 + n) % n;
      t = 1;
    }
  }
  return null;
}

export function hitBadge(
  point: MapPoint,
  badges: { id: string; at: MapPoint }[],
  radius = 6
): string | null {
  let best: string | null = null;
  let bestD = radius;
  for (const badge of badges) {
    const d = dist(point, badge.at);
    if (d <= bestD) {
      bestD = d;
      best = badge.id;
    }
  }
  return best;
}
