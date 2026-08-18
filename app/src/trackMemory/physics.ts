import type {
  ControlState,
  GameState,
  TrackMemoryCorner,
  TrackMemoryLayout,
  TrackMemoryPoint,
} from './types';
import {
  COACH_GAP_MS,
  COACH_SCRIPT,
  COACH_SHOW_MS,
  CORNER_NAME_LEAD_M,
  DISTANCE_BOARD_MIN_DEG,
} from './coachCues';

export const TOTAL_LAPS = 3;
const MAX_SPEED = 49.6; // m/s ~178 km/h arcade (−20%)
const ACCEL = 22.4;
const BRAKE = 42;
/** Light always-on drag (aero). Coasting uses this only — no hard cut. */
const AERO_DRAG = 1.35;
/** Extra drag only while braking is held (on top of BRAKE). */
const BRAKE_DRAG = 2;
/** Half-width of asphalt (metres); match projectRoad roadHalf. */
const ROAD_HALF_M = 5.8;
/** Stay in the middle 75% of the track (±37.5% of full width from centre). */
const LATERAL_LIMIT = ROAD_HALF_M * 0.75;
const FLASH_MS = 1600;
const BRAKE_NOW_MS = 1000;
/** Tip-in rate — lower = smoother, less twitchy lean. */
const LEAN_RESPONSE = 1.15;
/** Extra low-pass on lean after target chase (lower = softer). */
const LEAN_LP = 3.8;
/** Extra low-pass on lateral after line follow (lower = softer). */
const LATERAL_LP = 3.4;
/** Low-pass rate for camera heading (keeps the world from twitching). */
const CAM_HEADING_LP = 3.6;
/** Near / far look-ahead blended for smoother bend onset. */
const ASSIST_LOOK_NEAR_M = 32;
const ASSIST_LOOK_MID_M = 48;
const ASSIST_LOOK_FAR_M = 78;
/** Distance before corner for Brake Now! cue. */
const BRAKE_MARK_M = 100;
/** How strongly we ease toward the inside curb through a bend. */
const LINE_FOLLOW = 0.55;
/** Peak inside offset as a fraction of ROAD_HALF_M (still inside the 75% band). */
const INSIDE_LINE_FRAC = 0.62;

export function createInitialState(bestLapMs: number | null = null): GameState {
  return {
    phase: 'ready',
    s: 0,
    lateral: 0,
    speed: 0,
    lean: 0,
    lap: 1,
    lapTimeMs: 0,
    bestLapMs,
    sessionBestLapMs: null,
    lapTimesMs: [],
    flash: null,
    flashedIds: [],
    brakeFlashIds: [],
    coachIndex: 0,
    coachNextAtMs: null,
    movedAtMs: null,
    heading: 0,
  };
}

