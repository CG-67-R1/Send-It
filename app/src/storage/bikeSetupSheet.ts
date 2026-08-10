import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { logStorageError } from './logStorageError';

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
  } catch (e) {
    logStorageError('getBikeSetupDaySheet', e);
  }
  return emptyBikeSetupDaySheet();
}

export async function saveBikeSetupDaySheet(sheet: BikeSetupDaySheet): Promise<void> {
  const next: BikeSetupDaySheet = { ...sheet, updatedAt: Date.now() };
  try {
    await AsyncStorage.setItem(KEY_DAY_SHEET, JSON.stringify(next));
  } catch (e) {
    logStorageError('saveBikeSetupDaySheet', e);
    throw e;
  }
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
  } catch (e) {
    logStorageError('getSessionHistory', e);
    return [];
  }
}

export async function saveSessionToHistory(
  sheet: BikeSetupDaySheet
): Promise<BikeSetupDaySheet[]> {
  try {
    const history = await getSessionHistory();
    const snapshot = normalizeSheet({ ...sheet, updatedAt: Date.now() });
    const next = [...history, snapshot].slice(-30);
    await AsyncStorage.setItem(KEY_SESSION_HISTORY, JSON.stringify(next));
    return next;
  } catch (e) {
    logStorageError('saveSessionToHistory', e);
    throw e;
  }
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

const COMPARE_FIELDS: { key: keyof BikeSetupDaySheet; label: string }[] = [
  { key: 'dateIso', label: 'Date' },
  { key: 'trackName', label: 'Track' },
  { key: 'sessionNumber', label: 'Session number' },
  { key: 'sessionNotes', label: 'Session notes' },
  { key: 'goalsForToday', label: 'Goals' },
  { key: 'tyreBrandCompound', label: 'Tyre brand / compound' },
  { key: 'tyreFrontPressureCold', label: 'Front cold pressure' },
  { key: 'tyreFrontPressureHot', label: 'Front hot pressure' },
  { key: 'tyreRearPressureCold', label: 'Rear cold pressure' },
  { key: 'tyreRearPressureHot', label: 'Rear hot pressure' },
  { key: 'frontSag', label: 'Front sag' },
  { key: 'frontPreload', label: 'Front preload' },
  { key: 'frontCompression', label: 'Front compression' },
  { key: 'frontRebound', label: 'Front rebound' },
  { key: 'frontRideHeight', label: 'Front ride height' },
  { key: 'rearSag', label: 'Rear sag' },
  { key: 'rearPreload', label: 'Rear preload' },
  { key: 'rearCompression', label: 'Rear compression' },
  { key: 'rearRebound', label: 'Rear rebound' },
  { key: 'rearRideHeight', label: 'Rear ride height' },
  { key: 'ambientTemp', label: 'Ambient temperature' },
  { key: 'trackTemp', label: 'Track temperature' },
  { key: 'fuelLevel', label: 'Fuel level' },
  { key: 'gearing', label: 'Gearing' },
  { key: 'lapTimes', label: 'Lap times' },
  { key: 'changesMade', label: 'Changes made' },
  { key: 'changeResult', label: 'Result of changes' },
];

export type BikeSetupFieldDiff = {
  key: keyof BikeSetupDaySheet;
  label: string;
  current: string;
  saved: string;
};

/** Field-level diffs between the working sheet and a saved snapshot (for comparison). */
export function compareBikeSetupSheets(
  current: BikeSetupDaySheet,
  saved: BikeSetupDaySheet
): BikeSetupFieldDiff[] {
  const diffs: BikeSetupFieldDiff[] = [];
  for (const field of COMPARE_FIELDS) {
    const currentValue = String(current[field.key] ?? '').trim();
    const savedValue = String(saved[field.key] ?? '').trim();
    if (currentValue === savedValue) continue;
    if (!currentValue && !savedValue) continue;
    diffs.push({
      key: field.key,
      label: field.label,
      current: currentValue || '—',
      saved: savedValue || '—',
    });
  }
  if (current.pressureUnit !== saved.pressureUnit) {
    diffs.unshift({
      key: 'pressureUnit',
      label: 'Pressure unit',
      current: current.pressureUnit,
      saved: saved.pressureUnit,
    });
  }
  return diffs;
}

function sheetSections(sheet: BikeSetupDaySheet): string[] {
  const sections: string[] = [];

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

  return sections;
}

export function bikeSetupSheetShareTitle(sheet: BikeSetupDaySheet): string {
  const track = sheet.trackName.trim() || 'Bike setup';
  const date = sheet.dateIso.trim();
  return date ? `${track} – ${date}` : track;
}

/** Plain-text setup for messaging / export (no AI prompt wrapper). */
export function formatBikeSetupSheetAsText(sheet: BikeSetupDaySheet): string {
  const sections = sheetSections(sheet);
  const body = sections.join('\n').trim();
  if (!body) {
    return 'Bike setup sheet (no settings filled in yet).';
  }
  return `Bike setup sheet\n\n${body}`;
}

/** Format filled fields into a draft message for Bike Setup AI. */
export function formatBikeSetupSheetForAi(sheet: BikeSetupDaySheet): string {
  const sections: string[] = [
    'Here is my start-of-day bike setup sheet. Please review and advise.',
    '',
    ...sheetSections(sheet),
  ];

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
