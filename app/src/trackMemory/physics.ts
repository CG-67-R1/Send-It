import type { ControlState, GameState, TrackMemoryLayout, TrackMemoryPoint } from './types';

export const TOTAL_LAPS = 3;
const MAX_SPEED = 62; // m/s ~220 km/h arcade
const ACCEL = 28;
const BRAKE = 42;
/** Light always-on drag (aero). Coasting uses this only — no hard cut. */
const AERO_DRAG = 1.35;
/** Extra drag only while braking is held (on top of BRAKE). */
const BRAKE_DRAG = 2;
/** Base auto-steer lateral rate; scaled by lean. */
const STEER_RATE = 2.8;
const LATERAL_LIMIT = 4.2;
const FLASH_MS = 1600;
const BRAKE_NOW_MS = 1000;
/** Slow tip-in / tip-out for smooth corner transitions. */
const LEAN_RESPONSE = 1.55;
/** Near / far look-ahead blended for smoother bend onset. */
const ASSIST_LOOK_NEAR_M = 22;
const ASSIST_LOOK_FAR_M = 58;
/** Distance before corner for Brake Now! cue. */
const BRAKE_MARK_M = 100;
/** Soft racing-line follow strength. */
const LINE_FOLLOW = 1.15;

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
    heading: 0,
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
  const i0 = Math.floor(f) % n;
  const i1 = (i0 + 1) % n;
  const t = f - Math.floor(f);
  const a = points[i0];
  const b = points[i1];
  const pos = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  let tx = b.x - a.x;
  let ty = b.y - a.y;
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

/** Blend near + far bends so lean eases in/out through the corner. */
function smoothBend(layout: TrackMemoryLayout, s: number): number {
  const near = upcomingBend(layout, s, ASSIST_LOOK_NEAR_M);
  const far = upcomingBend(layout, s, ASSIST_LOOK_FAR_M);
  return near * 0.42 + far * 0.58;
}

/** Progressive auto lean in [-1, 1] — mild early, deep in hard corners. */
function autoLeanTarget(bend: number, speed: number): number {
  const mag = Math.min(1, Math.abs(bend) * 1.2);
  const progressive = Math.pow(mag, 0.72);
  const speedScale = 0.32 + 0.68 * Math.min(1, speed / 20);
  if (progressive < 0.03) return 0;
  return -Math.sign(bend) * progressive * speedScale;
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
  } = prev;

  if (phase === 'ready') {
    if (controls.accel) {
      phase = 'racing';
    } else {
      return { ...prev, phase, lean: lean * 0.92 };
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

  // Smooth auto lean into / out of corners
  const leanTarget = autoLeanTarget(bend, speed);
  lean += (leanTarget - lean) * Math.min(1, dt * LEAN_RESPONSE);
  lean = Math.max(-1, Math.min(1, lean));

  // Auto-steer: soft racing line, stays on asphalt (no crash / slide-off)
  const turnPower = STEER_RATE * (3.8 + speed * 0.22) * (0.2 + Math.abs(lean) * 1.25);
  lateral -= lean * turnPower * dt;

  if (Math.abs(bend) > 0.08) {
    const lineTarget = -bend * 1.65;
    lateral += (lineTarget - lateral) * Math.min(0.28, dt * LINE_FOLLOW * (0.35 + Math.abs(bend)));
  } else if (Math.abs(lean) < 0.12) {
    lateral *= 1 - Math.min(0.4, dt * 0.85);
  }

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
    flash = { text: `Lap ${lap}`, untilMs: nowMs + 1200 };
  }

  // 100 m Brake Now! + corner name flashes
  {
    const lengthM = layout.lengthM;
    const traveled = s >= prevS ? s - prevS : s + lengthM - prevS;

    for (const corner of layout.corners) {
      if (corner.number == null) continue;
      const cornerS = corner.sNorm * lengthM;
      const markS = wrapDist(cornerS - BRAKE_MARK_M, lengthM);
      const toMark = aheadDist(prevS, markS, lengthM);
      if (toMark > 0 && toMark <= traveled && !brakeFlashIds.includes(corner.id)) {
        brakeFlashIds = [...brakeFlashIds, corner.id];
        flash = { text: 'Brake Now!', untilMs: nowMs + BRAKE_NOW_MS, tone: 'danger' };
      }
    }

    for (const corner of layout.corners) {
      if (flashedIds.includes(corner.id)) continue;
      const cornerS = corner.sNorm * lengthM;
      const toCorner = aheadDist(prevS, cornerS, lengthM);
      if (toCorner > 0 && toCorner <= traveled) {
        flashedIds = [...flashedIds, corner.id];
        const brakeNowActive = flash?.tone === 'danger' && nowMs <= flash.untilMs;
        if (!brakeNowActive) {
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
  }

  if (flash && nowMs > flash.untilMs) flash = null;

  const { heading } = samplePath(layout.points, layout.lengthM, s);

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
    heading,
  };
}

export function resetGame(bestLapMs: number | null): GameState {
  return createInitialState(bestLapMs);
}

export function kmhFromSpeed(speedMps: number): number {
  return Math.round(speedMps * 3.6);
}
