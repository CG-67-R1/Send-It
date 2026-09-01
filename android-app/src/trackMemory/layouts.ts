import baskerville from '../data/trackMemory/baskerville.json';
import broadford from '../data/trackMemory/broadford.json';
import calderPark from '../data/trackMemory/calder_park.json';
import hiddenValley from '../data/trackMemory/hidden_valley.json';
import lakeside from '../data/trackMemory/lakeside.json';
import macPark from '../data/trackMemory/mac_park.json';
import mallala from '../data/trackMemory/mallala.json';
import morganPark from '../data/trackMemory/morgan_park.json';
import phillipIsland from '../data/trackMemory/phillip_island.json';
import queenslandRaceway from '../data/trackMemory/queensland_raceway.json';
import sandown from '../data/trackMemory/sandown.json';
import smpBrabham from '../data/trackMemory/smp_brabham.json';
import smpDruitt from '../data/trackMemory/smp_druitt.json';
import smpGardner from '../data/trackMemory/smp_gardner.json';
import theBendGt from '../data/trackMemory/the_bend_gt.json';
import theBendInternational from '../data/trackMemory/the_bend_international.json';
import wakefieldPark from '../data/trackMemory/wakefield_park.json';
import wanneroo from '../data/trackMemory/wanneroo.json';
import winton from '../data/trackMemory/winton.json';
import type { TrackMemoryLayout } from './types';

const LAYOUTS: Record<string, TrackMemoryLayout> = {
  baskerville: baskerville as TrackMemoryLayout,
  broadford: broadford as TrackMemoryLayout,
  calder_park: calderPark as TrackMemoryLayout,
  hidden_valley: hiddenValley as TrackMemoryLayout,
  lakeside: lakeside as TrackMemoryLayout,
  mac_park: macPark as TrackMemoryLayout,
  mallala: mallala as TrackMemoryLayout,
  morgan_park: morganPark as TrackMemoryLayout,
  phillip_island: phillipIsland as TrackMemoryLayout,
  queensland_raceway: queenslandRaceway as TrackMemoryLayout,
  sandown: sandown as TrackMemoryLayout,
  smp_brabham: smpBrabham as TrackMemoryLayout,
  smp_druitt: smpDruitt as TrackMemoryLayout,
  smp_gardner: smpGardner as TrackMemoryLayout,
  the_bend_gt: theBendGt as TrackMemoryLayout,
  the_bend_international: theBendInternational as TrackMemoryLayout,
  wakefield_park: wakefieldPark as TrackMemoryLayout,
  wanneroo: wanneroo as TrackMemoryLayout,
  winton: winton as TrackMemoryLayout,
};

export const TRACK_MEMORY_TRACK_IDS = Object.keys(LAYOUTS);

/** Catalog track ids with no Emtron GPX bake yet. */
export const TRACK_MEMORY_MISSING_GPX = [] as const;

/** Baked but withheld from the picker — see NOT_PLAYABLE in the bake script. */
export const TRACK_MEMORY_NEEDS_REBAKE = [] as const;

export function getTrackMemoryLayout(trackId: string): TrackMemoryLayout | undefined {
  return LAYOUTS[trackId];
}

export function getDefaultTrackMemoryLayout(): TrackMemoryLayout {
  return LAYOUTS.mallala ?? LAYOUTS[TRACK_MEMORY_TRACK_IDS[0]];
}

/** Layouts with baked GPX (id + display name). Used as the map geometry source. */
export function listTrackMemoryTracks(): { id: string; name: string }[] {
  return TRACK_MEMORY_TRACK_IDS.map((id) => {
    const layout = LAYOUTS[id];
    return { id, name: layout.name };
  });
}
