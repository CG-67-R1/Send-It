/** Shared types for Bike Balance Setup calc engine. */

export type SkillMode = 'rider' | 'tuner' | 'engineer';

export type CogProvenance = 'measured' | 'estimated' | 'unknown';

export type AntiSquatAngleMode = 'manual' | 'geometry';

export type BikeBalancePositionLabel =
  | 'ext'
  | 'static'
  | 'acceleration'
  | 'braking'
  | 'cornering'
  | 'cornering_lean'
  | 'custom';

export type EquationGroup = 'geometry' | 'travel' | 'rates' | 'mass' | 'antiSquat';

export type PositionTravels = {
  forkTravelMm: number | null;
  shockTravelMm: number | null;
};

export type TravelsByPosition = Partial<Record<BikeBalancePositionLabel, PositionTravels>>;

export interface BikeBalanceInputs {
  name: string;
  position: BikeBalancePositionLabel;
  leanDeg: number;
  rakeDeg: number | null;
  trailMm: number | null;
  wheelbaseMm: number | null;
  forkTravelMm: number | null;
  shockTravelMm: number | null;
  forkRateNPerMm: number | null;
  shockRateNPerMm: number | null;
  linkRatio: number | null;
  forkForceN: number | null;
  shockForceN: number | null;
  cogXMm: number | null;
  cogYMm: number | null;
  cogProvenance: CogProvenance;
  /** Manual AS angle, or last computed geometry angle (always stored for display). */
  antiSquatAngleDeg: number | null;
  antiSquatAngleMode: AntiSquatAngleMode;
  /** Measured travels keyed by position — never invent from force. */
  travelsByPosition: TravelsByPosition;
  // Geometry (for AS-from-geometry)
  rearTyreRadiusMm: number | null;
  swingarmLengthMm: number | null;
  swingarmAngleDeg: number | null;
  csFromPivotXMm: number | null;
  csFromPivotYMm: number | null;
  frontSprocketTeeth: number | null;
  rearSprocketTeeth: number | null;
  chainPitchMm: number | null;
}

export interface CalcResult {
  equationId: string;
  name: string;
  group: EquationGroup;
  value: number | null;
  unit: string;
  unavailableReason?: string;
  warning?: string;
  riderLabel: string;
  riderMeaning: string;
  formula: string;
  publicRefs: string[];
  inputsUsed: Record<string, number>;
}

export interface CrossCheckItem {
  id: string;
  label: string;
  expected: number;
  actual: number;
  tol: number;
  pass: boolean;
  equationId: string;
}

const emptyTravels = (): TravelsByPosition => ({});

export const DEFAULT_BIKE_BALANCE_INPUTS: BikeBalanceInputs = {
  name: 'My bike',
  position: 'static',
  leanDeg: 0,
  rakeDeg: null,
  trailMm: null,
  wheelbaseMm: null,
  forkTravelMm: null,
  shockTravelMm: null,
  forkRateNPerMm: null,
  shockRateNPerMm: null,
  linkRatio: null,
  forkForceN: null,
  shockForceN: null,
  cogXMm: null,
  cogYMm: null,
  cogProvenance: 'unknown',
  antiSquatAngleDeg: null,
  antiSquatAngleMode: 'manual',
  travelsByPosition: emptyTravels(),
  rearTyreRadiusMm: null,
  swingarmLengthMm: null,
  swingarmAngleDeg: null,
  csFromPivotXMm: null,
  csFromPivotYMm: null,
  frontSprocketTeeth: null,
  rearSprocketTeeth: null,
  chainPitchMm: 15.875,
};

/** §8 laden worked example — useful as demo / golden fixture. */
export const SECTION8_LADEN_EXAMPLE: BikeBalanceInputs = {
  ...DEFAULT_BIKE_BALANCE_INPUTS,
  name: 'Demo sportsbike (laden verify set)',
  position: 'static',
  leanDeg: 0,
  rakeDeg: 24,
  trailMm: 108.3,
  wheelbaseMm: 1426,
  forkTravelMm: 56.6,
  shockTravelMm: 21,
  forkRateNPerMm: 23.3,
  shockRateNPerMm: 105.5,
  linkRatio: 2.07,
  forkForceN: 1542.4,
  shockForceN: 3717.3,
  cogXMm: 698.9,
  cogYMm: 672,
  cogProvenance: 'measured',
  antiSquatAngleDeg: 24.9,
  antiSquatAngleMode: 'manual',
  travelsByPosition: {
    static: { forkTravelMm: 56.6, shockTravelMm: 21 },
    ext: { forkTravelMm: 0, shockTravelMm: 0 },
  },
};

/** §8 second dataset — full extension (Pos: Ext). */
export const SECTION8_EXT_EXAMPLE: BikeBalanceInputs = {
  ...DEFAULT_BIKE_BALANCE_INPUTS,
  name: 'Demo sportsbike (Ext verify set)',
  position: 'ext',
  leanDeg: 0,
  rakeDeg: 24.3,
  trailMm: 110.3,
  wheelbaseMm: 1424.9,
  forkTravelMm: 0,
  shockTravelMm: 0,
  forkRateNPerMm: null,
  shockRateNPerMm: 250.1,
  linkRatio: 2.12,
  forkForceN: -34.2,
  shockForceN: null,
  cogXMm: 723,
  cogYMm: 717,
  cogProvenance: 'measured',
  antiSquatAngleDeg: 30.6,
  antiSquatAngleMode: 'manual',
  travelsByPosition: {
    ext: { forkTravelMm: 0, shockTravelMm: 0 },
  },
};

/**
 * Synthetic geometry fixture: known layout → AS angle must match computeAntiSquatFromGeometry.
 * Used for golden tests (not a ZeroChassis file).
 */
export const GEOMETRY_AS_FIXTURE: BikeBalanceInputs = {
  ...DEFAULT_BIKE_BALANCE_INPUTS,
  name: 'Geometry AS fixture',
  position: 'static',
  wheelbaseMm: 1420,
  rearTyreRadiusMm: 320,
  swingarmLengthMm: 570,
  swingarmAngleDeg: 8,
  csFromPivotXMm: -80,
  csFromPivotYMm: 40,
  frontSprocketTeeth: 16,
  rearSprocketTeeth: 41,
  chainPitchMm: 15.875,
  cogXMm: 700,
  cogYMm: 670,
  cogProvenance: 'measured',
  antiSquatAngleMode: 'geometry',
  antiSquatAngleDeg: null,
};
