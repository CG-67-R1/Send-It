const LEGACY_CORNER_IDS_BY_CURRENT: Record<string, Record<string, string[]>> = {
  smp_druitt: {
    // The GPX Track Details bake renumbered Druitt from GP-style T15-T18
    // labels to the layout's local T6-T8 sequence. Keep old saved notes visible.
    smp_druitt_t5: ['smp_druitt_t4b'],
    smp_druitt_t6: ['smp_druitt_t15'],
    smp_druitt_t7: ['smp_druitt_t16'],
    smp_druitt_t8: ['smp_druitt_t17', 'smp_druitt_t18'],
  },
};

export function trackWalkCornerIdMatches(
  trackId: string,
  currentCornerId: string,
  savedCornerId: string | undefined
): boolean {
  if (!savedCornerId) return false;
  if (savedCornerId === currentCornerId) return true;
  return LEGACY_CORNER_IDS_BY_CURRENT[trackId]?.[currentCornerId]?.includes(savedCornerId) ?? false;
}
