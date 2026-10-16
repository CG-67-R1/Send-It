import { isUkReleaseTrack, releasePackId } from '../../../constants/releasePack';
import factsDoc from './facts.json';
import { getTrackMemoryLayout } from '../../trackMemory/layouts';
import { GPX_TRACK_MAP_IDS, getGpxTrackMap, listGpxTrackMaps } from '../gpxTrackMaps';
import type { TrackInfoFacts } from './types';

const FACTS = factsDoc as Record<string, TrackInfoFacts>;

function visibleTrackIds(): string[] {
  if (releasePackId() !== 'uk') return GPX_TRACK_MAP_IDS;
  return GPX_TRACK_MAP_IDS.filter((id) => isUkReleaseTrack(id));
}

export const TRACK_INFO_TRACK_IDS = visibleTrackIds();

export function listTrackInfoTracks(): { id: string; name: string }[] {
  const allowed = new Set(TRACK_INFO_TRACK_IDS);
  return listGpxTrackMaps().filter((track) => allowed.has(track.id));
}

export function hasTrackInfoMap(trackId: string): boolean {
  return TRACK_INFO_TRACK_IDS.includes(trackId) && Boolean(getGpxTrackMap(trackId));
}

export function getTrackInfoFacts(trackId: string): TrackInfoFacts | undefined {
  return FACTS[trackId];
}

export function elevationSummary(trackId: string): string {
  const layout = getTrackMemoryLayout(trackId);
  if (layout?.hasElevation && layout.elevSpanM != null && layout.elevSpanM >= 5) {
    const src =
      layout.elevSource === 'dem'
        ? 'terrain model'
        : layout.elevSource === 'gpx'
          ? 'on-board trace'
          : 'bake';
    return `About ${layout.elevSpanM} m of elevation change on this layout (${src}).`;
  }
  if (layout?.hasElevation && layout.elevSpanM != null) {
    return `Largely flat — about ${layout.elevSpanM} m of elevation change.`;
  }
  return 'Elevation is not recorded on this map bake. Treat the circuit as modest rolling terrain until you walk it.';
}
