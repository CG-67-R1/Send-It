/** Compile-time pack for this binary. Unset keeps the shared active.json hybrid. */
export function releasePackId(): 'uk' | null {
  const raw = process.env.EXPO_PUBLIC_PACK?.trim().toLowerCase();
  return raw === 'uk' ? 'uk' : null;
}

/**
 * UK release circuits that already have a GPX ribbon.
 * Empty-corner stubs in the source pack stay out of this binary.
 */
export const UK_RELEASE_TRACK_IDS = [
  'anglesey',
  'brands-hatch',
  'cadwell-park',
  'donington',
  'knockhill',
  'mallory-park',
  'oulton-park',
  'silverstone',
  'snetterton',
  'thruxton',
] as const;

const UK_RELEASE_TRACK_ID_SET = new Set<string>(UK_RELEASE_TRACK_IDS);

export function isUkReleaseTrack(trackId: string): boolean {
  return UK_RELEASE_TRACK_ID_SET.has(trackId);
}
