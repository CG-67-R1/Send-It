import baskerville from './maps/baskerville.json';
import broadford from './maps/broadford.json';
import calderPark from './maps/calder_park.json';
import hiddenValley from './maps/hidden_valley.json';
import lakeside from './maps/lakeside.json';
import macPark from './maps/mac_park.json';
import mallala from './maps/mallala.json';
import morganPark from './maps/morgan_park.json';
import phillipIsland from './maps/phillip_island.json';
import queenslandRaceway from './maps/queensland_raceway.json';
import sandown from './maps/sandown.json';
import smpBrabham from './maps/smp_brabham.json';
import smpDruitt from './maps/smp_druitt.json';
import smpGardner from './maps/smp_gardner.json';
import theBendGt from './maps/the_bend_gt.json';
import theBendInternational from './maps/the_bend_international.json';
import wakefieldPark from './maps/wakefield_park.json';
import wanneroo from './maps/wanneroo.json';
import winton from './maps/winton.json';
import extraInfra from './infrastructure.json';
import factsDoc from './facts.json';
import type { TrackInfoFacts, TrackInfoInfra, TrackInfoMap } from './types';
import { areTrackInfoCornersVerified, getTrackInfoMapProofStatus } from './mapProofStatus';
export {
  areTrackInfoCornersVerified,
  getTrackInfoMapProofStatus,
} from './mapProofStatus';

const MAPS: Record<string, TrackInfoMap> = {
  baskerville: baskerville as TrackInfoMap,
  broadford: broadford as TrackInfoMap,
  calder_park: calderPark as TrackInfoMap,
  hidden_valley: hiddenValley as TrackInfoMap,
  lakeside: lakeside as TrackInfoMap,
  mac_park: macPark as TrackInfoMap,
  mallala: mallala as TrackInfoMap,
  morgan_park: morganPark as TrackInfoMap,
  phillip_island: phillipIsland as TrackInfoMap,
  queensland_raceway: queenslandRaceway as TrackInfoMap,
  sandown: sandown as TrackInfoMap,
  smp_brabham: smpBrabham as TrackInfoMap,
  smp_druitt: smpDruitt as TrackInfoMap,
  smp_gardner: smpGardner as TrackInfoMap,
  the_bend_gt: theBendGt as TrackInfoMap,
  the_bend_international: theBendInternational as TrackInfoMap,
  wakefield_park: wakefieldPark as TrackInfoMap,
  wanneroo: wanneroo as TrackInfoMap,
  winton: winton as TrackInfoMap,
};

const EXTRA = extraInfra as Record<string, TrackInfoInfra[]>;
const FACTS = factsDoc as Record<string, TrackInfoFacts>;

export const TRACK_INFO_TRACK_IDS = Object.keys(MAPS);

export function getTrackInfoMap(trackId: string): TrackInfoMap | undefined {
  return MAPS[trackId];
}

export function listTrackInfoTracks(): { id: string; name: string }[] {
  return TRACK_INFO_TRACK_IDS.map((id) => ({ id, name: MAPS[id].name }));
}

export function listVerifiedTrackInfoTracks(): { id: string; name: string }[] {
  return listTrackInfoTracks().filter((track) => areTrackInfoCornersVerified(track.id));
}

export function hasVerifiedTrackInfoTracks(): boolean {
  return TRACK_INFO_TRACK_IDS.some((id) => areTrackInfoCornersVerified(id));
}

export function getTrackInfoFacts(trackId: string): TrackInfoFacts | undefined {
  return FACTS[trackId];
}

export function getTrackInfoInfrastructure(trackId: string): TrackInfoInfra[] {
  const map = MAPS[trackId];
  if (!map) return [];
  return [...(map.derivedInfra ?? []), ...(EXTRA[trackId] ?? [])];
}

export function elevationSummary(map: TrackInfoMap): string {
  if (map.hasElevation && map.elevSpanM != null && map.elevSpanM >= 5) {
    const src =
      map.elevSource === 'dem' ? 'terrain model' : map.elevSource === 'gpx' ? 'on-board trace' : 'bake';
    return `About ${map.elevSpanM} m of elevation change on this layout (${src}).`;
  }
  if (map.hasElevation && map.elevSpanM != null) {
    return `Largely flat — about ${map.elevSpanM} m of elevation change.`;
  }
  return 'Elevation is not recorded on this map bake. Treat the circuit as modest rolling terrain until you walk it.';
}
