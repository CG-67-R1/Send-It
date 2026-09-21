import anglesey from './anglesey.json';
import baskerville from './baskerville.json';
import brandsHatch from './brands-hatch.json';
import broadford from './broadford.json';
import cadwellPark from './cadwell-park.json';
import calderPark from './calder_park.json';
import donington from './donington.json';
import hiddenValley from './hidden_valley.json';
import knockhill from './knockhill.json';
import lakeside from './lakeside.json';
import macPark from './mac_park.json';
import mallala from './mallala.json';
import malloryPark from './mallory-park.json';
import morganPark from './morgan_park.json';
import oultonPark from './oulton-park.json';
import phillipIsland from './phillip_island.json';
import queenslandRaceway from './queensland_raceway.json';
import sandown from './sandown.json';
import silverstone from './silverstone.json';
import smpBrabham from './smp_brabham.json';
import smpDruitt from './smp_druitt.json';
import smpGardner from './smp_gardner.json';
import snetterton from './snetterton.json';
import theBendGt from './the_bend_gt.json';
import theBendInternational from './the_bend_international.json';
import thruxton from './thruxton.json';
import wakefieldPark from './wakefield_park.json';
import wanneroo from './wanneroo.json';
import winton from './winton.json';
import type { GpxTrackMap } from './types';

const MAPS: Record<string, GpxTrackMap> = {
  anglesey: anglesey as GpxTrackMap,
  baskerville: baskerville as GpxTrackMap,
  'brands-hatch': brandsHatch as GpxTrackMap,
  broadford: broadford as GpxTrackMap,
  'cadwell-park': cadwellPark as GpxTrackMap,
  calder_park: calderPark as GpxTrackMap,
  donington: donington as GpxTrackMap,
  hidden_valley: hiddenValley as GpxTrackMap,
  knockhill: knockhill as GpxTrackMap,
  lakeside: lakeside as GpxTrackMap,
  mac_park: macPark as GpxTrackMap,
  mallala: mallala as GpxTrackMap,
  'mallory-park': malloryPark as GpxTrackMap,
  morgan_park: morganPark as GpxTrackMap,
  'oulton-park': oultonPark as GpxTrackMap,
  phillip_island: phillipIsland as GpxTrackMap,
  queensland_raceway: queenslandRaceway as GpxTrackMap,
  sandown: sandown as GpxTrackMap,
  silverstone: silverstone as GpxTrackMap,
  smp_brabham: smpBrabham as GpxTrackMap,
  smp_druitt: smpDruitt as GpxTrackMap,
  smp_gardner: smpGardner as GpxTrackMap,
  snetterton: snetterton as GpxTrackMap,
  the_bend_gt: theBendGt as GpxTrackMap,
  the_bend_international: theBendInternational as GpxTrackMap,
  thruxton: thruxton as GpxTrackMap,
  wakefield_park: wakefieldPark as GpxTrackMap,
  wanneroo: wanneroo as GpxTrackMap,
  winton: winton as GpxTrackMap,
};

export const GPX_TRACK_MAP_IDS = Object.keys(MAPS);

export function getGpxTrackMap(trackId: string): GpxTrackMap | undefined {
  return MAPS[trackId];
}

export function listGpxTrackMaps(): { id: string; name: string }[] {
  return GPX_TRACK_MAP_IDS.map((id) => ({ id, name: MAPS[id].name }));
}
