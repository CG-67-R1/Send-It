import mallala from '../data/trackMemory/mallala.json';
import type { TrackMemoryLayout } from './types';

const LAYOUTS: Record<string, TrackMemoryLayout> = {
  mallala: mallala as TrackMemoryLayout,
};

export const TRACK_MEMORY_TRACK_IDS = Object.keys(LAYOUTS);

export function getTrackMemoryLayout(trackId: string): TrackMemoryLayout | undefined {
  return LAYOUTS[trackId];
}

export function getDefaultTrackMemoryLayout(): TrackMemoryLayout {
  return LAYOUTS.mallala;
}

/** Layouts available for the Track Memory game (id + display name). */
export function listTrackMemoryTracks(): { id: string; name: string }[] {
  return TRACK_MEMORY_TRACK_IDS.map((id) => {
    const layout = LAYOUTS[id];
    return { id, name: layout.name };
  });
}
