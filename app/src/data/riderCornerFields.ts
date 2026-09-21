export const SURFACE_CONDITION_OPTIONS = [
  { id: 'dry', label: 'Dry' },
  { id: 'damp', label: 'Damp' },
  { id: 'wet', label: 'Wet' },
  { id: 'drying', label: 'Drying' },
  { id: 'dusty', label: 'Dusty / marbles' },
  { id: 'patchy', label: 'Patchy' },
] as const;

export const CORNER_TYPE_OPTIONS = [
  { id: 'hairpin', label: 'Hairpin' },
  { id: 'sweeper', label: 'Sweeper' },
  { id: 'tight', label: 'Tight' },
  { id: 'kink', label: 'Kink' },
  { id: 'chicane', label: 'Chicane' },
  { id: 'double_apex', label: 'Double apex' },
  { id: 'decreasing', label: 'Decreasing radius' },
  { id: 'increasing', label: 'Increasing radius' },
  { id: 'blind', label: 'Blind' },
] as const;

export const CAMBER_OPTIONS = [
  { id: 'helps', label: 'Helps' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'falls_away', label: 'Falls away' },
  { id: 'on_camber_exit', label: 'On-camber exit' },
  { id: 'off_camber_exit', label: 'Off-camber exit' },
  { id: 'changes', label: 'Changes' },
] as const;

export const CORNER_ENTRY_OPTIONS = [
  { id: 'wide', label: 'Wide' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'tight', label: 'Tight' },
  { id: 'early_apex', label: 'Early apex' },
  { id: 'late_apex', label: 'Late apex' },
  { id: 'trail_brake', label: 'Trail brake' },
] as const;

export type SurfaceConditionId = (typeof SURFACE_CONDITION_OPTIONS)[number]['id'];
export type CornerTypeId = (typeof CORNER_TYPE_OPTIONS)[number]['id'];
export type CamberId = (typeof CAMBER_OPTIONS)[number]['id'];
export type CornerEntryId = (typeof CORNER_ENTRY_OPTIONS)[number]['id'];

export function labelForOption(
  options: readonly { id: string; label: string }[],
  id: string | undefined
): string | null {
  if (!id) return null;
  return options.find((o) => o.id === id)?.label ?? null;
}
