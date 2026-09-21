/**
 * Trusted Track Details maps ship baked start/finish and numbered corners.
 * Keep this list aligned with scripts/lib/track-details-ids.mjs.
 */
export const TRUSTED_TRACK_DETAILS_IDS = [
  'baskerville',
  'broadford',
  'calder_park',
  'hidden_valley',
  'lakeside',
  'mac_park',
  'mallala',
  'morgan_park',
  'phillip_island',
  'queensland_raceway',
  'sandown',
  'smp_brabham',
  'smp_druitt',
  'smp_gardner',
  'the_bend_gt',
  'the_bend_international',
  'wakefield_park',
  'wanneroo',
  'winton',
] as const;

const TRUSTED = new Set<string>(TRUSTED_TRACK_DETAILS_IDS);

export function isTrustedTrackDetails(trackId: string): boolean {
  return TRUSTED.has(trackId);
}
