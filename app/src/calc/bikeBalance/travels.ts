import type {
  BikeBalanceInputs,
  BikeBalancePositionLabel,
  PositionTravels,
  TravelsByPosition,
} from './types';

/** Persist current fork/shock travels into the position slot. */
export function rememberTravelsForPosition(inputs: BikeBalanceInputs): BikeBalanceInputs {
  const slot: PositionTravels = {
    forkTravelMm: inputs.forkTravelMm,
    shockTravelMm: inputs.shockTravelMm,
  };
  const travelsByPosition: TravelsByPosition = {
    ...inputs.travelsByPosition,
    [inputs.position]: slot,
  };
  return { ...inputs, travelsByPosition };
}

/** Load travels for a position if previously measured; Ext defaults to 0/0 if empty. */
export function loadTravelsForPosition(
  inputs: BikeBalanceInputs,
  position: BikeBalancePositionLabel
): { forkTravelMm: number | null; shockTravelMm: number | null; note?: string } {
  const saved = inputs.travelsByPosition?.[position];
  if (saved) {
    return {
      forkTravelMm: saved.forkTravelMm,
      shockTravelMm: saved.shockTravelMm,
      note: `Loaded measured travels for ${position}.`,
    };
  }
  if (position === 'ext') {
    return {
      forkTravelMm: 0,
      shockTravelMm: 0,
      note: 'Extended: no saved travels, using 0/0 mm.',
    };
  }
  return {
    forkTravelMm: inputs.forkTravelMm,
    shockTravelMm: inputs.shockTravelMm,
    note: `No measured travels saved for ${position}. Keeping current travel fields.`,
  };
}
