import type { ControlState, GameState, TrackMemoryLayout, TrackMemoryPoint } from './types';

export const TOTAL_LAPS = 3;
const MAX_SPEED = 62; // m/s ~220 km/h arcade
const ACCEL = 28;
const BRAKE = 48;
const DRAG = 6;
const STEER_RATE = 2.4;
const LATERAL_LIMIT = 5.2;
const ROAD_HALF_WIDTH = 5.5;
const FLASH_MS = 1600;

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
  const sNorm = ((s % lengthM) + lengthM) % lengthM / lengthM;
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
  } = prev;

  if (phase === 'ready') {
    if (controls.accel) {
      phase = 'racing';
    } else {
      return { ...prev, phase, lean: lean * 0.9 };
    }
  }

  const dt = Math.min(0.05, Math.max(0, dtSec));

  if (controls.accel) speed += ACCEL * dt;
  if (controls.brake) speed -= BRAKE * dt;
  speed -= DRAG * dt;
  if (!controls.accel && !controls.brake) speed -= 4 * dt;
  speed = Math.max(0, Math.min(MAX_SPEED, speed));

  let steer = 0;
  if (controls.left) steer -= 1;
  if (controls.right) steer += 1;

  const steerEff = steer * (0.35 + 0.65 * Math.min(1, speed / 25));
  lateral += steerEff * STEER_RATE * (6 + speed * 0.15) * dt;
  lateral = Math.max(-LATERAL_LIMIT, Math.min(LATERAL_LIMIT, lateral));

  // Soft pull toward centre when not steering
  if (steer === 0) lateral *= 1 - Math.min(0.6, dt * 1.2);

  lean += (steerEff - lean) * Math.min(1, dt * 8);

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
        heading: samplePath(layout.points, layout.lengthM, 0).heading,
      };
    }

    lap += 1;
    lapTimeMs = 0;
    lapTimesMs = nextLapTimes;
    bestLapMs = nextBest;
    sessionBestLapMs = nextSessionBest;
    flashedIds = [];
    flash = { text: `Lap ${lap}`, untilMs: nowMs + 1200 };
  }

  // Corner flash: crossing sNorm thresholds (same lap only)
  if (s >= prevS) {
    const sNorm = s / layout.lengthM;
    const prevNorm = prevS / layout.lengthM;
    for (const corner of layout.corners) {
      if (flashedIds.includes(corner.id)) continue;
      if (prevNorm < corner.sNorm && sNorm >= corner.sNorm) {
        flashedIds = [...flashedIds, corner.id];
        const hand =
          corner.direction === 'left' || corner.direction === 'right'
            ? ` (${corner.direction})`
            : '';
        const num = corner.number != null ? `T${corner.number} — ` : '';
        flash = { text: `${num}${corner.label}${hand}`, untilMs: nowMs + FLASH_MS };
      }
    }
  }

  if (flash && nowMs > flash.untilMs) flash = null;

  // Off-track soft slowdown
  if (Math.abs(lateral) > ROAD_HALF_WIDTH * 0.92) {
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
    heading,
  };
}

export function resetGame(bestLapMs: number | null): GameState {
  return createInitialState(bestLapMs);
}

export function kmhFromSpeed(speedMps: number): number {
  return Math.round(speedMps * 3.6);
}
