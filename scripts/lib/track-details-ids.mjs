/**
 * Track Details layouts drawn from repo GPX.
 *
 * Wanneroo is deliberately absent: scripts/track-memory-gpx/wanneroo.gpx traces
 * the decommissioned 1.76 km short circuit, not the 2.411 km layout raced today,
 * so drawing it would show riders the wrong track. Add it back only with a GPX
 * that passes prove-track-maps against the catalog length.
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
  'winton',
];
