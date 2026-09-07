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
import winton from './winton.json';
import type { GpxTrackMap } from './types';

const MAPS: Record<string, GpxTrackMap> = {
  baskerville: baskerville as GpxTrackMap,
  broadford: broadford as GpxTrackMap,
  calder_park: calderPark as GpxTrackMap,
  hidden_valley: hiddenValley as GpxTrackMap,
  lakeside: lakeside as GpxTrackMap,
  mac_park: macPark as GpxTrackMap,
  mallala: mallala as GpxTrackMap,
  morgan_park: morganPark as GpxTrackMap,
  phillip_island: phillipIsland as GpxTrackMap,
  queensland_raceway: queenslandRaceway as GpxTrackMap,
  sandown: sandown as GpxTrackMap,
  smp_brabham: smpBrabham as GpxTrackMap,
  smp_druitt: smpDruitt as GpxTrackMap,
  smp_gardner: smpGardner as GpxTrackMap,
  the_bend_gt: theBendGt as GpxTrackMap,
  the_bend_international: theBendInternational as GpxTrackMap,
  wakefield_park: wakefieldPark as GpxTrackMap,
  winton: winton as GpxTrackMap,
};

export const GPX_TRACK_MAP_IDS = Object.keys(MAPS);

export function getGpxTrackMap(trackId: string): GpxTrackMap | undefined {
  return MAPS[trackId];
}

export function listGpxTrackMaps(): { id: string; name: string }[] {
  return GPX_TRACK_MAP_IDS.map((id) => ({ id, name: MAPS[id].name }));
}
