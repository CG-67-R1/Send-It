import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomSource, PriorityOrder } from '../types';

const KEY_PRIORITY = '@roadrace_headlines_priority';
const KEY_CUSTOM_SOURCES = '@roadrace_headlines_custom_sources';
const KEY_NOTIFY_PRIORITY_1 = '@roadrace_headlines_notify_priority_1';
const KEY_LAST_SEEN_P1_URLS = '@roadrace_headlines_last_seen_p1_urls';

const DEFAULT_PRIORITY: PriorityOrder = [
  'motogp',
  'worldsbk',
  'motor_sport_motogp',
  'amcn',
  'asbk',
  'motor_sport',
  'mcn',
  'bennetts',
];

export async function getPriorityOrder(): Promise<PriorityOrder> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PRIORITY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return DEFAULT_PRIORITY;
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
