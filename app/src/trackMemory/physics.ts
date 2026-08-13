import type {
  ControlState,
  GameState,
  TrackMemoryCorner,
  TrackMemoryLayout,
  TrackMemoryPoint,
} from './types';
import {
  COACH_CORNER_MARKS,
  COACH_FLASH_MS,
  COACH_LAP_END,
  COACH_SEQUENCE_MIN_SNORM,
  COACH_SLOW_SPEED_FRAC,
  COACH_START_TEXT,
  CORNER_NAME_LEAD_M,
  DISTANCE_BOARD_M,
  DISTANCE_BOARD_MIN_DEG,
  coachCornerCueId,
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
    coachShownIds: [],
    coachCornerIds: [],
    coachQueue: [],
    coachSlowActive: false,
    movedAtMs: null,
    heading: 0,
  };
}

function wrapIdx(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/** Catmull-Rom position on segment p1→p2 (t in [0,1]). */
function catmullPos(
  p0: TrackMemoryPoint,
  p1: TrackMemoryPoint,
  p2: TrackMemoryPoint,
  p3: TrackMemoryPoint,
  t: number
): TrackMemoryPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const z0 = p0.z ?? 0;
  const z1 = p1.z ?? 0;
  const z2 = p2.z ?? 0;
  const z3 = p3.z ?? 0;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z:
      0.5 *
      (2 * z1 +
        (-z0 + z2) * t +
        (2 * z0 - 5 * z1 + 4 * z2 - z3) * t2 +
        (-z0 + 3 * z1 - 3 * z2 + z3) * t3),
  };
}

/** Catmull-Rom derivative (tangent) on segment p1→p2. */
function catmullTan(
  p0: TrackMemoryPoint,
  p1: TrackMemoryPoint,
  p2: TrackMemoryPoint,
  p3: TrackMemoryPoint,
  t: number
): TrackMemoryPoint {
  const t2 = t * t;
  return {
    x:
      0.5 *
      (-p0.x +
        p2.x +
        (4 * p0.x - 10 * p1.x + 8 * p2.x - 2 * p3.x) * t +
        (-3 * p0.x + 9 * p1.x - 9 * p2.x + 3 * p3.x) * t2),
    y:
      0.5 *
      (-p0.y +
        p2.y +
        (4 * p0.y - 10 * p1.y + 8 * p2.y - 2 * p3.y) * t +
        (-3 * p0.y + 9 * p1.y - 9 * p2.y + 3 * p3.y) * t2),
  };
}

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
  const p0 = points[wrapIdx(i1 - 1, n)];
  const p1 = points[i1];
  const p2 = points[i2];
  const p3 = points[wrapIdx(i2 + 1, n)];
  const pos = catmullPos(p0, p1, p2, p3, t);
  let tan = catmullTan(p0, p1, p2, p3, t);
  const len = Math.hypot(tan.x, tan.y) || 1;
  tan = { x: tan.x / len, y: tan.y / len };
  return { pos, tangent: tan, heading: Math.atan2(tan.x, tan.y) };
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
  windowM = 42
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

function hasSlightStraightBefore(layout: TrackMemoryLayout, corner: TrackMemoryCorner): boolean {
  const lengthM = layout.lengthM;
  const apex = corner.sNorm * lengthM;
  const a = samplePath(layout.points, lengthM, apex - 110);
  const b = samplePath(layout.points, lengthM, apex - 45);
  let d = b.heading - a.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return (Math.abs(d) * 180) / Math.PI < 18;
}

/** First two numbered board-corners (>90°) after 30% lap that follow a slight straight. */
export function pickCoachCorners(layout: TrackMemoryLayout): string[] {
  const leadFrac = DISTANCE_BOARD_M[0] / Math.max(1, layout.lengthM);
  const minSNorm = COACH_SEQUENCE_MIN_SNORM + leadFrac;
  const numbered = [...layout.corners]
    .filter(
      (c) =>
        c.number != null &&
        c.sNorm >= minSNorm &&
        cornerNeedsDistanceBoards(layout, c)
    )
    .sort((a, b) => a.sNorm - b.sNorm);

  const withStraight = numbered.filter((c) => hasSlightStraightBefore(layout, c));
  if (withStraight.length >= 2) {
    return withStraight.slice(0, 2).map((c) => c.id);
  }
  if (withStraight.length === 1 && numbered.length >= 2) {
    const rest = numbered.filter((c) => c.id !== withStraight[0].id);
    return [withStraight[0].id, rest[0].id];
  }

  const byAngle = [...numbered].sort(
    (a, b) => cornerTurnAngleDeg(layout, b) - cornerTurnAngleDeg(layout, a)
  );
  return byAngle.slice(0, 2).map((c) => c.id);
}

function enqueueCoach(
  queue: GameState['coachQueue'],
  shown: string[],
  cueId: string,
  text: string,
  releaseSlow = false
): { queue: GameState['coachQueue']; shown: string[] } {
  if (shown.includes(cueId)) return { queue, shown };
  return {
    shown: [...shown, cueId],
    queue: [...queue, { text, releaseSlow }],
  };
}

