import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DAY_SHEET = '@roadrace_bike_setup_day_sheet';

export type BikeSetupDaySheet = {
  dateIso: string;
  trackName: string;
  sessionNotes: string;
  goalsForToday: string;
  tyreFrontPressure: string;
  tyreRearPressure: string;
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
    sessionNotes: '',
    goalsForToday: '',
    tyreFrontPressure: '',
    tyreRearPressure: '',
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
  return {
    dateIso: asString(raw.dateIso) || empty.dateIso,
    trackName: asString(raw.trackName),
    sessionNotes: asString(raw.sessionNotes),
    goalsForToday: asString(raw.goalsForToday),
    tyreFrontPressure: asString(raw.tyreFrontPressure),
    tyreRearPressure: asString(raw.tyreRearPressure),
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
    line('Session notes', sheet.sessionNotes),
    line('Goals for today', sheet.goalsForToday),
  ].filter(Boolean) as string[];

  if (session.length) {
    sections.push('Session', ...session, '');
  }

  const tyres = [
    line('Front tyre pressure', sheet.tyreFrontPressure),
    line('Rear tyre pressure', sheet.tyreRearPressure),
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
