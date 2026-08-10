import type { TrackMemoryLayout, TrackMemoryPoint } from './types';
import { samplePath } from './physics';

export type RoadTrapezoid = {
  /** Screen quad: TL, TR, BR, BL */
  points: [number, number][];
  curbLeft: boolean;
  curbRight: boolean;
  shade: number;
};

export type ProjectedFrame = {
  quads: RoadTrapezoid[];
  horizonY: number;
  leanDeg: number;
};

const DRAW_DEPTH = 90;
const SEG_LEN = 4.5;

function project(
  x: number,
  z: number,
  width: number,
  height: number,
  camHeight: number,
  fov: number
): { sx: number; sy: number; scale: number } | null {
  if (z <= 0.5) return null;
  const scale = fov / z;
  const sx = width / 2 + x * scale;
  const sy = height / 2 + camHeight * scale;
  return { sx, sy, scale };
}

/**
 * Build upcoming centreline samples in rider-local frame (x right, z forward).
 */
function localSamples(
  layout: TrackMemoryLayout,
  s: number,
  lateral: number,
  count: number,
  step: number
): { x: number; z: number; curvature: number }[] {
  const out: { x: number; z: number; curvature: number }[] = [];
  const here = samplePath(layout.points, layout.lengthM, s);
  const tx = here.tangent.x;
  const ty = here.tangent.y;
  // Left normal (perpendicular)
  const nx = -ty;
  const ny = tx;
  const riderX = here.pos.x + nx * lateral;
  const riderY = here.pos.y + ny * lateral;

  let prevLocalX = 0;
  for (let i = 1; i <= count; i++) {
    const ds = i * step;
    const sample = samplePath(layout.points, layout.lengthM, s + ds);
    const dx = sample.pos.x - riderX;
    const dy = sample.pos.y - riderY;
    // Forward = tangent, right = (ty, -tx)
    const localZ = dx * tx + dy * ty;
    const localX = dx * ty - dy * tx;
    const curvature = Math.abs(localX - prevLocalX);
    prevLocalX = localX;
    if (localZ > 1) out.push({ x: localX, z: localZ, curvature });
  }
  return out;
}

export function projectRoad(
  layout: TrackMemoryLayout,
  s: number,
  lateral: number,
  lean: number,
  width: number,
  height: number
): ProjectedFrame {
  const samples = localSamples(layout, s, lateral, DRAW_DEPTH, SEG_LEN);
  const camHeight = -height * 0.08;
  const fov = width * 0.55;
  const roadHalf = 5.8;
  const leanDeg = lean * 14;
  const leanRad = (leanDeg * Math.PI) / 180;
  const cosL = Math.cos(leanRad);
  const sinL = Math.sin(leanRad);

  const applyLean = (sx: number, sy: number): [number, number] => {
    const cx = width / 2;
    const cy = height * 0.55;
    const dx = sx - cx;
    const dy = sy - cy;
    return [cx + dx * cosL - dy * sinL, cy + dx * sinL + dy * cosL];
  };

  const quads: RoadTrapezoid[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const paL = project(a.x - roadHalf, a.z, width, height, camHeight, fov);
    const paR = project(a.x + roadHalf, a.z, width, height, camHeight, fov);
    const pbL = project(b.x - roadHalf, b.z, width, height, camHeight, fov);
    const pbR = project(b.x + roadHalf, b.z, width, height, camHeight, fov);
    if (!paL || !paR || !pbL || !pbR) continue;

    const tl = applyLean(pbL.sx, pbL.sy);
    const tr = applyLean(pbR.sx, pbR.sy);
    const br = applyLean(paR.sx, paR.sy);
    const bl = applyLean(paL.sx, paL.sy);

    const curb = a.curvature > 1.8 || b.curvature > 1.8;
    quads.push({
      points: [tl, tr, br, bl],
      curbLeft: curb,
      curbRight: curb,
      shade: 0.35 + 0.45 * (1 - i / samples.length),
    });
  }

  const horizonY = height * 0.42;
  return { quads, horizonY, leanDeg };
}

export function minimapBounds(points: TrackMemoryPoint[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}
