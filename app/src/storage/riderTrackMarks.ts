import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { logStorageError } from './logStorageError';

export type RiderCircuitDirection = 'clockwise' | 'anticlockwise';

export type RiderCornerMark = {
  id: string;
  number: number;
  point: [number, number];
  baked: boolean;
  surfaceCondition?: string;
  cornerType?: string;
  camber?: string;
  cornerEntry?: string;
  note: string;
};

export type RiderTrackMarks = {
  trackId: string;
  startFinish?: [number, number];
  direction?: RiderCircuitDirection;
  corners: RiderCornerMark[];
  updatedAt: number;
};

const KEY = STORAGE_KEYS.RIDER_TRACK_MARKS;

function emptyMarks(trackId: string): RiderTrackMarks {
  return { trackId, corners: [], updatedAt: 0 };
}

function normalizeCorner(raw: Record<string, unknown>): RiderCornerMark | null {
  if (typeof raw.id !== 'string' || typeof raw.number !== 'number') return null;
  const point = raw.point;
  if (!Array.isArray(point) || point.length !== 2) return null;
  const x = Number(point[0]);
  const y = Number(point[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    id: raw.id,
    number: raw.number,
    point: [x, y],
    baked: raw.baked === true,
    surfaceCondition: typeof raw.surfaceCondition === 'string' ? raw.surfaceCondition : undefined,
    cornerType: typeof raw.cornerType === 'string' ? raw.cornerType : undefined,
    camber: typeof raw.camber === 'string' ? raw.camber : undefined,
    cornerEntry: typeof raw.cornerEntry === 'string' ? raw.cornerEntry : undefined,
    note: typeof raw.note === 'string' ? raw.note : '',
  };
}

function normalizeDoc(raw: Record<string, unknown>, trackId: string): RiderTrackMarks {
  const corners = Array.isArray(raw.corners)
    ? (raw.corners as Record<string, unknown>[]).map(normalizeCorner).filter((c): c is RiderCornerMark => c != null)
    : [];
  const sf = raw.startFinish;
  let startFinish: [number, number] | undefined;
  if (Array.isArray(sf) && sf.length === 2 && Number.isFinite(Number(sf[0])) && Number.isFinite(Number(sf[1]))) {
    startFinish = [Number(sf[0]), Number(sf[1])];
  }
  return {
    trackId,
    startFinish,
    direction: raw.direction === 'clockwise' || raw.direction === 'anticlockwise' ? raw.direction : undefined,
    corners,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  };
}

async function readAll(): Promise<Record<string, RiderTrackMarks>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, RiderTrackMarks> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        out[id] = normalizeDoc(value as Record<string, unknown>, id);
      }
    }
    return out;
  } catch (e) {
    logStorageError('getRiderTrackMarks', e);
    return {};
  }
}

export async function getRiderTrackMarks(trackId: string): Promise<RiderTrackMarks> {
  const all = await readAll();
  return all[trackId] ?? emptyMarks(trackId);
}

export async function saveRiderTrackMarks(marks: RiderTrackMarks): Promise<void> {
  const next: RiderTrackMarks = { ...marks, updatedAt: Date.now() };
  try {
    const all = await readAll();
    all[marks.trackId] = next;
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    logStorageError('saveRiderTrackMarks', e);
    throw e;
  }
}

export async function clearRiderTrackMarks(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function nextRiderCornerNumber(marks: RiderTrackMarks, bakedCount: number): number {
  const extras = marks.corners.filter((c) => !c.baked);
  const used = extras.map((c) => c.number);
  let n = bakedCount + 1;
  while (used.includes(n)) n += 1;
  return n;
}

export function upsertRiderCorner(marks: RiderTrackMarks, corner: RiderCornerMark): RiderTrackMarks {
  const rest = marks.corners.filter((c) => c.id !== corner.id);
  return { ...marks, corners: [...rest, corner].sort((a, b) => a.number - b.number) };
}

export function removeRiderCorner(marks: RiderTrackMarks, cornerId: string): RiderTrackMarks {
  return { ...marks, corners: marks.corners.filter((c) => c.id !== cornerId || c.baked) };
}
