import type { TrackMemoryLayout, TrackMemoryPoint } from './types';
import { DISTANCE_BOARD_M } from './coachCues';
import { cornerNeedsDistanceBoards, samplePath } from './physics';

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
};

const DRAW_DEPTH = 220;
const SEG_LEN = 1.0;
/** Rider eye height above asphalt (metres). */
const CAM_HEIGHT_M = 1.05;
/** Horizon as fraction of screen height (Y down) — lower = more track ahead. */
const HORIZON_FRAC = 0.34;
const GRAIN_PERIOD_M = 2.4;
const RUBBER_PERIOD_M = 5.8;
const MARKER_DISTANCES = DISTANCE_BOARD_M;
const BOARD_HALF_W = 0.55;
const BOARD_HEIGHT = 1.15;
const BOARD_OFFSET = 7.4; // metres from centreline (outside asphalt)
/** |signed path curvature| above this gets inside rumble (per metre of path). */
const CURB_CURV_THRESH = 0.028;
/** Half-window (m) around catalog corner apex for kerb paint. */
const CURB_CORNER_HALF_M = 32;
/**
 * Subtle DEM/GPX spans (e.g. PI ~25 m) get a mild visual boost so Lukey reads;
 * big circuits (Bathurst) stay 1:1.
 */
function elevVisualGain(layout: TrackMemoryLayout): number {
  if (!layout.hasElevation) return 0;
  const span = layout.elevSpanM ?? 0;
  if (span < 8) return 0;
  if (span < 45) return 2.0;
  return 1.0;
}

function projectHeight(
  x: number,
  z: number,
  worldY: number,
  width: number,
  horizonY: number,
  fov: number
): { sx: number; sy: number; scale: number } | null {
  if (z <= 0.18) return null;
  const scale = fov / z;
  const sx = width / 2 + x * scale;
  const sy = horizonY + (CAM_HEIGHT_M - worldY) * scale;
  return { sx, sy, scale };
}

type RoadSample = {
  x: number;
  z: number;
  /** Elevation relative to rider (metres, pre-gain). */
  elev: number;
  /** Signed path bend: neg ≈ left, pos ≈ right (matches upcomingBend). */
  signedCurv: number;
  dist: number;
};

function wrapDist(s: number, lengthM: number): number {
  return ((s % lengthM) + lengthM) % lengthM;
}

/** Ahead distance from rider s to markerS along the lap (0..lengthM). */
function aheadDist(riderS: number, markerS: number, lengthM: number): number {
  return wrapDist(markerS - riderS, lengthM);
}

function nearestAlongTrack(a: number, b: number, lengthM: number): number {
  return Math.min(wrapDist(a - b, lengthM), wrapDist(b - a, lengthM));
}

/** Catalog corner kerbs — hands from tracks.json only. */
function catalogCurbAt(
  layout: TrackMemoryLayout,
  dist: number
): { left: boolean; right: boolean } {
  let left = false;
  let right = false;
  for (const corner of layout.corners) {
    if (corner.number == null) continue;
    const cornerS = corner.sNorm * layout.lengthM;
    if (nearestAlongTrack(dist, cornerS, layout.lengthM) > CURB_CORNER_HALF_M) continue;
    if (corner.direction === 'left') left = true;
    if (corner.direction === 'right') right = true;
  }
  return { left, right };
}

function localSamples(
  layout: TrackMemoryLayout,
  s: number,
  lateral: number,
  count: number,
  step: number,
  camHeading: number
): RoadSample[] {
  const out: RoadSample[] = [];
  const here = samplePath(layout.points, layout.lengthM, s);
  const riderElev = here.pos.z ?? 0;
  // Smoothed camera frame (matches samplePath atan2(tx, ty) convention)
  const tx = Math.sin(camHeading);
  const ty = Math.cos(camHeading);
  const nx = -ty;
  const ny = tx;
  const riderX = here.pos.x + nx * lateral;
  const riderY = here.pos.y + ny * lateral;

  let prevTan = here.tangent;
  for (let i = 1; i <= count; i++) {
    const ds = i * step;
    const sample = samplePath(layout.points, layout.lengthM, s + ds);
    const dx = sample.pos.x - riderX;
    const dy = sample.pos.y - riderY;
    const localZ = dx * tx + dy * ty;
    const localX = dx * ty - dy * tx;
    const cross = prevTan.x * sample.tangent.y - prevTan.y * sample.tangent.x;
    const signedCurv = cross / Math.max(0.5, step);
    prevTan = sample.tangent;
    if (localZ > 0.55) {
      out.push({
        x: localX,
        z: localZ,
        elev: (sample.pos.z ?? 0) - riderElev,
        signedCurv,
        dist: s + ds,
      });
    }
  }

  // Near rings continue the nearest path lateral (do not snap x→0 — that kinks edges inward)
  if (out.length >= 1) {
    const a = out[0];
    const b = out.length >= 2 ? out[1] : null;
    const xAt = (z: number) => {
      if (!b || Math.abs(b.z - a.z) < 1e-3) return a.x;
      return a.x + ((b.x - a.x) * (z - a.z)) / (b.z - a.z);
    };
    const elevAt = (z: number) => {
      if (!b || Math.abs(b.z - a.z) < 1e-3) return a.elev;
      return a.elev + ((b.elev - a.elev) * (z - a.z)) / (b.z - a.z);
    };
    const nearZs = [0.4, 0.85];
    for (let i = nearZs.length - 1; i >= 0; i--) {
      const z = nearZs[i];
      if (z >= a.z) continue;
      out.unshift({
        x: xAt(z),
        z,
        elev: elevAt(z),
        signedCurv: a.signedCurv,
        dist: s + z,
      });
    }
  }
  return out;
}

