/** Pure kinematics — no React, no I/O. Degrees in, SI out. */

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function frontWheelTravelMm(forkTravelMm: number, rakeDeg: number): number {
  return forkTravelMm * Math.cos(degToRad(rakeDeg));
}

export function frontWheelRateNPerMm(forkRateNPerMm: number, rakeDeg: number): number {
  const cosRake = Math.cos(degToRad(rakeDeg));
  return forkRateNPerMm / (cosRake * cosRake);
}

export function frontWheelForceN(forkForceN: number, rakeDeg: number): number {
  return forkForceN / Math.cos(degToRad(rakeDeg));
}

export function rearWheelForceN(shockForceN: number, linkRatio: number): number {
  return shockForceN / linkRatio;
}

export function rearWheelRateNPerMm(shockRateNPerMm: number, linkRatio: number): number {
  return shockRateNPerMm / (linkRatio * linkRatio);
}

export function rearWheelTravelMm(shockTravelMm: number, linkRatio: number): number {
  return shockTravelMm * linkRatio;
}

export function rearNormalTrailMm(wheelbaseMm: number, trailMm: number, rakeDeg: number): number {
  return (wheelbaseMm + trailMm) * Math.cos(degToRad(rakeDeg));
}

export function loadTransferAngleDeg(cogYMm: number, wheelbaseMm: number): number {
  return radToDeg(Math.atan(cogYMm / wheelbaseMm));
}

export function antiSquatPercent(asAngleDeg: number, ltAngleDeg: number): number {
  const tanLoadTransfer = Math.tan(degToRad(ltAngleDeg));
  if (Math.abs(tanLoadTransfer) < 1e-12) {
    throw new Error('Load-transfer angle too near zero for anti-squat %');
  }
  return (Math.tan(degToRad(asAngleDeg)) / tanLoadTransfer) * 100;
}

export function weightSplitPct(cogXMm: number, wheelbaseMm: number): { frontPct: number; rearPct: number } {
  const rearPct = (cogXMm / wheelbaseMm) * 100;
  return { rearPct, frontPct: 100 - rearPct };
}

export function springRateCentreMm(fwRate: number, rwRate: number, wheelbaseMm: number): number {
  const sum = fwRate + rwRate;
  if (Math.abs(sum) < 1e-12) {
    throw new Error('Wheel rates sum to zero; cannot compute SRC');
  }
  return (rwRate / sum) * wheelbaseMm;
}

/** Spring force centre — force-based sibling of SRC. */
export function springForceCentreMm(fwForce: number, rwForce: number, wheelbaseMm: number): number {
  const sum = fwForce + rwForce;
  if (Math.abs(sum) < 1e-12) {
    throw new Error('Wheel forces sum to zero; cannot compute SFC');
  }
  return (rwForce / sum) * wheelbaseMm;
}

export function pctOfWheelbase(valueMm: number, wheelbaseMm: number): number {
  if (Math.abs(wheelbaseMm) < 1e-12) {
    throw new Error('Wheelbase too near zero');
  }
  return (valueMm / wheelbaseMm) * 100;
}

/** 1 = extend, -1 = squat, 0 = balanced (~100%). */
export function antiSquatFlag(asPct: number): number {
  if (asPct > 100.05) return 1;
  if (asPct < 99.95) return -1;
  return 0;
}

export function antiSquatFlagLabel(flag: number): string {
  if (flag > 0) return 'Extend';
  if (flag < 0) return 'Squat';
  return 'Hold';
}
