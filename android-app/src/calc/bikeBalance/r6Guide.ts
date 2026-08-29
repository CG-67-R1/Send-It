/**
 * First-time data guide and 2020 Yamaha YZF-R6 stock chassis figures.
 * Only publicly published OEM / brochure-style dimensions are prefilled.
 * Workshop-only values stay null. The user must measure those.
 */

import type { BikeBalanceInputs } from './types';
import { DEFAULT_BIKE_BALANCE_INPUTS } from './types';
import { PUBLIC_OEM_DOCS } from './citations';

export type DataGuideStep = {
  id: string;
  title: string;
  why: string;
  how: string;
  r6Example?: string;
  /** Keys checked for step progress (any filled counts toward done). */
  fieldHints: (keyof BikeBalanceInputs)[];
  /** If true, step is complete when all fieldHints are filled. */
  requireAll?: boolean;
};

/** Public stock chassis numbers commonly published for 2020 YZF-R6. */
export const R6_2020_PUBLIC_CHASSIS = {
  model: '2020 Yamaha YZF-R6',
  rakeDeg: 24,
  trailMm: 97,
  wheelbaseMm: 1375,
  seatHeightMm: 850,
  wetWeightKg: 190,
  /** Published total suspension stroke capacity (not used travel at a position). */
  publishedFrontTravelCapacityMm: 120,
  publishedRearTravelCapacityMm: 120,
  frontTyre: '120/70 ZR17',
  rearTyre: '180/55 ZR17',
  sources: [PUBLIC_OEM_DOCS.yamahaYzfR6_2020Chassis],
  notes: [
    'Stock brochure numbers are a starting point. A used or race-prepped bike may differ.',
    'Published wet weight can vary by market trim. Weight is not used until you enter CoG.',
    'Published fork and shock travel figures are total stroke capacity, not the used travel at your chosen position. Measure used travel yourself.',
    'Do not invent CoG, link ratio, used travels, or anti-squat angle from brochure data.',
  ],
} as const;

/** Fields filled by the public R6 chassis shell (safe to auto-load). */
export const R6_PUBLIC_PREFILL_KEYS: (keyof BikeBalanceInputs)[] = [
  'rakeDeg',
  'trailMm',
  'wheelbaseMm',
];

/** Fields that must come from measuring or trusted workshop data. */
export const R6_WORKSHOP_KEYS: (keyof BikeBalanceInputs)[] = [
  'forkTravelMm',
  'shockTravelMm',
  'forkRateNPerMm',
  'shockRateNPerMm',
  'linkRatio',
  'forkForceN',
  'shockForceN',
  'cogXMm',
  'cogYMm',
  'antiSquatAngleDeg',
  'rearTyreRadiusMm',
  'swingarmLengthMm',
  'swingarmAngleDeg',
  'csFromPivotXMm',
  'csFromPivotYMm',
  'frontSprocketTeeth',
  'rearSprocketTeeth',
];

