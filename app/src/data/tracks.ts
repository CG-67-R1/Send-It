import catalog from './tracks.json';
import { getBundledTracksCatalog } from '../packs/loader';

export type CornerDirection = 'left' | 'right' | 'straight' | 'complex';

export interface CornerDefinition {
  id: string;
  number: number | null;
  label: string;
  shape?: string;
  direction: CornerDirection;
  approachFrom?: string | null;
  isFinish?: boolean;
}

export interface TrackDefinition {
  id: string;
  name: string;
  layout?: string;
  direction: 'clockwise' | 'anticlockwise' | 'unknown';
  lengthKm?: string;
  isOther: boolean;
  corners: CornerDefinition[];
}

export type OtherTrackDirection = 'clockwise' | 'anticlockwise' | 'unknown';

export interface OtherTrackContext {
  customName: string;
  country?: string;
  direction: OtherTrackDirection;
  layout?: string;
  length?: string;
  surfaceNotes?: string;
  additionalNotes?: string;
}

const OTHER_CORNER_COUNT = 20;

function buildOtherCorners(): CornerDefinition[] {
  const corners: CornerDefinition[] = [];
  for (let n = 1; n <= OTHER_CORNER_COUNT; n++) {
    corners.push({
      id: `other_t${n}`,
      number: n,
      label: `T${n}`,
      direction: 'complex',
      approachFrom: n === 1 ? 'main straight / start-finish' : `T${n - 1} exit`,
    });
  }
  corners.push({
    id: 'other_t_finish',
    number: null,
    label: 'T-Finish',
    shape: 'Straight',
    direction: 'straight',
    approachFrom: 'final corner exit onto main straight',
    isFinish: true,
  });
  return corners;
}

export const OTHER_TRACK: TrackDefinition = {
  id: 'other',
  name: 'Other track',
  direction: 'unknown',
  isOther: true,
  corners: buildOtherCorners(),
};

const bundled = getBundledTracksCatalog();
const CATALOG_TRACKS: TrackDefinition[] = (
  (bundled.tracks?.length
    ? bundled
    : (catalog as { tracks: TrackDefinition[] })) as { tracks: TrackDefinition[] }
).tracks;

export function getCatalogTracks(): TrackDefinition[] {
  return CATALOG_TRACKS;
}

export function getAllTracks(): TrackDefinition[] {
  return [...CATALOG_TRACKS, OTHER_TRACK];
}

export function getTrackById(id: string | null | undefined): TrackDefinition | undefined {
  if (!id) return undefined;
  if (id === 'other') return OTHER_TRACK;
  return CATALOG_TRACKS.find((t) => t.id === id);
}

export function getCornerById(trackId: string, cornerId: string): CornerDefinition | undefined {
  const track = getTrackById(trackId);
  return track?.corners.find((c) => c.id === cornerId);
}

export function formatCornerHeading(
  corner: Pick<CornerDefinition, 'number' | 'label' | 'direction' | 'isFinish'>,
  userNickname?: string
): string {
  if (corner.isFinish || corner.number === null) {
    const nick = userNickname?.trim();
    return nick ? `T-Finish — straight (${nick})` : 'T-Finish — straight';
  }
  const name = userNickname?.trim() || corner.label;
  return `T${corner.number} — ${name} (${corner.direction})`;
}

export function isOtherTrackComplete(ctx: OtherTrackContext | undefined): boolean {
  return Boolean(ctx?.customName?.trim() && ctx?.direction);
}
