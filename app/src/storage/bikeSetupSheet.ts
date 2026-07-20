import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

const KEY_DAY_SHEET = STORAGE_KEYS.BIKE_SETUP_DAY_SHEET;
export const KEY_SESSION_HISTORY = STORAGE_KEYS.BIKE_SETUP_SESSION_HISTORY;

export type BikeSetupDaySheet = {
  dateIso: string;
  trackName: string;
  sessionNumber?: string;
  sessionNotes: string;
  goalsForToday: string;
  pressureUnit: 'psi' | 'kPa';
  tyreFrontPressure: string;
  tyreRearPressure: string;
  tyreFrontPressureCold: string;
  tyreFrontPressureHot: string;
  tyreRearPressureCold: string;
  tyreRearPressureHot: string;
  tyreBrandCompound: string;
  ambientTemp: string;
  trackTemp: string;
  fuelLevel: string;
  gearing: string;
  lapTimes: string;
  changesMade: string;
  changeResult: string;
  frontSag: string;
  frontPreload: string;
  frontCompression: string;
  frontRebound: string;
  frontRideHeight: string;
  rearSag: string;
  rearPreload: string;
  rearCompression: string;
  rearRebound: string;
  rearRideHeight: string;
  updatedAt: number;
};

export function emptyBikeSetupDaySheet(dateIso?: string): BikeSetupDaySheet {
  return {
    dateIso: dateIso ?? new Date().toISOString().slice(0, 10),
    trackName: '',
    sessionNumber: '',
    sessionNotes: '',
    goalsForToday: '',
    pressureUnit: 'psi',
    tyreFrontPressure: '',
    tyreRearPressure: '',
    tyreFrontPressureCold: '',
    tyreFrontPressureHot: '',
    tyreRearPressureCold: '',
    tyreRearPressureHot: '',
    tyreBrandCompound: '',
    ambientTemp: '',
    trackTemp: '',
    fuelLevel: '',
    gearing: '',
    lapTimes: '',
    changesMade: '',
    changeResult: '',
    frontSag: '',
    frontPreload: '',
    frontCompression: '',
    frontRebound: '',
    frontRideHeight: '',
    rearSag: '',
    rearPreload: '',
    rearCompression: '',
    rearRebound: '',
    rearRideHeight: '',
    updatedAt: Date.now(),
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeSheet(raw: Record<string, unknown>): BikeSetupDaySheet {
  const empty = emptyBikeSetupDaySheet();
  const tyreFrontPressure = asString(raw.tyreFrontPressure);
  const tyreRearPressure = asString(raw.tyreRearPressure);
  return {
    dateIso: asString(raw.dateIso) || empty.dateIso,
    trackName: asString(raw.trackName),
    sessionNumber: asString(raw.sessionNumber),
    sessionNotes: asString(raw.sessionNotes),
    goalsForToday: asString(raw.goalsForToday),
    pressureUnit: raw.pressureUnit === 'kPa' ? 'kPa' : 'psi',
    tyreFrontPressure,
    tyreRearPressure,
    tyreFrontPressureCold: asString(raw.tyreFrontPressureCold) || tyreFrontPressure,
    tyreFrontPressureHot: asString(raw.tyreFrontPressureHot),
    tyreRearPressureCold: asString(raw.tyreRearPressureCold) || tyreRearPressure,
    tyreRearPressureHot: asString(raw.tyreRearPressureHot),
    tyreBrandCompound: asString(raw.tyreBrandCompound),
    ambientTemp: asString(raw.ambientTemp),
    trackTemp: asString(raw.trackTemp),
    fuelLevel: asString(raw.fuelLevel),
    gearing: asString(raw.gearing),
    lapTimes: asString(raw.lapTimes),
    changesMade: asString(raw.changesMade),
    changeResult: asString(raw.changeResult),
    frontSag: asString(raw.frontSag),
    frontPreload: asString(raw.frontPreload),
    frontCompression: asString(raw.frontCompression),
    frontRebound: asString(raw.frontRebound),
    frontRideHeight: asString(raw.frontRideHeight),
    rearSag: asString(raw.rearSag),
    rearPreload: asString(raw.rearPreload),
    rearCompression: asString(raw.rearCompression),
    rearRebound: asString(raw.rearRebound),
    rearRideHeight: asString(raw.rearRideHeight),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export async function getBikeSetupDaySheet(): Promise<BikeSetupDaySheet> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DAY_SHEET);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') return normalizeSheet(parsed);
    }
  } catch {}
  return emptyBikeSetupDaySheet();
}

export async function saveBikeSetupDaySheet(sheet: BikeSetupDaySheet): Promise<void> {
  const next: BikeSetupDaySheet = { ...sheet, updatedAt: Date.now() };
  await AsyncStorage.setItem(KEY_DAY_SHEET, JSON.stringify(next));
}

export async function clearBikeSetupDaySheet(): Promise<BikeSetupDaySheet> {
  const empty = emptyBikeSetupDaySheet();
  await AsyncStorage.removeItem(KEY_DAY_SHEET);
  return empty;
}

/** Clears the current setup sheet and all locally saved session snapshots. */
export async function clearAllBikeSetupData(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_DAY_SHEET, KEY_SESSION_HISTORY]);
}

