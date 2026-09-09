import baskerville from './baskerville.json';
import broadford from './broadford.json';
import calderPark from './calder_park.json';
import hiddenValley from './hidden_valley.json';
import lakeside from './lakeside.json';
import macPark from './mac_park.json';
import mallala from './mallala.json';
import morganPark from './morgan_park.json';
import phillipIsland from './phillip_island.json';
import queenslandRaceway from './queensland_raceway.json';
import sandown from './sandown.json';
import smpBrabham from './smp_brabham.json';
import smpDruitt from './smp_druitt.json';
import smpGardner from './smp_gardner.json';
import theBendGt from './the_bend_gt.json';
import theBendInternational from './the_bend_international.json';
import wakefieldPark from './wakefield_park.json';
import wanneroo from './wanneroo.json';
import winton from './winton.json';
import type { TrackDetailsCorners } from './types';

const LAYOUTS: Record<string, TrackDetailsCorners> = {
  baskerville: baskerville as TrackDetailsCorners,
  broadford: broadford as TrackDetailsCorners,
  calder_park: calderPark as TrackDetailsCorners,
  hidden_valley: hiddenValley as TrackDetailsCorners,
  lakeside: lakeside as TrackDetailsCorners,
  mac_park: macPark as TrackDetailsCorners,
  mallala: mallala as TrackDetailsCorners,
  morgan_park: morganPark as TrackDetailsCorners,
  phillip_island: phillipIsland as TrackDetailsCorners,
  queensland_raceway: queenslandRaceway as TrackDetailsCorners,
  sandown: sandown as TrackDetailsCorners,
  smp_brabham: smpBrabham as TrackDetailsCorners,
  smp_druitt: smpDruitt as TrackDetailsCorners,
  smp_gardner: smpGardner as TrackDetailsCorners,
  the_bend_gt: theBendGt as TrackDetailsCorners,
  the_bend_international: theBendInternational as TrackDetailsCorners,
  wakefield_park: wakefieldPark as TrackDetailsCorners,
  wanneroo: wanneroo as TrackDetailsCorners,
  winton: winton as TrackDetailsCorners,
};

export const TRACK_DETAILS_CORNER_IDS = Object.keys(LAYOUTS);

export function getTrackDetailsCorners(trackId: string): TrackDetailsCorners | undefined {
  return LAYOUTS[trackId];
}

export function getTrackDetailsLayoutRevision(trackId: string): string | undefined {
  const layout = getTrackDetailsCorners(trackId);
  if (!layout) return undefined;
  const source = layout.corners
    .map((c) => `${c.id}:${c.apex[0]},${c.apex[1]}:${c.entry[0]},${c.entry[1]}:${c.exit[0]},${c.exit[1]}`)
    .join('|');
  let hash = 5381;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  return `gpx-${layout.corners.length}-${(hash >>> 0).toString(36)}`;
}
