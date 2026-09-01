import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_TRIVIA_BEST_SCORE_KEY, STORAGE_KEYS } from '../constants/storageKeys';

export const APP_OWNED_STATIC_STORAGE_KEYS = [
  ...Object.values(STORAGE_KEYS),
  LEGACY_TRIVIA_BEST_SCORE_KEY,
] as const;

export const APP_OWNED_DYNAMIC_STORAGE_PREFIXES = [
  `${STORAGE_KEYS.TRACK_MEMORY_BEST_LAP}:`,
] as const;

export async function clearAppOwnedLocalStorage(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const dynamicKeys = allKeys.filter((key) =>
    APP_OWNED_DYNAMIC_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
  await AsyncStorage.multiRemove([...new Set([...APP_OWNED_STATIC_STORAGE_KEYS, ...dynamicKeys])]);
}
