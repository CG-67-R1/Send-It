import factsDoc from './facts.json';
import { getTrackMemoryLayout } from '../../trackMemory/layouts';
import { GPX_TRACK_MAP_IDS, getGpxTrackMap, listGpxTrackMaps } from '../gpxTrackMaps';
import type { TrackInfoFacts } from './types';

const FACTS = factsDoc as Record<string, TrackInfoFacts>;

export const TRACK_INFO_TRACK_IDS = GPX_TRACK_MAP_IDS;

export function listTrackInfoTracks(): { id: string; name: string }[] {
  return listGpxTrackMaps();
}

export function hasTrackInfoMap(trackId: string): boolean {
  return Boolean(getGpxTrackMap(trackId));
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