function wrapIdx(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/** Linear position + blended segment heading.
 *
 * Uniform Catmull-Rom overshoots GPS jitter and the Dipper's left/right flips,
 * which reads as wavy track edges halfway around a lap. Points are already
 * ~2 m apart; interpolating them is enough.
 */
export function samplePath(
  points: TrackMemoryPoint[],
  lengthM: number,
  s: number
): { pos: TrackMemoryPoint; tangent: TrackMemoryPoint; heading: number } {
  const n = points.length;
  if (n < 2 || lengthM <= 0) {
    return { pos: { x: 0, y: 0 }, tangent: { x: 1, y: 0 }, heading: 0 };
  }
  const sNorm = (((s % lengthM) + lengthM) % lengthM) / lengthM;
  const f = sNorm * n;
  const i1 = Math.floor(f) % n;
  const i2 = (i1 + 1) % n;
  const t = f - Math.floor(f);
  const p1 = points[i1];
  const p2 = points[i2];
  const pos: TrackMemoryPoint = {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
    z: (p1.z ?? 0) + ((p2.z ?? 0) - (p1.z ?? 0)) * t,
  };
  const p0 = points[wrapIdx(i1 - 1, n)];
  const p3 = points[wrapIdx(i2 + 1, n)];
  const segA = { x: p1.x - p0.x, y: p1.y - p0.y };
  const segB = { x: p2.x - p1.x, y: p2.y - p1.y };
  const segC = { x: p3.x - p2.x, y: p3.y - p2.y };
  const nA = Math.hypot(segA.x, segA.y) || 1;
  const nB = Math.hypot(segB.x, segB.y) || 1;
  const nC = Math.hypot(segC.x, segC.y) || 1;
  const uA = { x: segA.x / nA, y: segA.y / nA };
  const uB = { x: segB.x / nB, y: segB.y / nB };
  const uC = { x: segC.x / nC, y: segC.y / nC };
  // Blend neighboring segment headings so edges don't facet at every vertex
  const h0x = uA.x + uB.x;
  const h0y = uA.y + uB.y;
  const h1x = uB.x + uC.x;
  const h1y = uB.y + uC.y;
  let tx = h0x + (h1x - h0x) * t;
  let ty = h0y + (h1y - h0y) * t;
  const len = Math.hypot(tx, ty) || 1;
  tx /= len;
  ty /= len;
  return { pos, tangent: { x: tx, y: ty }, heading: Math.atan2(tx, ty) };
}

function wrapDist(s: number, lengthM: number): number {
  return ((s % lengthM) + lengthM) % lengthM;
}

function aheadDist(fromS: number, toS: number, lengthM: number): number {
  return wrapDist(toS - fromS, lengthM);
}

/** Shortest-path lerp for headings from samplePath (atan2(tx, ty)). */
function lerpAngle(from: number, to: number, t: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * Math.max(0, Math.min(1, t));
}

/** Signed upcoming bend: negative = left, positive = right, ~0 = straight. */
export function upcomingBend(
  layout: TrackMemoryLayout,
  s: number,
  lookM: number
): number {
  const a = samplePath(layout.points, layout.lengthM, s);
  const b = samplePath(layout.points, layout.lengthM, s + lookM);
  const cross = a.tangent.x * b.tangent.y - a.tangent.y * b.tangent.x;
  const dot = a.tangent.x * b.tangent.x + a.tangent.y * b.tangent.y;
  const angle = Math.atan2(cross, dot);
  return Math.max(-1, Math.min(1, angle / 0.55));
}

/** Blend near / mid / far bends so lean eases in/out through the corner. */
function smoothBend(layout: TrackMemoryLayout, s: number): number {
  const near = upcomingBend(layout, s, ASSIST_LOOK_NEAR_M);
  const mid = upcomingBend(layout, s, ASSIST_LOOK_MID_M);
  const far = upcomingBend(layout, s, ASSIST_LOOK_FAR_M);
  // Bias near so tight corners tip in harder without far-look washing them out
  return near * 0.42 + mid * 0.33 + far * 0.25;
}

/** Absolute turn angle (deg) over ±window around apex. */
export function cornerTurnAngleDeg(
  layout: TrackMemoryLayout,
  corner: TrackMemoryCorner,
  windowM = 70
): number {
  const lengthM = layout.lengthM;
  const apex = corner.sNorm * lengthM;
  const before = samplePath(layout.points, lengthM, apex - windowM);
  const after = samplePath(layout.points, lengthM, apex + windowM);
  let d = after.heading - before.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return (Math.abs(d) * 180) / Math.PI;
}

export function cornerNeedsDistanceBoards(
  layout: TrackMemoryLayout,
  corner: TrackMemoryCorner
): boolean {
  return cornerTurnAngleDeg(layout, corner) > DISTANCE_BOARD_MIN_DEG;
}

/** Progressive auto lean in [-1, 1]. Negative lean = tip left (matches left bend). */
function autoLeanTarget(bend: number, speed: number): number {
  const mag = Math.min(1, Math.abs(bend) * 1.65);
  // Lower exponent → more lean at mid/tight bends
  const progressive = Math.pow(mag, 0.52);
  const speedScale = 0.45 + 0.55 * Math.min(1, speed / 16);
  if (progressive < 0.025) return 0;
  // Left bend (neg) → lean left (neg); right bend → lean right
  return Math.sign(bend) * progressive * speedScale;
}

export function stepGame(
  prev: GameState,
  layout: TrackMemoryLayout,
  controls: ControlState,
  dtSec: number,
  nowMs: number
): GameState {
  if (prev.phase === 'finished') return prev;

  let {
    phase,
    s,
    lateral,
    speed,
    lean,
    lap,
    lapTimeMs,
    bestLapMs,
    sessionBestLapMs,
    lapTimesMs,
    flash,
    flashedIds,
    brakeFlashIds,
    coachIndex,
    coachNextAtMs,
    movedAtMs,
    heading,
  } = prev;

  if (phase === 'ready') {
    if (controls.accel) {
      phase = 'racing';
    } else {
      const rawH = samplePath(layout.points, layout.lengthM, s).heading;
      return {
        ...prev,
        phase,
        lean: lean * 0.92,
        heading: rawH,
      };
    }
  }

  const dt = Math.min(0.05, Math.max(0, dtSec));
  const bend = smoothBend(layout, s);

  if (controls.accel) speed += ACCEL * dt;
  if (controls.brake) {
    speed -= BRAKE * dt;
    speed -= BRAKE_DRAG * dt;
  } else {
    speed -= AERO_DRAG * dt;
    speed -= speed * speed * 0.00035 * dt;
  }
  speed = Math.max(0, Math.min(MAX_SPEED, speed));

  // Smooth auto lean into / out of corners (visual only — no lateral nudge)
  const leanTarget = autoLeanTarget(bend, speed);
  let leanDesired = lean + (leanTarget - lean) * Math.min(1, dt * LEAN_RESPONSE);
  leanDesired = Math.max(-1, Math.min(1, leanDesired));
  lean += (leanDesired - lean) * Math.min(1, dt * LEAN_LP);
  lean = Math.max(-1, Math.min(1, lean));

  // Racing line: drift toward inside ripple strip through the bend, then back to centre.
  // Bend sign from path cross-product is opposite the lateral left-normal frame, so use +sign.
  const bendMag = Math.min(1, Math.abs(bend) * 1.35);
  const insideSign = bend === 0 ? 0 : Math.sign(bend);
  const lineTarget = insideSign * ROAD_HALF_M * INSIDE_LINE_FRAC * bendMag;

  const follow =
    Math.abs(bend) > 0.06
      ? Math.min(0.18, dt * LINE_FOLLOW * (0.3 + bendMag * 0.75))
      : Math.min(0.12, dt * 0.55);
  let lateralDesired = lateral + (lineTarget - lateral) * follow;
  lateralDesired = Math.max(-LATERAL_LIMIT, Math.min(LATERAL_LIMIT, lateralDesired));
  lateral += (lateralDesired - lateral) * Math.min(1, dt * LATERAL_LP);
  lateral = Math.max(-LATERAL_LIMIT, Math.min(LATERAL_LIMIT, lateral));

  const prevS = s;
  s += speed * dt;
  lapTimeMs += dt * 1000;

  // Lap crossing
  if (s >= layout.lengthM) {
    s -= layout.lengthM;
    const finishedLapMs = lapTimeMs;
    const nextLapTimes = [...lapTimesMs, finishedLapMs];
    let nextBest = bestLapMs;
    let nextSessionBest = sessionBestLapMs;
    if (nextBest == null || finishedLapMs < nextBest) nextBest = finishedLapMs;
    if (nextSessionBest == null || finishedLapMs < nextSessionBest) nextSessionBest = finishedLapMs;

    if (lap >= TOTAL_LAPS) {
      return {
        phase: 'finished',
        s: 0,
        lateral,
        speed: 0,
        lean,
        lap: TOTAL_LAPS,
        lapTimeMs: finishedLapMs,
        bestLapMs: nextBest,
        sessionBestLapMs: nextSessionBest,
        lapTimesMs: nextLapTimes,
        flash: { text: 'Session complete', untilMs: nowMs + 2500 },
        flashedIds: [],
        brakeFlashIds: [],
        coachIndex: 0,
        coachNextAtMs: null,
        movedAtMs: null,
        heading: samplePath(layout.points, layout.lengthM, 0).heading,
      };
    }

    lap += 1;
    lapTimeMs = 0;
    lapTimesMs = nextLapTimes;
    bestLapMs = nextBest;
    sessionBestLapMs = nextSessionBest;
    flashedIds = [];
    brakeFlashIds = [];
    coachIndex = 0;
    // Restart coaching after the brief "Lap N" banner
    coachNextAtMs = nowMs + 1200 + COACH_GAP_MS;
    movedAtMs = nowMs;
    flash = { text: `Lap ${lap}`, untilMs: nowMs + 1200 };
  }

  // Mark when the bike first starts moving — begin coaching playlist
  if (movedAtMs == null && speed > 1.2) {
    movedAtMs = nowMs;
    if (coachNextAtMs == null) coachNextAtMs = nowMs;
  }

  // Corner name (before apex) + Brake Now! + timed coaching playlist
  {
    const lengthM = layout.lengthM;
    const traveled = s >= prevS ? s - prevS : s + lengthM - prevS;

    for (const corner of layout.corners) {
      if (corner.number == null) continue;
      if (!cornerNeedsDistanceBoards(layout, corner)) continue;
      const cornerS = corner.sNorm * lengthM;
      const markS = wrapDist(cornerS - BRAKE_MARK_M, lengthM);
      const toMark = aheadDist(prevS, markS, lengthM);
      if (toMark > 0 && toMark <= traveled && !brakeFlashIds.includes(corner.id)) {
        brakeFlashIds = [...brakeFlashIds, corner.id];
        flash = { text: 'Brake Now!', untilMs: nowMs + BRAKE_NOW_MS, tone: 'danger' };
      }
    }

    if (flash && nowMs > flash.untilMs) flash = null;

    const dangerBusy = flash?.tone === 'danger' && nowMs <= flash.untilMs;

    // Corner name while 8–95 m before apex. Brake Now! wins; coaching does not skip the name.
    for (const corner of layout.corners) {
      if (flashedIds.includes(corner.id)) continue;
      const cornerS = corner.sNorm * lengthM;
      const distToApex = aheadDist(s, cornerS, lengthM);
      if (distToApex <= 8 || distToApex > CORNER_NAME_LEAD_M) continue;
      if (dangerBusy) continue;
      flashedIds = [...flashedIds, corner.id];
      const hand =
        corner.direction === 'left' || corner.direction === 'right'
          ? ` (${corner.direction})`
          : '';
      const num = corner.number != null ? `T${corner.number} — ` : '';
      flash = {
        text: `${num}${corner.label}${hand}`,
        untilMs: nowMs + FLASH_MS,
        tone: 'normal',
      };
    }

    // Coaching: fixed 2 s show / 2 s gap from lap start (not board-triggered)
    const nameBusy = flash?.tone === 'normal' && nowMs <= flash.untilMs;
    if (
      !dangerBusy &&
      !nameBusy &&
      coachNextAtMs != null &&
      coachIndex < COACH_SCRIPT.length &&
      nowMs >= coachNextAtMs
    ) {
      flash = {
        text: COACH_SCRIPT[coachIndex],
        untilMs: nowMs + COACH_SHOW_MS,
        tone: 'coach',
      };
      coachNextAtMs = nowMs + COACH_SHOW_MS + COACH_GAP_MS;
      coachIndex += 1;
    }
  }

  if (flash && nowMs > flash.untilMs) flash = null;

  const rawHeading = samplePath(layout.points, layout.lengthM, s).heading;
  heading = lerpAngle(heading, rawHeading, Math.min(1, dt * CAM_HEADING_LP));

  return {
    phase,
    s,
    lateral,
    speed,
    lean,
    lap,
    lapTimeMs,
    bestLapMs,
    sessionBestLapMs,
    lapTimesMs,
    flash,
    flashedIds,
    brakeFlashIds,
    coachIndex,
    coachNextAtMs,
    movedAtMs,
    heading,
  };
}

export function resetGame(bestLapMs: number | null): GameState {
  return createInitialState(bestLapMs);
}

export function kmhFromSpeed(speedMps: number): number {
  return Math.round(speedMps * 3.6);
}
