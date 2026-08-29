export type EngineConfig = 'I4' | 'I3' | 'I2' | 'V2' | 'V4' | 'other';

export type BikeFieldProvenance = 'catalog' | 'user_override' | 'manual';

export type GearingGoalId =
  | 'more_drive'
  | 'limiter_early'
  | 'too_tall'
  | 'awkward_shifts'
  | 'first_too_tall'
  | 'too_much_drive';

export type BikePowerbandRef = {
  id: string;
  manufacturer: string;
  family: string;
  aliases: string[];
  yearFrom: number;
  yearTo: number;
  capacityCc: number;
  engineConfig: EngineConfig;
  peakTorqueRpm: number | null;
  peakPowerRpm: number | null;
  powerbandRpmFrom: number | null;
  powerbandRpmTo: number | null;
  sources: string[];
};

export type NearbyPair = {
  front: number;
  rear: number;
  ratio: number;
  drivePct: number;
  speedPct: number;
  kind: 'current' | 'rear_step' | 'front_step';
};

export const ENGINE_CONFIG_OPTIONS: { id: EngineConfig; label: string }[] = [
  { id: 'I4', label: 'Inline-four' },
  { id: 'I3', label: 'Inline-triple' },
  { id: 'I2', label: 'Parallel twin' },
  { id: 'V2', label: 'V-twin' },
  { id: 'V4', label: 'V4' },
  { id: 'other', label: 'Other' },
];

export const GEARING_GOALS: { id: GearingGoalId; label: string }[] = [
  { id: 'more_drive', label: 'More drive off corners' },
  { id: 'limiter_early', label: 'Hitting the limiter too early' },
  { id: 'too_tall', label: 'Too tall / never reaches limiter' },
  { id: 'awkward_shifts', label: 'Shift points in the wrong place' },
  { id: 'first_too_tall', label: 'First gear too tall (hairpins / starts)' },
  { id: 'too_much_drive', label: 'Too much drive / wheelie / spinning' },
];

export const FRONT_TEETH_MIN = 11;
export const FRONT_TEETH_MAX = 20;
export const REAR_TEETH_MIN = 28;
export const REAR_TEETH_MAX = 70;
