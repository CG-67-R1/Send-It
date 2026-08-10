import type { TrackMemoryLayout, TrackMemoryPoint } from './types';
import { samplePath } from './physics';

export type RoadTrapezoid = {
  /** Screen quad: TL, TR, BR, BL */
  points: [number, number][];
  curbLeft: boolean;
  curbRight: boolean;
  shade: number;
  /** Scrolling centre dashed line on this segment. */
  centerDash: boolean;
  /** Extra asphalt grain stripe (scrolls with distance). */
  grain: boolean;
  /** Mid-lane seam marks. */
  seam: boolean;
};

export type DistanceMarkerBillboard = {
  metres: 150 | 100 | 50;
  /** Screen quad: TL, TR, BR, BL */
  points: [number, number][];
  z: number;
  labelX: number;
  labelY: number;
  fontSize: number;
};

export type ProjectedFrame = {
  quads: RoadTrapezoid[];
  markers: DistanceMarkerBillboard[];
  horizonY: number;
  leanDeg: number;
};

const DRAW_DEPTH = 90;
const SEG_LEN = 4.2;
/** Rider eye height above asphalt (metres). */
const CAM_HEIGHT_M = 1.2;
/** Horizon as fraction of screen height (Y down). */
const HORIZON_FRAC = 0.4;
const DASH_PERIOD_M = 9;
const GRAIN_PERIOD_M = 3.2;
const MARKER_DISTANCES = [150, 100, 50] as const;
const BOARD_HALF_W = 0.55;
const BOARD_HEIGHT = 1.15;
const BOARD_OFFSET = 7.4; // metres from centreline (outside asphalt)

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
  const sy = horizonY + CAM_HEIGHT_M * scale;
  return { sx, sy, scale };
}

function localSamples(
  layout: TrackMemoryLayout,
  s: number,
  lateral: number,
  count: number,
  step: number
): { x: number; z: number; curvature: number; dist: number }[] {
  const out: { x: number; z: number; curvature: number; dist: number }[] = [];
  const here = samplePath(layout.points, layout.lengthM, s);
  const tx = here.tangent.x;
  const ty = here.tangent.y;
  const nx = -ty;
  const ny = tx;
  const riderX = here.pos.x + nx * lateral;
  const riderY = here.pos.y + ny * lateral;

  out.push({ x: 0, z: 2.2, curvature: 0, dist: s + 2.2 });

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
    if (localZ > 2.5) out.push({ x: localX, z: localZ, curvature, dist: s + ds });
  }
  return out;
}

