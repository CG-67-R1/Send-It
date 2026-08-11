import type { TrackMemoryLayout, TrackMemoryPoint } from './types';
import { samplePath } from './physics';

export type RubberStreak = {
  /** Screen quad: TL, TR, BR, BL */
  points: [number, number][];
  opacity: number;
};

export type RoadTrapezoid = {
  /** Screen quad: TL, TR, BR, BL */
  points: [number, number][];
  curbLeft: boolean;
  curbRight: boolean;
  shade: number;
  /** Extra asphalt grain stripe (scrolls with distance). */
  grain: boolean;
  /** Dark rubber race-line streaks (no road lane dashes). */
  rubber: RubberStreak[];
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
const CAM_HEIGHT_M = 1.05;
/** Horizon as fraction of screen height (Y down) — lower = more track ahead. */
const HORIZON_FRAC = 0.34;
const GRAIN_PERIOD_M = 2.4;
const RUBBER_PERIOD_M = 5.8;
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
  if (z <= 0.45) return null;
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

  out.push({ x: 0, z: 1.05, curvature: 0, dist: s + 1.05 });

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
    if (localZ > 1.2) out.push({ x: localX, z: localZ, curvature, dist: s + ds });
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

/** Irregular streak strip inset on a road quad (frac = lateral 0..1). */
export function streakPoly(road: [number, number][], atFrac: number, halfWidthFrac: number): [number, number][] {
  const [tl, tr, br, bl] = road;
  const a = lerp2(tl, tr, atFrac - halfWidthFrac);
  const b = lerp2(tl, tr, atFrac + halfWidthFrac);
  const c = lerp2(bl, br, atFrac + halfWidthFrac);
  const d = lerp2(bl, br, atFrac - halfWidthFrac);
  return [a, b, c, d];
}

/** Thin longitudinal seam / texture strip (legacy helper for grain). */
export function seamPoly(road: [number, number][], atFrac: number, halfWidthFrac = 0.015): string {
  const pts = streakPoly(road, atFrac, halfWidthFrac);
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

function rubberForSegment(midDist: number, road: [number, number][]): RubberStreak[] {
  const phase = ((midDist % RUBBER_PERIOD_M) + RUBBER_PERIOD_M) % RUBBER_PERIOD_M;
  // Dense race-line rubber — most segments get at least a thin streak
  if (phase > RUBBER_PERIOD_M * 0.88) return [];

  const wobble = Math.sin(midDist * 0.31) * 0.045 + Math.sin(midDist * 0.77) * 0.025;
  const mainFrac = 0.5 + wobble;
  const mainHalf = 0.035 + 0.022 * (0.5 + 0.5 * Math.sin(midDist * 0.19));
  const sideFrac = 0.64 + Math.sin(midDist * 0.41) * 0.055;
  const sideHalf = 0.014 + 0.012 * (0.5 + 0.5 * Math.cos(midDist * 0.23));
  const innerFrac = 0.36 + Math.sin(midDist * 0.29) * 0.03;

  const out: RubberStreak[] = [
    {
      points: streakPoly(road, mainFrac, mainHalf),
      opacity: 0.48 + 0.14 * (0.5 + 0.5 * Math.sin(midDist * 0.5)),
    },
    {
      points: streakPoly(road, mainFrac + 0.03, mainHalf * 0.45),
      opacity: 0.22,
    },
  ];
  if (Math.sin(midDist * 0.13) > -0.35) {
    out.push({
      points: streakPoly(road, sideFrac, sideHalf),
      opacity: 0.32,
    });
  }
  if (Math.cos(midDist * 0.09) > 0.15) {
    out.push({
      points: streakPoly(road, innerFrac, 0.012),
      opacity: 0.26,
    });
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
  const roadHalf = 6.2;
  const leanDeg = lean * 36;
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

    // Allow asphalt to the bottom of the screen (no mid-frame grass cutoff)
    const clampY = (p: { sx: number; sy: number }): [number, number] => [
      p.sx,
      Math.min(p.sy, height + 8),
    ];

    const tl = applyLean(...clampY(pbL));
    const tr = applyLean(...clampY(pbR));
    const br = applyLean(...clampY(paR));
    const bl = applyLean(...clampY(paL));
    const roadPts: [number, number][] = [tl, tr, br, bl];

    const midDist = (a.dist + b.dist) * 0.5;
    const curb = a.curvature > 1.8 || b.curvature > 1.8;
    const grain = Math.floor(midDist / GRAIN_PERIOD_M) % 2 === 0;

    const band = 0.5 + 0.5 * Math.sin(midDist * 0.55);
    quads.push({
      points: roadPts,
      curbLeft: curb,
      curbRight: curb,
      shade: 0.28 + 0.42 * (1 - i / samples.length) + band * 0.14,
      grain,
      rubber: rubberForSegment(midDist, roadPts),
    });
  }

  // 150 / 100 / 50 m boards before each corner (outside of the bend)
  const markers: DistanceMarkerBillboard[] = [];
  const maxLook = DRAW_DEPTH * SEG_LEN;
  for (const corner of layout.corners) {
    if (corner.number == null) continue;
    const cornerS = corner.sNorm * layout.lengthM;
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