function lerp2(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
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
  width: number,
  height: number,
  camHeading?: number
): ProjectedFrame {
  const here = samplePath(layout.points, layout.lengthM, s);
  const heading = camHeading ?? here.heading;
  const samples = localSamples(layout, s, lateral, DRAW_DEPTH, SEG_LEN, heading);
  const horizonY = height * HORIZON_FRAC;
  const fov = width * 0.62;
  const roadHalf = 6.2;
  const elevGain = elevVisualGain(layout);
  const riderElev = here.pos.z ?? 0;

  // Roll stays flat (cockpit leans). Elevation pitches the road surface only.
  // Do not clamp X: clipping to the viewport bends edge lines inward under the bike.
  const toScreen = (p: { sx: number; sy: number }): [number, number] => [
    p.sx,
    Math.min(p.sy, height + 8),
  ];

  const tx = Math.sin(heading);
  const ty = Math.cos(heading);
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
    const elev = ((sample.pos.z ?? 0) - riderElev) * elevGain;
    return { localX, localZ, elev, tangent: sample.tangent };
  };

  const quads: RoadTrapezoid[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const elevA = a.elev * elevGain;
    const elevB = b.elev * elevGain;
    const paL = projectHeight(a.x - roadHalf, a.z, elevA, width, horizonY, fov);
    const paR = projectHeight(a.x + roadHalf, a.z, elevA, width, horizonY, fov);
    const pbL = projectHeight(b.x - roadHalf, b.z, elevB, width, horizonY, fov);
    const pbR = projectHeight(b.x + roadHalf, b.z, elevB, width, horizonY, fov);
    if (!paL || !paR || !pbL || !pbR) continue;

    const tl = toScreen(pbL);
    const tr = toScreen(pbR);
    const br = toScreen(paR);
    const bl = toScreen(paL);
    const roadPts: [number, number][] = [tl, tr, br, bl];

    const midDist = (a.dist + b.dist) * 0.5;
    // Smooth curvature across neighbours so kerb bands don't flicker each metre
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    const signedCurv = (prev.signedCurv + a.signedCurv + b.signedCurv + next.signedCurv) * 0.25;
    const catalog = catalogCurbAt(layout, midDist);
    // Inside kerb only: left bend → left edge, right bend → right edge
    const curbLeft = catalog.left || signedCurv < -CURB_CURV_THRESH;
    const curbRight = catalog.right || signedCurv > CURB_CURV_THRESH;
    const grain = Math.floor(midDist / GRAIN_PERIOD_M) % 2 === 0;

    const band = 0.5 + 0.5 * Math.sin(midDist * 0.55);
    quads.push({
      points: roadPts,
      curbLeft,
      curbRight,
      shade: 0.28 + 0.42 * (1 - i / samples.length) + band * 0.14,
      grain,
      rubber: rubberForSegment(midDist, roadPts),
    });
  }

  // Dilate inside-kerb flags by one segment so bands stay continuous through kinks
  const leftFlags = quads.map((q) => q.curbLeft);
  const rightFlags = quads.map((q) => q.curbRight);
  for (let i = 0; i < quads.length; i++) {
    if (leftFlags[i - 1] || leftFlags[i + 1]) quads[i].curbLeft = true;
    if (rightFlags[i - 1] || rightFlags[i + 1]) quads[i].curbRight = true;
  }

  // 150 / 100 / 50 m boards — only for corners turning more than 90°
  const markers: DistanceMarkerBillboard[] = [];
  const maxLook = DRAW_DEPTH * SEG_LEN;
  for (const corner of layout.corners) {
    if (corner.number == null) continue;
    if (!cornerNeedsDistanceBoards(layout, corner)) continue;
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
      const bl = projectHeight(boardX - BOARD_HALF_W, loc.localZ, loc.elev + 0.15, width, horizonY, fov);
      const br = projectHeight(boardX + BOARD_HALF_W, loc.localZ, loc.elev + 0.15, width, horizonY, fov);
      const tl = projectHeight(
        boardX - BOARD_HALF_W,
        loc.localZ,
        loc.elev + BOARD_HEIGHT,
        width,
        horizonY,
        fov
      );
      const tr = projectHeight(
        boardX + BOARD_HALF_W,
        loc.localZ,
        loc.elev + BOARD_HEIGHT,
        width,
        horizonY,
        fov
      );
      if (!bl || !br || !tl || !tr) continue;

      const pts: [number, number][] = [
        toScreen(tl),
        toScreen(tr),
        toScreen(br),
        toScreen(bl),
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

  return { quads, markers, horizonY };
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