function lerp2(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function projectHeight(
  x: number,
  z: number,
  worldY: number,
  width: number,
  horizonY: number,
  fov: number
): { sx: number; sy: number; scale: number } | null {
  if (z <= 0.8) return null;
  const scale = fov / z;
  const sx = width / 2 + x * scale;
  // worldY = height above road; camera at CAM_HEIGHT_M
  const sy = horizonY + (CAM_HEIGHT_M - worldY) * scale;
  return { sx, sy, scale };
}

function wrapDist(s: number, lengthM: number): number {
  return ((s % lengthM) + lengthM) % lengthM;
}

/** Ahead distance from rider s to markerS along the lap (0..lengthM). */
function aheadDist(riderS: number, markerS: number, lengthM: number): number {
  return wrapDist(markerS - riderS, lengthM);
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

  const here = samplePath(layout.points, layout.lengthM, s);
  const tx = here.tangent.x;
  const ty = here.tangent.y;
  const nx = -ty;
  const ny = tx;
  const riderX = here.pos.x + nx * lateral;
  const riderY = here.pos.y + ny * lateral;

  const toLocal = (worldS: number) => {
    const sample = samplePath(layout.points, layout.lengthM, worldS);
    const dx = sample.pos.x - riderX;
    const dy = sample.pos.y - riderY;
    const localZ = dx * tx + dy * ty;
    const localX = dx * ty - dy * tx;
    return { localX, localZ, tangent: sample.tangent };
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

    const maxSy = height * 0.78;
    const clampY = (p: { sx: number; sy: number }): [number, number] => [
      p.sx,
      Math.min(p.sy, maxSy),
    ];

    const tl = applyLean(...clampY(pbL));
    const tr = applyLean(...clampY(pbR));
    const br = applyLean(...clampY(paR));
    const bl = applyLean(...clampY(paL));

    const midDist = (a.dist + b.dist) * 0.5;
    const curb = a.curvature > 1.8 || b.curvature > 1.8;
    const dashPhase = ((midDist % DASH_PERIOD_M) + DASH_PERIOD_M) % DASH_PERIOD_M;
    const centerDash = dashPhase < DASH_PERIOD_M * 0.45;
    const grain = Math.floor(midDist / GRAIN_PERIOD_M) % 2 === 0;
    const seam = Math.floor(midDist / (GRAIN_PERIOD_M * 2.5)) % 2 === 0;

    const band = 0.5 + 0.5 * Math.sin(midDist * 0.55);
    quads.push({
      points: [tl, tr, br, bl],
      curbLeft: curb,
      curbRight: curb,
      shade: 0.32 + 0.4 * (1 - i / samples.length) + band * 0.12,
      centerDash,
      grain,
      seam,
    });
  }

  // 150 / 100 / 50 m boards before each corner (outside of the bend)
  const markers: DistanceMarkerBillboard[] = [];
  const maxLook = DRAW_DEPTH * SEG_LEN;
  for (const corner of layout.corners) {
    if (corner.number == null) continue;
    const cornerS = corner.sNorm * layout.lengthM;
    // Outside of corner from approach POV: left turn → boards on right (+)
    const side =
      corner.direction === 'right' ? -1 : corner.direction === 'left' ? 1 : 1;

    for (const metres of MARKER_DISTANCES) {
      const markerS = wrapDist(cornerS - metres, layout.lengthM);
      const ahead = aheadDist(s, markerS, layout.lengthM);
      if (ahead < 4 || ahead > maxLook) continue;

      const loc = toLocal(markerS);
      if (loc.localZ < 3 || loc.localZ > maxLook) continue;

      const boardX = loc.localX + side * BOARD_OFFSET;
      const bl = projectHeight(boardX - BOARD_HALF_W, loc.localZ, 0.15, width, horizonY, fov);
      const br = projectHeight(boardX + BOARD_HALF_W, loc.localZ, 0.15, width, horizonY, fov);
      const tl = projectHeight(boardX - BOARD_HALF_W, loc.localZ, BOARD_HEIGHT, width, horizonY, fov);
      const tr = projectHeight(boardX + BOARD_HALF_W, loc.localZ, BOARD_HEIGHT, width, horizonY, fov);
      if (!bl || !br || !tl || !tr) continue;

      const pts: [number, number][] = [
        applyLean(tl.sx, tl.sy),
        applyLean(tr.sx, tr.sy),
        applyLean(br.sx, br.sy),
        applyLean(bl.sx, bl.sy),
      ];
      const labelX = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
      const labelY = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
      const boardPxH = Math.abs(pts[3][1] - pts[0][1]);
      const fontSize = Math.max(8, Math.min(28, boardPxH * 0.42));

      markers.push({
        metres,
        points: [pts[0], pts[1], pts[2], pts[3]],
        z: loc.localZ,
        labelX,
        labelY,
        fontSize,
      });
    }
  }

  markers.sort((a, b) => b.z - a.z);

  return { quads, markers, horizonY, leanDeg };
}

/** Centre dashed stripe polygon inset on a road quad. */
export function centerDashPoly(road: [number, number][], halfWidthFrac = 0.04): string {
  const [tl, tr, br, bl] = road;
  const a = lerp2(tl, tr, 0.5 - halfWidthFrac);
  const b = lerp2(tl, tr, 0.5 + halfWidthFrac);
  const c = lerp2(bl, br, 0.5 + halfWidthFrac);
  const d = lerp2(bl, br, 0.5 - halfWidthFrac);
  return `${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`;
}

/** Thin longitudinal seam / texture strip. */
export function seamPoly(road: [number, number][], atFrac: number, halfWidthFrac = 0.015): string {
  const [tl, tr, br, bl] = road;
  const a = lerp2(tl, tr, atFrac - halfWidthFrac);
  const b = lerp2(tl, tr, atFrac + halfWidthFrac);
  const c = lerp2(bl, br, atFrac + halfWidthFrac);
  const d = lerp2(bl, br, atFrac - halfWidthFrac);
  return `${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`;
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
