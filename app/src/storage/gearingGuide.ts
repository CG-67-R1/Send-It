import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { EngineConfig, GearingGoalId } from '../calc/gearing';
import { logStorageError } from './logStorageError';

const KEY = STORAGE_KEYS.GEARING_GUIDE_STATE;

export type GearingGuideState = {
  catalogId: string | null;
  manufacturer: string;
  family: string;
  yearFrom: string;
  yearTo: string;
  capacityCc: string;
  engineConfig: EngineConfig | '';
  peakTorqueRpm: string;
  peakPowerRpm: string;
  powerbandRpmFrom: string;
  powerbandRpmTo: string;
  overriddenFields: string[];
  frontTeeth: string;
  rearTeeth: string;
  newFrontTeeth: string;
  newRearTeeth: string;
  goalId: GearingGoalId | null;
  requestText: string;
  trackId: string | null;
  trackName: string;
};

export function emptyGearingGuideState(): GearingGuideState {
  return {
    catalogId: null,
    manufacturer: '',
    family: '',
    yearFrom: '',
    yearTo: '',
    capacityCc: '',
    engineConfig: '',
    peakTorqueRpm: '',
    peakPowerRpm: '',
    powerbandRpmFrom: '',
    powerbandRpmTo: '',
    overriddenFields: [],
    frontTeeth: '',
    rearTeeth: '',
    newFrontTeeth: '',
    newRearTeeth: '',
    goalId: null,
    requestText: '',
    trackId: null,
    trackName: '',
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalize(raw: Partial<GearingGuideState>): GearingGuideState {
  const empty = emptyGearingGuideState();
  return {
    ...empty,
    catalogId: typeof raw.catalogId === 'string' && raw.catalogId ? raw.catalogId : null,
    manufacturer: asString(raw.manufacturer),
    family: asString(raw.family),
    yearFrom: asString(raw.yearFrom),
    yearTo: asString(raw.yearTo),
    capacityCc: asString(raw.capacityCc),
    engineConfig: (asString(raw.engineConfig) as EngineConfig | '') || '',
    peakTorqueRpm: asString(raw.peakTorqueRpm),
    peakPowerRpm: asString(raw.peakPowerRpm),
    powerbandRpmFrom: asString(raw.powerbandRpmFrom),
    powerbandRpmTo: asString(raw.powerbandRpmTo),
    overriddenFields: Array.isArray(raw.overriddenFields)
      ? raw.overriddenFields.filter((item): item is string => typeof item === 'string')
      : [],
    frontTeeth: asString(raw.frontTeeth),
    rearTeeth: asString(raw.rearTeeth),
    newFrontTeeth: asString(raw.newFrontTeeth),
    newRearTeeth: asString(raw.newRearTeeth),
    goalId: (asString(raw.goalId) as GearingGoalId | '') || null,
    requestText: asString(raw.requestText),
    trackId: typeof raw.trackId === 'string' && raw.trackId ? raw.trackId : null,
    trackName: asString(raw.trackName),
  };
}

export async function loadGearingGuideState(): Promise<GearingGuideState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyGearingGuideState();
    return normalize(JSON.parse(raw) as Partial<GearingGuideState>);
  } catch (e) {
    logStorageError('loadGearingGuideState', e);
    return emptyGearingGuideState();
  }
}

export async function saveGearingGuideState(state: GearingGuideState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    logStorageError('saveGearingGuideState', e);
  }
}

export async function clearGearingGuideState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    logStorageError('clearGearingGuideState', e);
  }
}