export const DATA_GUIDE_STEPS: DataGuideStep[] = [
  {
    id: 'stock-chassis',
    title: '1. Start with published chassis numbers',
    why: 'Rake, trail, and wheelbase set the steering geometry baseline before you change ride height.',
    how: 'Copy from the OEM or dealer spec sheet for your year and model, then confirm with a tape if you have changed yokes, ride height, or wheelbase.',
    r6Example: `2020 R6 stock (public specs): rake ${R6_2020_PUBLIC_CHASSIS.rakeDeg} deg, trail ${R6_2020_PUBLIC_CHASSIS.trailMm} mm, wheelbase ${R6_2020_PUBLIC_CHASSIS.wheelbaseMm} mm. Seat height ${R6_2020_PUBLIC_CHASSIS.seatHeightMm} mm and wet weight about ${R6_2020_PUBLIC_CHASSIS.wetWeightKg} kg are context only.`,
    fieldHints: ['rakeDeg', 'trailMm', 'wheelbaseMm'],
    requireAll: true,
  },
  {
    id: 'travels',
    title: '2. Measure suspension travel at a known position',
    why: 'Almost every result is position-dependent. Extended and laden track positions are different numerically.',
    how: 'Pick a position (for example Static). Measure fork stroke used from full extension and shock shaft stroke. Save them. The app stores travels per position.',
    r6Example: `Public R6 total stroke is about ${R6_2020_PUBLIC_CHASSIS.publishedFrontTravelCapacityMm} mm front and ${R6_2020_PUBLIC_CHASSIS.publishedRearTravelCapacityMm} mm rear. That is capacity, not the used travel at Static or Brake. Measure used travel yourself at the position you will analyse.`,
    fieldHints: ['forkTravelMm', 'shockTravelMm'],
    requireAll: true,
  },
  {
    id: 'springs',
    title: '3. Enter spring rates and linkage ratio',
    why: 'Wheel rate (what the tyre feels) comes from component rate transformed by rake or linkage.',
    how: 'Fork rate is both legs combined (N/mm). Shock rate comes from the spring stamp. Link ratio is the instantaneous motion ratio at that stroke (from linkage data or careful measurement).',
    r6Example:
      'Stock R6 spring rates vary by market, year, and aftermarket swaps. Do not guess. Read the spring or tuner sheet.',
    fieldHints: ['forkRateNPerMm', 'shockRateNPerMm', 'linkRatio'],
    requireAll: true,
  },
  {
    id: 'forces',
    title: '4. Forces (or use a position preset)',
    why: 'Wheel and component forces show where the bike sits and feed spring-force centre (SFC).',
    how: 'Either apply a force preset (Static, Brake, and so on) which sets component forces from wheel loads, or enter measured or modelled fork and shock forces at that position.',
    r6Example: 'Presets are teaching loads, not R6-specific OEM figures.',
    fieldHints: ['forkForceN', 'shockForceN'],
    requireAll: true,
  },
  {
    id: 'mass',
    title: '5. Mass / CoG (only if measured or estimated honestly)',
    why: 'Load-transfer angle and anti-squat % need CoG height and longitudinal position.',
    how: 'Best: scales plus a CoG procedure. If estimated, set provenance to Estimated. The app will warn you to trust AS angle more than AS %.',
    r6Example:
      'Public R6 wet weight exists. A trustworthy CoG X/Y for bike and rider does not come from the brochure. Leave blank or estimate with provenance marked.',
    fieldHints: ['cogXMm', 'cogYMm'],
    requireAll: true,
  },
  {
    id: 'antisquat',
    title: '6. Anti-squat angle: manual or geometry',
    why: 'AS % compares the squat-line angle to the load-transfer angle.',
    how: 'Geometry mode: measure swingarm length and angle, countershaft offsets from pivot, sprocket teeth, rear tyre radius, and chain pitch. Manual mode: enter an AS angle from trusted analysis.',
    r6Example:
      'Stock sprocket counts are on the bike (count teeth). CS offsets and swingarm angle must be measured, not taken from marketing copy.',
    fieldHints: [
      'antiSquatAngleDeg',
      'swingarmLengthMm',
      'swingarmAngleDeg',
      'csFromPivotXMm',
      'csFromPivotYMm',
      'frontSprocketTeeth',
      'rearSprocketTeeth',
      'rearTyreRadiusMm',
    ],
    requireAll: false,
  },
];

export type DataGuideStepProgress = {
  stepId: string;
  filled: number;
  total: number;
  complete: boolean;
};

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function getStepProgress(
  step: DataGuideStep,
  inputs: BikeBalanceInputs
): DataGuideStepProgress {
  const total = step.fieldHints.length;
  const filled = step.fieldHints.filter((key) => isFilled(inputs[key])).length;
  const complete = step.requireAll === false ? filled > 0 : filled === total && total > 0;
  return { stepId: step.id, filled, total, complete };
}

export function getDataGuideProgress(inputs: BikeBalanceInputs): {
  steps: DataGuideStepProgress[];
  completeCount: number;
  totalSteps: number;
} {
  const steps = DATA_GUIDE_STEPS.map((step) => getStepProgress(step, inputs));
  return {
    steps,
    completeCount: steps.filter((s) => s.complete).length,
    totalSteps: steps.length,
  };
}

/** Prefill only public R6 chassis fields. Leave workshop fields empty. */
export function createR6_2020StartingInputs(): BikeBalanceInputs {
  return {
    ...DEFAULT_BIKE_BALANCE_INPUTS,
    name: R6_2020_PUBLIC_CHASSIS.model,
    position: 'static',
    leanDeg: 0,
    rakeDeg: R6_2020_PUBLIC_CHASSIS.rakeDeg,
    trailMm: R6_2020_PUBLIC_CHASSIS.trailMm,
    wheelbaseMm: R6_2020_PUBLIC_CHASSIS.wheelbaseMm,
    cogProvenance: 'unknown',
    antiSquatAngleMode: 'manual',
    chainPitchMm: 15.875,
    // Explicit nulls so a prior demo load does not leak workshop numbers.
    forkTravelMm: null,
    shockTravelMm: null,
    forkRateNPerMm: null,
    shockRateNPerMm: null,
    linkRatio: null,
    forkForceN: null,
    shockForceN: null,
    cogXMm: null,
    cogYMm: null,
    antiSquatAngleDeg: null,
    travelsByPosition: {},
    rearTyreRadiusMm: null,
    swingarmLengthMm: null,
    swingarmAngleDeg: null,
    csFromPivotXMm: null,
    csFromPivotYMm: null,
    frontSprocketTeeth: null,
    rearSprocketTeeth: null,
  };
}
