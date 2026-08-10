import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { logStorageError } from './logStorageError';
import {
  DEFAULT_BIKE_BALANCE_INPUTS,
  type BikeBalanceInputs,
  type SkillMode,
} from '../calc/bikeBalance';

const KEY_STATE = STORAGE_KEYS.BIKE_BALANCE_STATE;
const MAX_SAVED_SETUPS = 20;

export type BikeBalanceSavedSetup = {
  id: string;
  name: string;
  savedAt: number;
  inputs: BikeBalanceInputs;
};

export type BikeBalancePersistedState = {
  inputs: BikeBalanceInputs;
  refInputs: BikeBalanceInputs | null;
  skillMode: SkillMode;
  /** User passed the audience gate for this tool. */
  introAccepted: boolean;
  /** Named snapshots kept privately on-device for later load / compare. */
  savedSetups: BikeBalanceSavedSetup[];
};

function mergeInputs(raw: Partial<BikeBalanceInputs> | undefined): BikeBalanceInputs {
  return {
    ...DEFAULT_BIKE_BALANCE_INPUTS,
    ...(raw ?? {}),
    travelsByPosition: {
      ...DEFAULT_BIKE_BALANCE_INPUTS.travelsByPosition,
      ...(raw?.travelsByPosition ?? {}),
    },
    chainPitchMm: raw?.chainPitchMm ?? DEFAULT_BIKE_BALANCE_INPUTS.chainPitchMm,
    antiSquatAngleMode: raw?.antiSquatAngleMode ?? DEFAULT_BIKE_BALANCE_INPUTS.antiSquatAngleMode,
  };
}

function emptyState(): BikeBalancePersistedState {
  return {
    inputs: { ...DEFAULT_BIKE_BALANCE_INPUTS },
    refInputs: null,
    skillMode: 'rider',
    introAccepted: false,
    savedSetups: [],
  };
}

function normalizeSavedSetup(raw: unknown): BikeBalanceSavedSetup | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<BikeBalanceSavedSetup>;
  if (typeof item.id !== 'string' || !item.id) return null;
  if (typeof item.savedAt !== 'number') return null;
  return {
    id: item.id,
    name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Saved setup',
    savedAt: item.savedAt,
    inputs: mergeInputs(item.inputs),
  };
}

export async function loadBikeBalanceState(): Promise<BikeBalancePersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STATE);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<BikeBalancePersistedState>;
    const savedSetups = Array.isArray(parsed.savedSetups)
      ? parsed.savedSetups
          .map(normalizeSavedSetup)
          .filter((item): item is BikeBalanceSavedSetup => item != null)
          .slice(-MAX_SAVED_SETUPS)
      : [];
    return {
      inputs: mergeInputs(parsed.inputs),
      refInputs: parsed.refInputs ? mergeInputs(parsed.refInputs) : null,
      skillMode: parsed.skillMode ?? 'rider',
      introAccepted: Boolean(parsed.introAccepted),
      savedSetups,
    };
  } catch (e) {
    logStorageError('loadBikeBalanceState', e);
    return emptyState();
  }
}

export async function saveBikeBalanceState(state: BikeBalancePersistedState): Promise<void> {
  const next: BikeBalancePersistedState = {
    ...state,
    savedSetups: state.savedSetups.slice(-MAX_SAVED_SETUPS),
  };
  try {
    await AsyncStorage.setItem(KEY_STATE, JSON.stringify(next));
  } catch (e) {
    logStorageError('saveBikeBalanceState', e);
    throw e;
  }
}

export async function clearBikeBalanceState(): Promise<void> {
  await AsyncStorage.removeItem(KEY_STATE);
}

export function createBikeBalanceSavedSetup(inputs: BikeBalanceInputs): BikeBalanceSavedSetup {
  const name = inputs.name.trim() || 'Bike balance setup';
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    savedAt: Date.now(),
    inputs: mergeInputs(inputs),
  };
}

export function upsertBikeBalanceSavedSetup(
  savedSetups: BikeBalanceSavedSetup[],
  setup: BikeBalanceSavedSetup
): BikeBalanceSavedSetup[] {
  return [...savedSetups.filter((item) => item.id !== setup.id), setup].slice(-MAX_SAVED_SETUPS);
}
