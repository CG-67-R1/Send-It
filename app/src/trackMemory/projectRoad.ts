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
const SEG_LEN = 4.2;
/** Rider eye height above asphalt (metres). */
const CAM_HEIGHT_M = 1.2;
/** Horizon as fraction of screen height (Y down). */
const HORIZON_FRAC = 0.4;

function project(
  x: number,
  z: number,
  width: number,
  horizonY: number,
  fov: number
): { sx: number; sy: number; scale: number } | null {
  if (z <= 0.8) return null;
  const scale = fov / z;
  const sx = width / 2 + x * scale;
  // Road lies below the camera → larger screen Y (toward bottom).
  const sy = horizonY + CAM_HEIGHT_M * scale;
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
  const nx = -ty;
  const ny = tx;
  const riderX = here.pos.x + nx * lateral;
  const riderY = here.pos.y + ny * lateral;

  // Near clip so asphalt meets the cockpit instead of floating above it.
  out.push({ x: 0, z: 2.2, curvature: 0 });

  let prevLocalX = 0;
  for (let i = 1; i <= count; i++) {
    const ds = i * step;
    const sample = samplePath(layout.points, layout.lengthM, s + ds);
    const dx = sample.pos.x - riderX;
    const dy = sample.pos.y - riderY;
    const localZ = dx * tx + dy * ty;
    const localX = dx * ty - dy * tx;
    const curvature = Math.abs(localX - prevLocalX);
    prevLocalX = localX;
    if (localZ > 2.5) out.push({ x: localX, z: localZ, curvature });
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
  const horizonY = height * HORIZON_FRAC;
  const fov = width * 0.62;
  const roadHalf = 5.8;
  const leanDeg = lean * 28;
  const leanRad = (leanDeg * Math.PI) / 180;
  const cosL = Math.cos(leanRad);
  const sinL = Math.sin(leanRad);

  const applyLean = (sx: number, sy: number): [number, number] => {
    const cx = width / 2;
    const cy = horizonY + (height - horizonY) * 0.35;
    const dx = sx - cx;
    const dy = sy - cy;
    return [cx + dx * cosL - dy * sinL, cy + dx * sinL + dy * cosL];
  };

  const quads: RoadTrapezoid[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const paL = project(a.x - roadHalf, a.z, width, horizonY, fov);
    const paR = project(a.x + roadHalf, a.z, width, horizonY, fov);
    const pbL = project(b.x - roadHalf, b.z, width, horizonY, fov);
    const pbR = project(b.x + roadHalf, b.z, width, horizonY, fov);
    if (!paL || !paR || !pbL || !pbR) continue;

    // Clamp near edge so it sits just above the cockpit band (~bottom 30%).
    const maxSy = height * 0.78;
    const clampY = (p: { sx: number; sy: number }): [number, number] => [
      p.sx,
      Math.min(p.sy, maxSy),
    ];

    const tl = applyLean(...clampY(pbL));
    const tr = applyLean(...clampY(pbR));
    const br = applyLean(...clampY(paR));
    const bl = applyLean(...clampY(paL));

    const curb = a.curvature > 1.8 || b.curvature > 1.8;
    quads.push({
      points: [tl, tr, br, bl],
      curbLeft: curb,
      curbRight: curb,
      shade: 0.35 + 0.45 * (1 - i / samples.length),
    });
  }

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
