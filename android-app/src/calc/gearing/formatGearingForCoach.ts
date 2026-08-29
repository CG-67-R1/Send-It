import { formatRatio, formatSignedPct, nearbyPairs } from './ratio';
import { GEARING_GOALS, type BikeFieldProvenance, type BikePowerbandRef, type GearingGoalId } from './types';

export type GearingCoachDraftInput = {
  manufacturer: string;
  family: string;
  yearFrom: string;
  yearTo: string;
  capacityCc: string;
  engineConfig: string;
  peakTorqueRpm: string;
  peakPowerRpm: string;
  powerbandRpmFrom: string;
  powerbandRpmTo: string;
  provenance: BikeFieldProvenance;
  catalog: BikePowerbandRef | null;
  front: number;
  rear: number;
  newFront: number | null;
  newRear: number | null;
  goalId: GearingGoalId;
  requestText: string;
  trackName: string;
};

function rpmLine(label: string, value: string, provenance: BikeFieldProvenance): string {
  const trimmed = value.trim();
  if (!trimmed) return `- ${label}: unknown — do not invent`;
  return `- ${label}: ${trimmed} (${provenance})`;
}

function catalogDiffers(input: GearingCoachDraftInput): boolean {
  const row = input.catalog;
  if (!row || input.provenance === 'manual') return false;
  const catalogTorque = row.peakTorqueRpm != null ? String(row.peakTorqueRpm) : '';
  const catalogPower = row.peakPowerRpm != null ? String(row.peakPowerRpm) : '';
  const catalogFrom = row.powerbandRpmFrom != null ? String(row.powerbandRpmFrom) : '';
  const catalogTo = row.powerbandRpmTo != null ? String(row.powerbandRpmTo) : '';
  if (input.manufacturer.trim() !== row.manufacturer) return true;
  if (input.family.trim() !== row.family) return true;
  if (input.capacityCc.trim() !== String(row.capacityCc)) return true;
  if ((input.engineConfig || '') !== row.engineConfig) return true;
  if (input.peakTorqueRpm.trim() !== catalogTorque) return true;
  if (input.peakPowerRpm.trim() !== catalogPower) return true;
  if (input.powerbandRpmFrom.trim() !== catalogFrom) return true;
  if (input.powerbandRpmTo.trim() !== catalogTo) return true;
  return false;
}

export function resolveBikeProvenance(input: Omit<GearingCoachDraftInput, 'provenance'>): BikeFieldProvenance {
  if (!input.catalog) return 'manual';
  return catalogDiffers({ ...input, provenance: 'catalog' }) ? 'user_override' : 'catalog';
}

export function formatGearingForCoach(input: GearingCoachDraftInput): string {
  const goal = GEARING_GOALS.find((item) => item.id === input.goalId);
  const currentRatio = input.rear / input.front;
  const lines: string[] = [
    'Gearing Guide request (facts only — do not invent RPM, speeds, or stock sprockets):',
    '',
    `User request: ${goal?.label ?? input.goalId}`,
  ];
  const extra = input.requestText.trim();
  if (extra) lines.push(`Additional: ${extra}`);

  const years = [input.yearFrom.trim(), input.yearTo.trim()].filter(Boolean).join('–') || 'unknown';
  lines.push(
    '',
    'Bike:',
    `- Manufacturer: ${input.manufacturer.trim() || 'unknown'}`,
    `- Model: ${input.family.trim() || 'unknown'}`,
    `- Years: ${years}`,
    `- Capacity: ${input.capacityCc.trim() ? `${input.capacityCc.trim()} cc` : 'unknown'}`,
    `- Engine: ${input.engineConfig.trim() || 'unknown'}`,
    `- Identity provenance: ${input.provenance}`
  );
  lines.push(rpmLine('Peak torque RPM', input.peakTorqueRpm, input.provenance));
  lines.push(rpmLine('Peak power RPM', input.peakPowerRpm, input.provenance));
  const from = input.powerbandRpmFrom.trim();
  const to = input.powerbandRpmTo.trim();
  if (from || to) {
    lines.push(`- Powerband RPM: ${from || '?'}–${to || '?'} (${input.provenance})`);
  } else {
    lines.push('- Powerband RPM: unknown — do not invent');
  }

  if (input.trackName.trim()) {
    lines.push('', `Track: ${input.trackName.trim()}`);
  }

  lines.push('', `Current gearing: ${input.front}/${input.rear}, ratio ${formatRatio(currentRatio)}`);

  if (input.newFront != null && input.newRear != null) {
    const newRatio = input.newRear / input.newFront;
    const drivePct = (newRatio / currentRatio - 1) * 100;
    lines.push(
      `Considering: ${input.newFront}/${input.newRear}, ratio ${formatRatio(newRatio)} (drive ${formatSignedPct(drivePct)}, speed ${formatSignedPct(-drivePct)})`
    );
  }

  lines.push('', 'Nearby pairs:');
  for (const row of nearbyPairs(input.front, input.rear)) {
    const tag = row.kind === 'current' ? ' (current)' : row.kind === 'front_step' ? ' (front step)' : '';
    lines.push(
      `- ${row.front}/${row.rear}  ${formatRatio(row.ratio)}  drive ${formatSignedPct(row.drivePct)}  speed ${formatSignedPct(row.speedPct)}${tag}`
    );
  }

  lines.push(
    '',
    'Please recommend 1–3 front/rear sprocket changes for this request. Keep the engine in the stated powerband when RPM is known. Prefer ±1 rear tooth first. Do not invent RPM, top speeds, or stock sprockets. Rear is the fine adjustment; one front tooth is about 2–3 rear teeth.'
  );

  return lines.join('\n');
}
