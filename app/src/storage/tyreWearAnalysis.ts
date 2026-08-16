import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { PhotoTakenWhen, PressureUnit, TyreAxle, WarmersUse } from '../calc/tyreWear';
import { logStorageError } from './logStorageError';

const KEY = STORAGE_KEYS.TYRE_WEAR_ANALYSIS;

export type TyreWearAnalysisState = {
  axle: TyreAxle | null;
  brandCompound: string;
  hotPressure: string;
  pressureUnit: PressureUnit;
  trackTemp: string;
  ambientTemp: string;
  sessionLength: string;
  warmers: WarmersUse;
  photoTaken: PhotoTakenWhen;
  trackId: string | null;
  trackName: string;
  notes: string;
};

export function emptyTyreWearAnalysisState(): TyreWearAnalysisState {
  return {
    axle: null,
    brandCompound: '',
    hotPressure: '',
    pressureUnit: 'psi',
    trackTemp: '',
    ambientTemp: '',
    sessionLength: '',
    warmers: 'unknown',
    photoTaken: 'unknown',
    trackId: null,
    trackName: '',
    notes: '',
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asAxle(value: unknown): TyreAxle | null {
  return value === 'front' || value === 'rear' ? value : null;
}

function asWarmers(value: unknown): WarmersUse {
  return value === 'yes' || value === 'no' ? value : 'unknown';
}

function asPhotoTaken(value: unknown): PhotoTakenWhen {
  return value === 'hot_pit_in' || value === 'cooled' ? value : 'unknown';
}

function asUnit(value: unknown): PressureUnit {
  return value === 'kPa' ? 'kPa' : 'psi';
}

function normalize(raw: Partial<TyreWearAnalysisState>): TyreWearAnalysisState {
  const empty = emptyTyreWearAnalysisState();
  return {
    ...empty,
    axle: asAxle(raw.axle),
    brandCompound: asString(raw.brandCompound),
    hotPressure: asString(raw.hotPressure),
    pressureUnit: asUnit(raw.pressureUnit),
    trackTemp: asString(raw.trackTemp),
    ambientTemp: asString(raw.ambientTemp),
    sessionLength: asString(raw.sessionLength),
    warmers: asWarmers(raw.warmers),
    photoTaken: asPhotoTaken(raw.photoTaken),
    trackId: typeof raw.trackId === 'string' && raw.trackId ? raw.trackId : null,
    trackName: asString(raw.trackName),
    notes: asString(raw.notes),
  };
}

export async function loadTyreWearAnalysisState(): Promise<TyreWearAnalysisState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyTyreWearAnalysisState();
    return normalize(JSON.parse(raw) as Partial<TyreWearAnalysisState>);
  } catch (e) {
    logStorageError('loadTyreWearAnalysisState', e);
    return emptyTyreWearAnalysisState();
  }
}

export async function saveTyreWearAnalysisState(state: TyreWearAnalysisState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    logStorageError('saveTyreWearAnalysisState', e);
  }
}
