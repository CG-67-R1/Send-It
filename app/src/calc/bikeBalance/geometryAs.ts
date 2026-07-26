/**
 * Anti-squat geometry: IFC from swingarm line and top chain run.
 *
 * Coordinate frame (lean 0):
 * - Origin at front contact patch
 * - +X rearward (matches CoG X from front contact)
 * - +Y up
 *
 * Swingarm angle: degrees above horizontal, positive when pivot is above the rear axle
 * (user-friendly; some software uses the opposite sign).
 *
 * Chain model: upper direct common external tangent between countershaft and rear
 * sprocket pitch circles (not the centreline through axle). Documented assumption.
 */

import { degToRad, radToDeg } from './kinematics';

export type Point = { x: number; y: number };

export type AntiSquatGeometryInput = {
  wheelbaseMm: number;
  rearTyreRadiusMm: number;
  swingarmLengthMm: number;
  /** Pivot above axle ⇒ positive */
  swingarmAngleDeg: number;
  /** Countershaft relative to swingarm pivot: +X rearward, +Y up */
  csFromPivotXMm: number;
  csFromPivotYMm: number;
  frontSprocketTeeth: number;
  rearSprocketTeeth: number;
  /** Chain pitch (mm). 520/525/530 ≈ 15.875 */
  chainPitchMm: number;
};

export type AntiSquatGeometryResult = {
  antiSquatAngleDeg: number;
  ifc: Point;
  pivot: Point;
  rearAxle: Point;
  rearContact: Point;
  countershaft: Point;
  frontSprocketRadiusMm: number;
  rearSprocketRadiusMm: number;
  chainTangentP1: Point;
  chainTangentP2: Point;
  assumptions: string[];
};

export function sprocketPitchRadiusMm(teeth: number, chainPitchMm: number): number {
  if (teeth <= 0 || chainPitchMm <= 0) {
    throw new Error('Sprocket teeth and chain pitch must be positive');
  }
  return (teeth * chainPitchMm) / (2 * Math.PI);
}

export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const a1 = p2.y - p1.y;
  const b1 = p1.x - p2.x;
  const c1 = a1 * p1.x + b1 * p1.y;
  const a2 = p4.y - p3.y;
  const b2 = p3.x - p4.x;
  const c2 = a2 * p3.x + b2 * p3.y;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) return null;
  return {
    x: (b2 * c1 - b1 * c2) / det,
    y: (a1 * c2 - a2 * c1) / det,
  };
}

/**
 * Upper direct common external tangent between two circles.
 * Returns contact points p1 (on c1) and p2 (on c2).
 */
export function upperExternalTangent(
  c1: Point,
  r1: number,
  c2: Point,
  r2: number
): { p1: Point; p2: Point } {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(r1 - r2) + 1e-9) {
    throw new Error('Sprocket circles nested or touching. Check radii / layout');
  }
  const a = Math.atan2(dy, dx);
  const phi = Math.asin(Math.max(-1, Math.min(1, (r1 - r2) / d)));

  const candidates = [a + phi, a - phi].map((tangentDir) => {
    // Normal pointing "left" of tangent direction
    const nx = Math.cos(tangentDir + Math.PI / 2);
    const ny = Math.sin(tangentDir + Math.PI / 2);
    const p1 = { x: c1.x + r1 * nx, y: c1.y + r1 * ny };
    const p2 = { x: c2.x + r2 * nx, y: c2.y + r2 * ny };
    return { p1, p2, midY: (p1.y + p2.y) / 2 };
  });

  candidates.sort((u, v) => v.midY - u.midY);
  return { p1: candidates[0].p1, p2: candidates[0].p2 };
}

export function pivotAndAxleFromSwingarm(
  wheelbaseMm: number,
  rearTyreRadiusMm: number,
  swingarmLengthMm: number,
  swingarmAngleDeg: number
): { rearContact: Point; rearAxle: Point; pivot: Point } {
  const rearContact = { x: wheelbaseMm, y: 0 };
  const rearAxle = { x: wheelbaseMm, y: rearTyreRadiusMm };
  const th = degToRad(swingarmAngleDeg);
  // Pivot forward of axle by L·cosθ, above axle by L·sinθ (θ≥0 ⇒ pivot above)
  const pivot = {
    x: rearAxle.x - swingarmLengthMm * Math.cos(th),
    y: rearAxle.y + swingarmLengthMm * Math.sin(th),
  };
  return { rearContact, rearAxle, pivot };
}

/**
 * Anti-squat angle = angle above horizontal of the line from rear contact → IFC.
 * IFC = intersection(swingarm line, top chain run).
 */
export function computeAntiSquatFromGeometry(
  input: AntiSquatGeometryInput
): AntiSquatGeometryResult {
  const assumptions = [
    'Lean = 0 planar model',
    'Swingarm angle positive when pivot is above rear axle',
    'Top chain run = upper direct common external tangent between sprocket pitch circles',
    'Rear sprocket concentric with rear axle',
    'Chain pitch radius = teeth x pitch / (2*pi)',
  ];

  const { rearContact, rearAxle, pivot } = pivotAndAxleFromSwingarm(
    input.wheelbaseMm,
    input.rearTyreRadiusMm,
    input.swingarmLengthMm,
    input.swingarmAngleDeg
  );

  const countershaft = {
    x: pivot.x + input.csFromPivotXMm,
    y: pivot.y + input.csFromPivotYMm,
  };

  const frontSprocketRadiusMm = sprocketPitchRadiusMm(
    input.frontSprocketTeeth,
    input.chainPitchMm
  );
  const rearSprocketRadiusMm = sprocketPitchRadiusMm(
    input.rearSprocketTeeth,
    input.chainPitchMm
  );

  const { p1: chainTangentP1, p2: chainTangentP2 } = upperExternalTangent(
    countershaft,
    frontSprocketRadiusMm,
    rearAxle,
    rearSprocketRadiusMm
  );

  const ifc = lineIntersection(pivot, rearAxle, chainTangentP1, chainTangentP2);
  if (!ifc) {
    throw new Error('Swingarm and chain lines are parallel. Check geometry inputs');
  }

  // Angle of squat line at rear contact, looking toward IFC (typically forward and up)
  const forward = rearContact.x - ifc.x;
  const up = ifc.y - rearContact.y;
  if (forward <= 1e-9) {
    throw new Error('IFC is not forward of the rear contact. Check swingarm/CS layout');
  }
  const antiSquatAngleDeg = radToDeg(Math.atan2(up, forward));

  return {
    antiSquatAngleDeg,
    ifc,
    pivot,
    rearAxle,
    rearContact,
    countershaft,
    frontSprocketRadiusMm,
    rearSprocketRadiusMm,
    chainTangentP1,
    chainTangentP2,
    assumptions,
  };
}