function drainCoachQueue(
  flash: GameState['flash'],
  queue: GameState['coachQueue'],
  coachSlowActive: boolean,
  nowMs: number
): {
  flash: GameState['flash'];
  queue: GameState['coachQueue'];
  coachSlowActive: boolean;
} {
  const busy =
    Boolean(flash && nowMs <= flash.untilMs) &&
    (flash?.tone === 'danger' || flash?.tone === 'coach' || flash?.tone === 'normal');
  if (busy || queue.length === 0) {
    return { flash, queue, coachSlowActive };
  }
  const [next, ...rest] = queue;
  return {
    flash: { text: next.text, untilMs: nowMs + COACH_FLASH_MS, tone: 'coach' },
    queue: rest,
    coachSlowActive: next.releaseSlow ? false : coachSlowActive,
  };
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
    coachShownIds,
    coachCornerIds,
    coachQueue,
    coachSlowActive,
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
        heading: lerpAngle(heading, rawH, 0.2),
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
  if (coachSlowActive) {
    speed = Math.min(speed, MAX_SPEED * COACH_SLOW_SPEED_FRAC);
  }

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
        coachShownIds: [],
        coachCornerIds: [],
        coachQueue: [],
        coachSlowActive: false,
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
    coachShownIds = [];
    coachCornerIds = [];
    coachQueue = [];
    coachSlowActive = false;
    movedAtMs = nowMs;
    flash = { text: `Lap ${lap}`, untilMs: nowMs + 1200 };
  }

  // Mark when the bike first starts moving
  if (movedAtMs == null && speed > 1.2) {
    movedAtMs = nowMs;
  }

  // Corner name (before apex) + Brake Now! + coaching sequence
  {
    const lengthM = layout.lengthM;
    const traveled = s >= prevS ? s - prevS : s + lengthM - prevS;
    const sNorm = s / lengthM;
    const pastCoachGate = sNorm >= COACH_SEQUENCE_MIN_SNORM;

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

    // Corner name ~95 m before apex (not on exit)
    for (const corner of layout.corners) {
      if (flashedIds.includes(corner.id)) continue;
      const cornerS = corner.sNorm * lengthM;
      const nameS = wrapDist(cornerS - CORNER_NAME_LEAD_M, lengthM);
      const toName = aheadDist(prevS, nameS, lengthM);
      if (toName > 0 && toName <= traveled) {
        flashedIds = [...flashedIds, corner.id];
        const brakeNowActive = flash?.tone === 'danger' && nowMs <= flash.untilMs;
        const coachActive = flash?.tone === 'coach' && nowMs <= flash.untilMs;
        if (!brakeNowActive && !coachActive) {
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
      }
    }

    // Coaching only after 30% of the lap
    if (pastCoachGate) {
      if (coachCornerIds.length === 0) {
        coachCornerIds = pickCoachCorners(layout);
      }

      // Intro once we pass the 30% gate (and have been rolling)
      if (
        movedAtMs != null &&
        !coachShownIds.includes('coach:start-refs')
      ) {
        const enq = enqueueCoach(
          coachQueue,
          coachShownIds,
          'coach:start-refs',
          COACH_START_TEXT
        );
        coachQueue = enq.queue;
        coachShownIds = enq.shown;
      }

      for (const cornerId of coachCornerIds) {
        const corner = layout.corners.find((c) => c.id === cornerId);
        if (!corner || !cornerNeedsDistanceBoards(layout, corner)) continue;
        // Apex = corner.sNorm; boards/cues are metres before/after that station
        const apex = corner.sNorm * lengthM;
        for (const mark of COACH_CORNER_MARKS) {
          const cueId = coachCornerCueId(cornerId, mark.key);
          if (coachShownIds.includes(cueId)) continue;
          const cueS = wrapDist(apex + mark.offsetM, lengthM);
          const toCue = aheadDist(prevS, cueS, lengthM);
          if (toCue > 0 && toCue <= traveled) {
            if (mark.key === 'brake') coachSlowActive = true;
            const enq = enqueueCoach(
              coachQueue,
              coachShownIds,
              cueId,
              mark.text,
              mark.key === 'exit'
            );
            coachQueue = enq.queue;
            coachShownIds = enq.shown;
          }
        }
      }

      for (const endCue of COACH_LAP_END) {
        if (coachShownIds.includes(endCue.id)) continue;
        const cueS = wrapDist(lengthM - endCue.leadM, lengthM);
        const toCue = aheadDist(prevS, cueS, lengthM);
        if (toCue > 0 && toCue <= traveled) {
          const enq = enqueueCoach(coachQueue, coachShownIds, endCue.id, endCue.text);
          coachQueue = enq.queue;
          coachShownIds = enq.shown;
        }
      }
    }

    // Show one coaching message at a time for the full duration
    if (flash && nowMs > flash.untilMs) flash = null;
    const drained = drainCoachQueue(flash, coachQueue, coachSlowActive, nowMs);
    flash = drained.flash;
    coachQueue = drained.queue;
    coachSlowActive = drained.coachSlowActive;
  }

  if (flash && nowMs > flash.untilMs) flash = null;

  // Re-apply slow cap after coaching may have toggled it this frame
  if (coachSlowActive) {
    speed = Math.min(speed, MAX_SPEED * COACH_SLOW_SPEED_FRAC);
  }

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
    coachShownIds,
    coachCornerIds,
    coachQueue,
    coachSlowActive,
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
