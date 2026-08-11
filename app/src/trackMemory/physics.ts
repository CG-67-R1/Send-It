import type {
  BrakeGate,
  ControlState,
  GameState,
  TrackMemoryLayout,
  TrackMemoryPoint,
} from './types';

export const TOTAL_LAPS = 3;
const MAX_SPEED = 62; // m/s ~220 km/h arcade
const ACCEL = 28;
const BRAKE = 42;
/** Light always-on drag (aero). Coasting uses this only — no hard cut. */
const AERO_DRAG = 1.35;
/** Extra drag only while braking is held (on top of BRAKE). */
const BRAKE_DRAG = 2;
/** Base auto-steer lateral rate; scaled by lean. */
const STEER_RATE = 3.4;
const LATERAL_LIMIT = 7.2;
const ROAD_HALF_WIDTH = 5.5;
const CRASH_LATERAL = ROAD_HALF_WIDTH * 1.12;
const FLASH_MS = 1600;
const BRAKE_NOW_MS = 1000;
const CRASH_HOLD_MS = 1100;
/** Slower tip-in = more progressive lean. */
const LEAN_RESPONSE = 2.6;
/** Look-ahead for bend / auto lean (metres). */
const ASSIST_LOOK_M = 42;
/** Distance before corner for Brake Now! cue. */
const BRAKE_MARK_M = 100;
/** How hard we shove toward the outside when missing the brake. */
const SLIDE_OUT_RATE = 9.5;
/** Soft racing-line follow strength. */
const LINE_FOLLOW = 1.6;

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
    brakeGate: null,
    slidingOut: false,
    crashUntilMs: null,
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
  lookM: number = ASSIST_LOOK_M
): number {
  const a = samplePath(layout.points, layout.lengthM, s);
  const b = samplePath(layout.points, layout.lengthM, s + lookM);
  const cross = a.tangent.x * b.tangent.y - a.tangent.y * b.tangent.x;
  const dot = a.tangent.x * b.tangent.x + a.tangent.y * b.tangent.y;
  const angle = Math.atan2(cross, dot);
  return Math.max(-1, Math.min(1, angle / 0.55));
}

/** Progressive auto lean in [-1, 1] — mild early, deep in hard corners. */
function autoLeanTarget(bend: number, speed: number): number {
  const mag = Math.min(1, Math.abs(bend) * 1.35);
  // Power < 1 → progressive: small bends stay gentle, big bends dig in
  const progressive = Math.pow(mag, 0.62);
  const speedScale = 0.28 + 0.72 * Math.min(1, speed / 18);
  if (progressive < 0.04) return 0;
  return -Math.sign(bend) * progressive * speedScale;
}