export async function getSessionHistory(): Promise<BikeSetupDaySheet[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSION_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map(normalizeSheet);
  } catch {
    return [];
  }
}

export async function saveSessionToHistory(
  sheet: BikeSetupDaySheet
): Promise<BikeSetupDaySheet[]> {
  const history = await getSessionHistory();
  const snapshot = normalizeSheet({ ...sheet, updatedAt: Date.now() });
  const next = [...history, snapshot].slice(-30);
  await AsyncStorage.setItem(KEY_SESSION_HISTORY, JSON.stringify(next));
  return next;
}

function historyIndex(history: BikeSetupDaySheet[], updatedAtOrIndex: number): number {
  const updatedAtIndex = history.findIndex((item) => item.updatedAt === updatedAtOrIndex);
  if (updatedAtIndex >= 0) return updatedAtIndex;
  return Number.isInteger(updatedAtOrIndex) &&
    updatedAtOrIndex >= 0 &&
    updatedAtOrIndex < history.length
    ? updatedAtOrIndex
    : -1;
}

export async function loadSessionFromHistory(
  updatedAtOrIndex: number
): Promise<BikeSetupDaySheet | null> {
  const history = await getSessionHistory();
  const index = historyIndex(history, updatedAtOrIndex);
  return index >= 0 ? normalizeSheet(history[index] as unknown as Record<string, unknown>) : null;
}

export async function deleteSessionFromHistory(
  updatedAtOrIndex: number
): Promise<BikeSetupDaySheet[]> {
  const history = await getSessionHistory();
  const index = historyIndex(history, updatedAtOrIndex);
  if (index < 0) return history;
  const next = history.filter((_, itemIndex) => itemIndex !== index);
  await AsyncStorage.setItem(KEY_SESSION_HISTORY, JSON.stringify(next));
  return next;
}

function line(label: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${label}: ${trimmed}`;
}

/** Format filled fields into a draft message for Bike Setup AI. */
export function formatBikeSetupSheetForAi(sheet: BikeSetupDaySheet): string {
  const sections: string[] = [
    'Here is my start-of-day bike setup sheet. Please review and advise.',
    '',
  ];

  const session = [
    line('Date', sheet.dateIso),
    line('Track', sheet.trackName),
    line('Session number', sheet.sessionNumber ?? ''),
    line('Session notes', sheet.sessionNotes),
    line('Goals for today', sheet.goalsForToday),
  ].filter(Boolean) as string[];

  if (session.length) {
    sections.push('Session', ...session, '');
  }

  const tyres = [
    line('Tyre brand / compound', sheet.tyreBrandCompound),
    line(`Front cold pressure (${sheet.pressureUnit})`, sheet.tyreFrontPressureCold),
    line(`Front hot pressure (${sheet.pressureUnit})`, sheet.tyreFrontPressureHot),
    line(`Rear cold pressure (${sheet.pressureUnit})`, sheet.tyreRearPressureCold),
    line(`Rear hot pressure (${sheet.pressureUnit})`, sheet.tyreRearPressureHot),
  ].filter(Boolean) as string[];

  if (tyres.length) {
    sections.push('Tyres', ...tyres, '');
  }

  const front = [
    line('Front sag', sheet.frontSag),
    line('Front preload', sheet.frontPreload),
    line('Front compression', sheet.frontCompression),
    line('Front rebound', sheet.frontRebound),
    line('Front ride height', sheet.frontRideHeight),
  ].filter(Boolean) as string[];

  if (front.length) {
    sections.push('Front suspension', ...front, '');
  }

  const rear = [
    line('Rear sag', sheet.rearSag),
    line('Rear preload', sheet.rearPreload),
    line('Rear compression', sheet.rearCompression),
    line('Rear rebound', sheet.rearRebound),
    line('Rear ride height', sheet.rearRideHeight),
  ].filter(Boolean) as string[];

  if (rear.length) {
    sections.push('Rear suspension', ...rear, '');
  }

  const extended = [
    line('Ambient temperature', sheet.ambientTemp),
    line('Track temperature', sheet.trackTemp),
    line('Fuel level', sheet.fuelLevel),
    line('Gearing', sheet.gearing),
    line('Lap times', sheet.lapTimes),
    line('Changes made', sheet.changesMade),
    line('Result of changes', sheet.changeResult),
  ].filter(Boolean) as string[];

  if (extended.length) {
    sections.push('Extended session', ...extended, '');
  }

  const body = sections.join('\n').trim();
  if (body === 'Here is my start-of-day bike setup sheet. Please review and advise.') {
    return `${body}\n\n(No settings filled in yet — ask me what to record first.)`;
  }
  return body;
}

export const COACH_GOALS_PROMPT_BASE =
  'What are your goals for today — lap times, consistency, a specific corner, or bike feel? Tell me what you want to work on and we will start there.';

/** Build the Coach empty-state opener, optionally including saved goals. */
export function buildCoachGoalsPrompt(goalsForToday?: string): string {
  const goals = goalsForToday?.trim();
  if (!goals) return COACH_GOALS_PROMPT_BASE;
  return `${COACH_GOALS_PROMPT_BASE}\n\nI see you already noted goals on your Day Setup Sheet:\n"${goals}"\n\nWant to refine those, or shall we dig into the first one?`;
}
