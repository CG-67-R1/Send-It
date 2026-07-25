import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  DEFAULT_BIKE_BALANCE_INPUTS,
  type BikeBalanceInputs,
  type SkillMode,
} from '../calc/bikeBalance';

const KEY_STATE = STORAGE_KEYS.BIKE_BALANCE_STATE;

export type BikeBalancePersistedState = {
  inputs: BikeBalanceInputs;
  refInputs: BikeBalanceInputs | null;
  skillMode: SkillMode;
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

export async function loadBikeBalanceState(): Promise<BikeBalancePersistedState> {
  try {
    const raw = await AsyncStorage.getItem(KEY_STATE);
    if (!raw) {
      return {
        inputs: { ...DEFAULT_BIKE_BALANCE_INPUTS },
        refInputs: null,
        skillMode: 'rider',
      };
    }
    const parsed = JSON.parse(raw) as Partial<BikeBalancePersistedState>;
    return {
      inputs: mergeInputs(parsed.inputs),
      refInputs: parsed.refInputs ? mergeInputs(parsed.refInputs) : null,
      skillMode: parsed.skillMode ?? 'rider',
    };
  } catch {
    return {
      inputs: { ...DEFAULT_BIKE_BALANCE_INPUTS },
      refInputs: null,
      skillMode: 'rider',
    };
  }
}

export async function saveBikeBalanceState(state: BikeBalancePersistedState): Promise<void> {
  await AsyncStorage.setItem(KEY_STATE, JSON.stringify(state));
}
