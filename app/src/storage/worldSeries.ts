import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { logStorageError } from './logStorageError';

export type WorldSeriesOption = {
  id: string;
  label: string;
};

/** Always offered on the World events filter. */
export const FEATURED_WORLD_SERIES: WorldSeriesOption[] = [
  { id: 'motogp', label: 'MotoGP' },
  { id: 'worldsbk', label: 'WorldSBK' },
];

/** Known world series we do not ship dates for yet — rider can pin them. */
export const SUGGESTED_WORLD_SERIES: WorldSeriesOption[] = [
  { id: 'ewc', label: 'EWC' },
  { id: 'isle_of_man_tt', label: 'Isle of Man TT' },
  { id: 'red_bull_rookies', label: 'Rookies Cup' },
  { id: 'arrc', label: 'ARRC' },
  { id: 'motoamerica', label: 'MotoAmerica' },
];

const MAX_EXTRA_SERIES = 12;
const MAX_LABEL_LEN = 48;

export function isFeaturedWorldSeries(series: string): boolean {
  const id = series.toLowerCase();
  return FEATURED_WORLD_SERIES.some((s) => s.id === id);
}

export function seriesIdFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

function sanitizeExtra(raw: unknown): WorldSeriesOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as { id?: unknown; label?: unknown };
  const id = typeof rec.id === 'string' ? seriesIdFromLabel(rec.id) : '';
  const label = typeof rec.label === 'string' ? rec.label.trim().slice(0, MAX_LABEL_LEN) : '';
  if (!id || !label) return null;
  if (isFeaturedWorldSeries(id)) return null;
  return { id, label };
}

export async function getExtraWorldSeries(): Promise<WorldSeriesOption[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORLD_SERIES_EXTRA);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const extras: WorldSeriesOption[] = [];
    for (const item of parsed) {
      const clean = sanitizeExtra(item);
      if (!clean || seen.has(clean.id)) continue;
      seen.add(clean.id);
      extras.push(clean);
      if (extras.length >= MAX_EXTRA_SERIES) break;
    }
    return extras;
  } catch (e) {
    logStorageError('getExtraWorldSeries', e);
    return [];
  }
}

export async function addExtraWorldSeries(input: WorldSeriesOption): Promise<WorldSeriesOption[]> {
  const current = await getExtraWorldSeries();
  const clean = sanitizeExtra(input);
  if (!clean) return current;
  if (current.some((s) => s.id === clean.id)) return current;
  if (current.length >= MAX_EXTRA_SERIES) return current;
  const next = [...current, clean];
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.WORLD_SERIES_EXTRA, JSON.stringify(next));
  } catch (e) {
    logStorageError('addExtraWorldSeries', e);
  }
  return next;
}

export async function removeExtraWorldSeries(id: string): Promise<WorldSeriesOption[]> {
  const current = await getExtraWorldSeries();
  const next = current.filter((s) => s.id !== id);
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.WORLD_SERIES_EXTRA, JSON.stringify(next));
  } catch (e) {
    logStorageError('removeExtraWorldSeries', e);
  }
  return next;
}
