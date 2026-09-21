/**
 * Track Details layouts drawn from repo GPX.
 *
 * Trusted layouts ship baked start/finish and numbered corners (Australia,
 * rider-confirmed). Map-only layouts ship ribbon + optional racing line;
 * riders place S/F and corners in the app. Never bake detector corners for
 * map-only ids.
 */
export const TRACK_DETAILS_TRUSTED_IDS = [
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
];

/** Future overseas GPX maps — no trusted S/F or corner overlay. */
export const TRACK_DETAILS_MAP_ONLY_IDS = [];

export const TRACK_DETAILS_IDS = [...TRACK_DETAILS_TRUSTED_IDS, ...TRACK_DETAILS_MAP_ONLY_IDS];

export function isTrustedTrackDetailsId(id) {
  return TRACK_DETAILS_TRUSTED_IDS.includes(id);
}

export function isMapOnlyTrackDetailsId(id) {
  return TRACK_DETAILS_MAP_ONLY_IDS.includes(id);
}

/**
 * Catalog tracks with no Track Details map on purpose, and why. Anything in the
 * catalog but absent from both lists is an accident, so validate-track-data
 * fails it; these warn instead, staying visible until the blocker clears.
 */
export const TRACK_DETAILS_EXCLUSIONS = {};
