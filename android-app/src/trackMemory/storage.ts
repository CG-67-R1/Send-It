import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

function keyFor(trackId: string): string {
  return `${STORAGE_KEYS.TRACK_MEMORY_BEST_LAP}:${trackId}`;
}

export async function readBestLapMs(trackId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(trackId));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export async function writeBestLapMs(trackId: string, ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return;
  try {
    const prev = await readBestLapMs(trackId);
    if (prev != null && prev <= ms) return;
    await AsyncStorage.setItem(keyFor(trackId), String(Math.round(ms)));
  } catch {
    /* ignore */
  }
}

export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '--:--.--';
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
