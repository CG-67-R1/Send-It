/**
 * Track Details layouts drawn from repo GPX.
 */
export const TRACK_DETAILS_IDS = [
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

/**
 * Catalog tracks with no Track Details map on purpose, and why. Anything in the
 * catalog but absent from both lists is an accident, so validate-track-data
 * fails it; these warn instead, staying visible until the blocker clears.
 */
export const TRACK_DETAILS_EXCLUSIONS = {};
