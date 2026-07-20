import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { CustomSource, PriorityOrder } from '../types';

const KEY_PRIORITY = STORAGE_KEYS.HEADLINES_PRIORITY;
const KEY_CUSTOM_SOURCES = STORAGE_KEYS.HEADLINES_CUSTOM_SOURCES;
const KEY_NOTIFY_PRIORITY_1 = STORAGE_KEYS.HEADLINES_NOTIFY_PRIORITY_1;
const KEY_LAST_SEEN_P1_URLS = STORAGE_KEYS.HEADLINES_LAST_SEEN_P1_URLS;

const DEFAULT_PRIORITY: PriorityOrder = [
  'gpone',
  'worldsbk',
  'mcn',
  'bennetts',
  'motogp',
  'motogpnews',
  'motor_sport_motogp',
  'ma_roadrace',
  'asbk',
  'amcn_asbk',
  'amcn_club',
  'amcn_motogp',
  'amcn_worldsbk',
  'amcn_road_racing',
  'mcnews',
  'amcn_bsb',
  'amcn_endurance',
  'amcn_worldwcr',
  'amcn_kotb',
  'amcn_esbk',
];

/** Keep saved order, drop removed sources, append any new built-in/custom ids. */
export function mergePriorityOrder(
  saved: PriorityOrder,
  builtinIds: string[],
  customIds: string[] = []
): PriorityOrder {
  const valid = new Set([...builtinIds, ...customIds]);
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const id of saved) {
    if (!valid.has(id) || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  for (const id of [...builtinIds, ...customIds]) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

export async function getPriorityOrder(): Promise<PriorityOrder> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PRIORITY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [...DEFAULT_PRIORITY];
}

export async function setPriorityOrder(order: PriorityOrder): Promise<void> {
  await AsyncStorage.setItem(KEY_PRIORITY, JSON.stringify(order));
}

export async function getCustomSources(): Promise<CustomSource[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CUSTOM_SOURCES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function setCustomSources(sources: CustomSource[]): Promise<void> {
  await AsyncStorage.setItem(KEY_CUSTOM_SOURCES, JSON.stringify(sources));
}

export async function addCustomSource(url: string, name: string): Promise<CustomSource> {
  const existing = await getCustomSources();
  const id = `custom_${Date.now()}`;
  const newSource: CustomSource = { id, url, name };
  await setCustomSources([...existing, newSource]);
  return newSource;
}

export async function removeCustomSource(id: string): Promise<void> {
  const existing = await getCustomSources();
  await setCustomSources(existing.filter((s) => s.id !== id));
}

export async function getNotifyPriority1(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_NOTIFY_PRIORITY_1);
    return raw === 'true';
  } catch {}
  return false;
}

export async function setNotifyPriority1(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_NOTIFY_PRIORITY_1, JSON.stringify(enabled));
}

export async function getLastSeenPriority1Urls(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_SEEN_P1_URLS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function setLastSeenPriority1Urls(urls: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_SEEN_P1_URLS, JSON.stringify(urls));
}

/** Restores all locally stored news preferences to their defaults. */
export async function resetHeadlinesSettings(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY_PRIORITY,
    KEY_CUSTOM_SOURCES,
    KEY_NOTIFY_PRIORITY_1,
    KEY_LAST_SEEN_P1_URLS,
  ]);
}
