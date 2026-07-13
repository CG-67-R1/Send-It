import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { findTrackByLocation, type TrackGeofenceMatch } from './trackGeofenceMatch';

const KEY_ENABLED = '@roadrace_track_arrival_enabled';
const KEY_STATE = '@roadrace_track_arrival_state';

type TrackArrivalState = Record<
  string,
  {
    lastRemindedDate?: string;
    snoozedUntil?: string;
  }
>;

function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function readState(): Promise<TrackArrivalState> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STATE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TrackArrivalState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeState(state: TrackArrivalState): Promise<void> {
  await AsyncStorage.setItem(KEY_STATE, JSON.stringify(state));
}

export async function isTrackArrivalEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ENABLED);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setTrackArrivalEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ENABLED, enabled ? '1' : '0');
}

export async function requestForegroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function hasForegroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

export async function detectTrackAtCurrentLocation(): Promise<{
  match: TrackGeofenceMatch;
  userLat: number;
  userLng: number;
} | null> {
  if (Platform.OS === 'web') return null;

  const granted = await hasForegroundLocationPermission();
  if (!granted) return null;

  const position = await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GPS timeout')), 10000)
    ),
  ]);

  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;
  const match = findTrackByLocation(userLat, userLng);
  if (!match) return null;

  return { match, userLat, userLng };
}

export async function isSnoozedForTrack(trackId: string): Promise<boolean> {
  const state = await readState();
  const entry = state[trackId];
  if (!entry?.snoozedUntil) return false;
  return Date.parse(entry.snoozedUntil) > Date.now();
}

export async function shouldRemindForTrack(trackId: string): Promise<boolean> {
  if (await isSnoozedForTrack(trackId)) return false;
  const state = await readState();
  const entry = state[trackId];
  if (!entry?.lastRemindedDate) return true;
  return entry.lastRemindedDate !== localDateKey();
}

export async function markRemindedForTrack(trackId: string): Promise<void> {
  const state = await readState();
  const entry = state[trackId] ?? {};
  entry.lastRemindedDate = localDateKey();
  state[trackId] = entry;
  await writeState(state);
}

export async function snoozeTrackFor48Hours(trackId: string): Promise<void> {
  const state = await readState();
  const entry = state[trackId] ?? {};
  entry.snoozedUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  state[trackId] = entry;
  await writeState(state);
}

export interface TrackArrivalDetection {
  match: TrackGeofenceMatch;
  userLat: number;
  userLng: number;
}

/** Run full arrival check when feature is enabled. Returns detection if banner should show. */
export async function checkTrackArrival(): Promise<TrackArrivalDetection | null> {
  if (!(await isTrackArrivalEnabled())) return null;

  const detected = await detectTrackAtCurrentLocation();
  if (!detected) return null;

  const shouldRemind = await shouldRemindForTrack(detected.match.trackId);
  if (!shouldRemind) return null;

  return detected;
}
