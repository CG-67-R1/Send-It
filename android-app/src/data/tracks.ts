import catalog from './tracks.json';
import { getBundledTracksCatalog } from '../packs/loader';
import { getTrackDetailsCorners } from './trackDetailsCorners';

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
  if (!track) return undefined;
  return withDetectorCorners(track).corners.find((c) => c.id === cornerId);
}

/** Track Walk / notes use the detector count, not a frozen catalog N. */
export function withDetectorCorners(track: TrackDefinition): TrackDefinition {
  if (track.isOther) return track;
  const layout = getTrackDetailsCorners(track.id);
  if (!layout) return track;
  const named = new Map(
    track.corners.filter((c) => c.number != null).map((c) => [c.number as number, c])
  );
  const countsMatch = named.size === layout.corners.length;
  const finish = track.corners.filter((c) => c.isFinish);
  return {
    ...track,
    corners: [
      ...layout.corners.map((c) => {
        const fromCatalog = named.get(c.number);
        return {
          id: c.id,
          number: c.number,
          label:
            countsMatch && fromCatalog?.label && !isGenericTurnLabel(fromCatalog.label, c.number)
              ? fromCatalog.label
              : `T${c.number}`,
          shape: fromCatalog?.shape,
          direction: (c.direction ?? 'complex') as CornerDirection,
          approachFrom: c.approachFrom,
        };
      }),
      ...finish,
    ],
  };
}

function isGenericTurnLabel(label: string, number: number): boolean {
  return new RegExp(`^Turn\\s*${number}$`, 'i').test(label.trim());
}

export function formatCornerHeading(
  corner: Pick<CornerDefinition, 'number' | 'label' | 'direction' | 'isFinish'>,
  userNickname?: string
): string {
  if (corner.isFinish || corner.number === null) {
    const nick = userNickname?.trim();
    return nick ? `T-Finish — straight (${nick})` : 'T-Finish — straight';
  }
  const nick = userNickname?.trim();
  const name = nick || corner.label?.trim() || '';
  const hand = corner.direction === 'left' || corner.direction === 'right' ? ` (${corner.direction})` : '';
  if (!name || isGenericTurnLabel(name, corner.number)) {
    return `T${corner.number}${hand}`;
  }
  return `T${corner.number} — ${name}${hand}`;
}

export function isOtherTrackComplete(ctx: OtherTrackContext | undefined): boolean {
  return Boolean(ctx?.customName?.trim() && ctx?.direction);
}