function respawnOnTrack(prev: GameState, layout: TrackMemoryLayout, nowMs: number): GameState {
  const { heading } = samplePath(layout.points, layout.lengthM, prev.s);
  return {
    ...prev,
    phase: 'racing',
    lateral: 0,
    speed: Math.min(14, prev.speed * 0.25 + 8),
    lean: 0,
    slidingOut: false,
    crashUntilMs: null,
    brakeGate: null,
    flash: { text: 'Back on track', untilMs: nowMs + 1200, tone: 'normal' },
    heading,
  };
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
    brakeGate,
    slidingOut,
    crashUntilMs,
  } = prev;

  // Crash hold → respawn mid-track
  if (phase === 'crashing') {
    const dt = Math.min(0.05, Math.max(0, dtSec));
    lateral += Math.sign(lateral || 1) * 2.2 * dt;
    speed = Math.max(0, speed - 28 * dt);
    lean *= 1 - Math.min(1, dt * 4);
    if (flash && nowMs > flash.untilMs) flash = null;
    if (crashUntilMs != null && nowMs >= crashUntilMs) {
      return respawnOnTrack(
        {
          ...prev,
          phase,
          s,
          lateral,
          speed,
          lean,
          flash,
          slidingOut,
          crashUntilMs,
        },
        layout,
        nowMs
      );
    }
    return {
      ...prev,
      phase,
      s,
      lateral,
      speed,
      lean,
      flash,
      slidingOut: true,
      crashUntilMs,
      heading: samplePath(layout.points, layout.lengthM, s).heading,
    };
  }

  if (phase === 'ready') {
    if (controls.accel) {
      phase = 'racing';
    } else {
      return { ...prev, phase, lean: lean * 0.9 };
    }
  }

  const dt = Math.min(0.05, Math.max(0, dtSec));
  const bend = upcomingBend(layout, s);

  // Throttle / brake — no free auto-slow into corners (memory = you must brake)
  if (controls.accel) speed += ACCEL * dt;
  if (controls.brake) {
    speed -= BRAKE * dt;
    speed -= BRAKE_DRAG * dt;
  } else {
    speed -= AERO_DRAG * dt;
    speed -= speed * speed * 0.00035 * dt;
  }
  speed = Math.max(0, Math.min(MAX_SPEED, speed));

  // Auto lean — progressive, can tip near full lean in tight bends
  const leanTarget = autoLeanTarget(bend, speed);
  lean += (leanTarget - lean) * Math.min(1, dt * LEAN_RESPONSE);
  lean = Math.max(-1, Math.min(1, lean));

  // Mark brake input against the open 100 m gate
  if (brakeGate && controls.brake) {
    brakeGate = { ...brakeGate, braked: true };
  }

  // Missed brake → start sliding to the outside of the bend
  if (brakeGate && !brakeGate.braked) {
    const toCorner = aheadDist(s, brakeGate.cornerS, layout.lengthM);
    if (toCorner < 28 && speed > 16) {
      slidingOut = true;
    }
  }

  if (slidingOut) {
    // Outside of left bend (neg) is right (−lateral); outside of right bend is left (+)
    const outSign = bend === 0 ? Math.sign(lateral || 1) : Math.sign(bend);
    lateral += outSign * SLIDE_OUT_RATE * (0.55 + speed / MAX_SPEED) * dt;
    // Keep a dramatic lean while sliding
    lean = Math.max(-1, Math.min(1, lean + outSign * -0.35 * dt));
  } else {
    // Auto-steer: hold a soft racing line from lean + bend
    const turnPower = STEER_RATE * (4.2 + speed * 0.26) * (0.22 + Math.abs(lean) * 1.45);
    lateral -= lean * turnPower * dt;

    if (Math.abs(bend) > 0.1) {
      const lineTarget = -bend * 2.1;
      lateral += (lineTarget - lateral) * Math.min(0.4, dt * LINE_FOLLOW * Math.abs(bend));
    } else if (Math.abs(lean) < 0.1) {
      lateral *= 1 - Math.min(0.5, dt * 1.1);
    }
  }

  // Crash when off the asphalt
  if (Math.abs(lateral) >= CRASH_LATERAL) {
    return {
      ...prev,
      phase: 'crashing',
      s,
      lateral: Math.sign(lateral) * Math.min(Math.abs(lateral), LATERAL_LIMIT),
      speed,
      lean,
      lap,
      lapTimeMs,
      bestLapMs,
      sessionBestLapMs,
      lapTimesMs,
      flash: { text: 'CRASH!', untilMs: nowMs + CRASH_HOLD_MS, tone: 'danger' },
      flashedIds,
      brakeFlashIds,
      brakeGate: null,
      slidingOut: true,
      crashUntilMs: nowMs + CRASH_HOLD_MS,
      heading: samplePath(layout.points, layout.lengthM, s).heading,
    };
  }

  lateral = Math.max(-LATERAL_LIMIT, Math.min(LATERAL_LIMIT, lateral));

  const prevS = s;
  s += speed * dt;
  lapTimeMs += dt * 1000;

  // Clear brake gate once past the corner
  if (brakeGate) {
    const distToCorner = aheadDist(s, brakeGate.cornerS, layout.lengthM);
    const traveled =
      s >= prevS ? s - prevS : s + layout.lengthM - prevS;
    const wasBefore = aheadDist(prevS, brakeGate.cornerS, layout.lengthM);
    if (wasBefore > 0 && wasBefore <= traveled) {
      if (brakeGate.braked) slidingOut = false;
      brakeGate = null;
    } else if (distToCorner > layout.lengthM * 0.55) {
      // Failsafe if we somehow skipped the apex without clearing
      brakeGate = null;
    }
  }

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
        brakeGate: null,
        slidingOut: false,
        crashUntilMs: null,
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
    brakeGate = null;
    slidingOut = false;
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
        brakeGate = { cornerId: corner.id, cornerS, braked: false };
        slidingOut = false;
        flash = { text: 'Brake Now!', untilMs: nowMs + BRAKE_NOW_MS, tone: 'danger' };
      }
    }

    // Corner name flash (does not override an active Brake Now!)
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

  // Soft slowdown only when grazing the edge (not full crash yet)
  if (Math.abs(lateral) > ROAD_HALF_WIDTH * 0.92 && !slidingOut) {
    speed *= 1 - Math.min(0.5, dt * 2.5);
  }

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
    brakeGate,
    slidingOut,
    crashUntilMs,
    heading,
  };
}

export function resetGame(bestLapMs: number | null): GameState {
  return createInitialState(bestLapMs);
}

export function kmhFromSpeed(speedMps: number): number {
  return Math.round(speedMps * 3.6);
}
