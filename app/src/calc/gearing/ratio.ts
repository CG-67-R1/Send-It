import {
  FRONT_TEETH_MAX,
  FRONT_TEETH_MIN,
  REAR_TEETH_MAX,
  REAR_TEETH_MIN,
  type NearbyPair,
} from './types';

export function finalDriveRatio(front: number, rear: number): number {
  if (!Number.isFinite(front) || !Number.isFinite(rear) || front <= 0) {
    throw new Error('Front and rear teeth must be positive numbers');
  }
  return rear / front;
}

export function formatRatio(ratio: number): string {
  return ratio.toFixed(2);
}

export function formatSignedPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  const abs = Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${abs}%`;
  if (rounded < 0) return `-${abs}%`;
  return '0.0%';
}

/** Drive % rises when ratio rises (shorter gearing). Speed % is the opposite sign. */
export function driveSpeedPercents(
  currentRatio: number,
  newRatio: number
): { drivePct: number; speedPct: number } {
  if (!Number.isFinite(currentRatio) || currentRatio <= 0) {
    throw new Error('Current ratio must be positive');
  }
  const drivePct = (newRatio / currentRatio - 1) * 100;
  return { drivePct, speedPct: -drivePct };
}

export function parseSprocketPair(raw: string): { front: number; rear: number } | null {
  const match = raw.trim().match(/^(\d{1,2})\s*[/\-xX]\s*(\d{2,3})$/);
  if (!match) return null;
  const front = Number(match[1]);
  const rear = Number(match[2]);
  if (!Number.isInteger(front) || !Number.isInteger(rear)) return null;
  if (front < FRONT_TEETH_MIN || front > FRONT_TEETH_MAX) return null;
  if (rear < REAR_TEETH_MIN || rear > REAR_TEETH_MAX) return null;
  return { front, rear };
}

export function parseTeeth(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value)) return null;
  return value;
}

function inFrontRange(front: number): boolean {
  return front >= FRONT_TEETH_MIN && front <= FRONT_TEETH_MAX;
}

function inRearRange(rear: number): boolean {
  return rear >= REAR_TEETH_MIN && rear <= REAR_TEETH_MAX;
}

export function nearbyPairs(front: number, rear: number): NearbyPair[] {
  const currentRatio = finalDriveRatio(front, rear);
  const rows: NearbyPair[] = [
    {
      front,
      rear,
      ratio: currentRatio,
      drivePct: 0,
      speedPct: 0,
      kind: 'current',
    },
  ];

  for (let delta = -3; delta <= 3; delta += 1) {
    if (delta === 0) continue;
    const nextRear = rear + delta;
    if (!inRearRange(nextRear)) continue;
    const ratio = finalDriveRatio(front, nextRear);
    const pct = driveSpeedPercents(currentRatio, ratio);
    rows.push({
      front,
      rear: nextRear,
      ratio,
      drivePct: pct.drivePct,
      speedPct: pct.speedPct,
      kind: 'rear_step',
    });
  }

  for (const delta of [-1, 1]) {
    const nextFront = front + delta;
    if (!inFrontRange(nextFront)) continue;
    const ratio = finalDriveRatio(nextFront, rear);
    const pct = driveSpeedPercents(currentRatio, ratio);
    rows.push({
      front: nextFront,
      rear,
      ratio,
      drivePct: pct.drivePct,
      speedPct: pct.speedPct,
      kind: 'front_step',
    });
  }

  return rows;
}
