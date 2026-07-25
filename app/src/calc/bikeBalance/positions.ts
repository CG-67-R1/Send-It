/**
 * Position presets from Result Reference Guide (ZeroChassis-class force model).
 * Non-Ext presets apply fixed VERTICAL wheel forces — not fixed travel.
 * Component forces are derived with exact inverses of EQ-FW-FORCE / EQ-RW-FORCE.
 * Travel is never invented from force/rate (preload unknown).
 */

import type { BikeBalanceInputs, BikeBalancePositionLabel } from './types';
import { degToRad } from './kinematics';
import { loadTravelsForPosition, rememberTravelsForPosition } from './travels';

export type PositionPreset = {
  id: BikeBalancePositionLabel;
  label: string;
  shortLabel: string;
  leanDeg: number;
  /** null = Ext uses zero travel, not a force pair */
  frontWheelForceN: number | null;
  rearWheelForceN: number | null;
  note: string;
};

export const POSITION_PRESETS: PositionPreset[] = [
  {
    id: 'ext',
    label: 'Extended',
    shortLabel: 'Ext',
    leanDeg: 0,
    frontWheelForceN: null,
    rearWheelForceN: null,
    note: 'Fully extended: fork/shock travel set to 0 mm. Measure or enter rates/forces if top-out springs are engaged.',
  },
  {
    id: 'static',
    label: 'Static / 1g',
    shortLabel: 'Static',
    leanDeg: 0,
    frontWheelForceN: 950,
    rearWheelForceN: 950,
    note: 'Fixed vertical wheel forces 950/950 N. Travels must be measured at this load — not predicted.',
  },
  {
    id: 'acceleration',
    label: 'Acceleration',
    shortLabel: 'Accel',
    leanDeg: 0,
    frontWheelForceN: 480,
    rearWheelForceN: 1450,
    note: 'Fixed vertical wheel forces 480/1450 N. Re-measure travels at this attitude for geometry that depends on stroke.',
  },
  {
    id: 'braking',
    label: 'Braking',
    shortLabel: 'Brake',
    leanDeg: 0,
    frontWheelForceN: 2900,
    rearWheelForceN: 0,
    note: 'Fixed vertical wheel forces 2900/0 N. Trail/rake at brake attitude need measured travels.',
  },
  {
    id: 'cornering',
    label: 'Cornering',
    shortLabel: 'Corner',
    leanDeg: 0,
    frontWheelForceN: 1850,
    rearWheelForceN: 1600,
    note: 'Fixed vertical wheel forces 1850/1600 N at lean 0. Use Corner+lean for mid-corner context.',
  },
  {
    id: 'cornering_lean',
    label: 'Cornering + lean',
    shortLabel: 'Corner 50°',
    leanDeg: 50,
    frontWheelForceN: 1850,
    rearWheelForceN: 1600,
    note: 'Same corner forces with 50° lean context. Effective trail/WB change with lean — enter leaned geometry when you have it.',
  },
  {
    id: 'custom',
    label: 'Custom',
    shortLabel: 'Custom',
    leanDeg: 0,
    frontWheelForceN: null,
    rearWheelForceN: null,
    note: 'Manual forces and travels. No preset applied.',
  },
];

export function getPositionPreset(id: BikeBalancePositionLabel): PositionPreset {
  return POSITION_PRESETS.find((p) => p.id === id) ?? POSITION_PRESETS[POSITION_PRESETS.length - 1];
}

/** Exact inverse: fork_force = Fw_force × cos(rake) */
export function forkForceFromWheelForceN(frontWheelForceN: number, rakeDeg: number): number {
  return frontWheelForceN * Math.cos(degToRad(rakeDeg));
}

/** Exact inverse: shock_force = Rw_force × link_ratio */
export function shockForceFromWheelForceN(rearWheelForceN: number, linkRatio: number): number {
  return rearWheelForceN * linkRatio;
}

/**
 * Apply a position preset onto inputs.
 * - Sets position + lean
 * - Ext → travels 0
 * - Force presets → component forces when rake/link available; else leaves forces and returns warnings
 */
export function applyPositionPreset(
  inputs: BikeBalanceInputs,
  position: BikeBalancePositionLabel
): { inputs: BikeBalanceInputs; warnings: string[] } {
  const preset = getPositionPreset(position);
  const warnings: string[] = [];

  // Remember travels for the position we're leaving
  let next: BikeBalanceInputs = rememberTravelsForPosition({
    ...inputs,
  });

  next = {
    ...next,
    position,
    leanDeg: preset.leanDeg,
  };

  const travelLoad = loadTravelsForPosition(next, position);
  next.forkTravelMm = travelLoad.forkTravelMm;
  next.shockTravelMm = travelLoad.shockTravelMm;
  if (travelLoad.note) warnings.push(travelLoad.note);

  if (position === 'custom') {
    warnings.push('Custom position — enter forces and travels manually.');
    return { inputs: rememberTravelsForPosition(next), warnings };
  }

  if (position === 'ext') {
    warnings.push('Extended force model: travels from saved Ext slot (default 0/0).');
    return { inputs: rememberTravelsForPosition(next), warnings };
  }

  if (preset.frontWheelForceN == null || preset.rearWheelForceN == null) {
    return { inputs: rememberTravelsForPosition(next), warnings };
  }

  if (next.rakeDeg == null) {
    warnings.push('Needs rake to convert front wheel force → fork force.');
  } else {
    next.forkForceN = forkForceFromWheelForceN(preset.frontWheelForceN, next.rakeDeg);
  }

  if (next.linkRatio == null) {
    warnings.push('Needs link ratio to convert rear wheel force → shock force.');
  } else {
    next.shockForceN = shockForceFromWheelForceN(preset.rearWheelForceN, next.linkRatio);
  }

  warnings.push(
    `Applied ${preset.label} wheel forces ${preset.frontWheelForceN}/${preset.rearWheelForceN} N. Travels come from measured slots — never predicted from force.`
  );

  return { inputs: rememberTravelsForPosition(next), warnings };
}
