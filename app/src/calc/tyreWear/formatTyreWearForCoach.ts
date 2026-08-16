import type { TyrePhotoSlotId, TyreWearCoachInput, WarmersUse, PhotoTakenWhen } from './types';
import { TYRE_PHOTO_SLOTS } from './types';

function fact(label: string, value: string, inventHint = true): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return inventHint ? `- ${label}: unknown — do not invent` : `- ${label}: not given`;
  }
  return `- ${label}: ${trimmed}`;
}

function warmersLabel(value: WarmersUse): string {
  if (value === 'yes') return 'yes';
  if (value === 'no') return 'no';
  return 'unknown — do not invent';
}

function photoTakenLabel(value: PhotoTakenWhen): string {
  if (value === 'hot_pit_in') return 'hot (immediate pit-in)';
  if (value === 'cooled') return 'cooled';
  return 'unknown — do not invent';
}

function slotLabel(id: TyrePhotoSlotId): string {
  return TYRE_PHOTO_SLOTS.find((slot) => slot.id === id)?.label ?? id;
}

export function missingTyreWearFacts(input: {
  hasBandFollow: boolean;
  brandCompound: string;
  hotPressure: string;
  trackTemp: string;
  warmers: WarmersUse;
  photoTaken: PhotoTakenWhen;
}): string[] {
  const missing: string[] = [];
  if (!input.hasBandFollow) missing.push('band-follow photo');
  if (!input.brandCompound.trim()) missing.push('brand / compound');
  if (!input.hotPressure.trim()) missing.push('hot pit-in pressure');
  if (!input.trackTemp.trim()) missing.push('track temperature');
  if (input.warmers === 'unknown') missing.push('tyre warmers');
  if (input.photoTaken === 'unknown') missing.push('whether the photos are hot or cooled');
  return missing;
}

export function formatTyreWearForCoach(input: TyreWearCoachInput): string {
  const axleLabel = input.axle === 'front' ? 'Front' : 'Rear';
  const photos =
    input.photoSlots.length > 0
      ? input.photoSlots.map((id, index) => `${index + 1}. ${slotLabel(id)}`).join('; ')
      : 'none listed — do not invent wear';

  const pressure =
    input.hotPressure.trim()
      ? `${input.hotPressure.trim()} ${input.pressureUnit} (${axleLabel.toLowerCase()})`
      : '';

  const lines: string[] = [
    'Tyre Wear Analysis request (facts only — do not invent pressures, compounds, or wear that is not visible in the photos):',
    '',
    `Axle: ${axleLabel}`,
    `- Photos attached (in order): ${photos}`,
    fact('Brand / model / compound', input.brandCompound),
    fact('Hot pit-in pressure', pressure),
    fact('Track temperature', input.trackTemp),
    fact('Ambient temperature', input.ambientTemp, false),
    fact('Session length', input.sessionLength, false),
    `- Tyre warmers: ${warmersLabel(input.warmers)}`,
    `- Photos taken: ${photoTakenLabel(input.photoTaken)}`,
  ];

  if (input.trackName.trim()) {
    lines.push(fact('Track', input.trackName, false));
  }
  if (input.bikeLabel.trim()) {
    lines.push(fact('Bike', input.bikeLabel, false));
  }

  const notes = input.notes.trim();
  if (notes) {
    lines.push('', `What the rider felt: ${notes}`);
  }

  lines.push(
    '',
    'Please classify using the tyre-wear photo protocol: orientation, then zone (Z0–Z3), then band geometry (width, continuity), then surface morphology. Do not map shredded or rippled texture to cold tear by default. If a photo is unclear, ask for a second shot rather than guessing at High confidence. Ask at most 4 missing items. Apply the companion fix order (pressure before compound or suspension).'
  );

  return lines.join('\n');
}
