import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { OtherTrackContext } from '../data/tracks';
import { logStorageError } from './logStorageError';
import { trackPrepBriefingInstruction, trackPrepLevelFromActivity } from '../utils/riderSkillCopy';

export { trackPrepLevelFromActivity };

const KEY_SELECTED = STORAGE_KEYS.TRACK_PREP_SELECTED_TRACK;
const KEY_DRAFT = STORAGE_KEYS.TRACKDAY_PREP_DRAFT;
const KEY_HISTORY = STORAGE_KEYS.TRACKDAY_PREP_HISTORY;

export type RiderLevel = 'newbie' | 'can_ride' | 'experienced' | 'racer';
export type TyreType = 'road' | 'race_slicks' | 'wets';
export type TyreCondition = 'new' | 'used' | 'heat_cycles';

export const RIDER_LEVEL_OPTIONS: { id: RiderLevel; label: string }[] = [
  { id: 'newbie', label: 'Newbie' },
  { id: 'can_ride', label: 'Can ride' },
  { id: 'experienced', label: 'Experienced' },
  { id: 'racer', label: 'Racer' },
];

export const TYRE_TYPE_OPTIONS: { id: TyreType; label: string }[] = [
  { id: 'road', label: 'Road' },
  { id: 'race_slicks', label: 'Race slicks' },
  { id: 'wets', label: 'Wets' },
];

export const TYRE_CONDITION_OPTIONS: { id: TyreCondition; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'used', label: 'Used' },
  { id: 'heat_cycles', label: 'A few heat cycles' },
];

export type TrackPrepSelectedTrack = {
  trackId: string;
  trackName: string;
  otherContext?: OtherTrackContext;
};

export type TrackdayPrepDraft = {
  trackId: string;
  trackName: string;
  otherContext?: OtherTrackContext;
  dateIso: string;
  riderLevel: RiderLevel | '';
  bike: string;
  tyreType: TyreType | '';
  tyreCondition: TyreCondition | '';
  notes: string;
  forecastSummary: string;
  updatedAt: number;
};

export type TrackdayPrepReport = TrackdayPrepDraft & {
  reportText: string;
  savedAt: number;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyTrackdayPrepDraft(
  track?: Partial<Pick<TrackdayPrepDraft, 'trackId' | 'trackName' | 'otherContext'>>
): TrackdayPrepDraft {
  return {
    trackId: track?.trackId ?? '',
    trackName: track?.trackName ?? '',
    otherContext: track?.otherContext,
    dateIso: todayIso(),
    riderLevel: '',
    bike: '',
    tyreType: '',
    tyreCondition: '',
    notes: '',
    forecastSummary: '',
    updatedAt: Date.now(),
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeDraft(raw: Record<string, unknown>): TrackdayPrepDraft {
  const base = emptyTrackdayPrepDraft();
  return {
    ...base,
    trackId: asString(raw.trackId),
    trackName: asString(raw.trackName),
    otherContext:
      raw.otherContext && typeof raw.otherContext === 'object'
        ? (raw.otherContext as OtherTrackContext)
        : undefined,
    dateIso: asString(raw.dateIso) || todayIso(),
    riderLevel: asString(raw.riderLevel) as RiderLevel | '',
    bike: asString(raw.bike),
    tyreType: asString(raw.tyreType) as TyreType | '',
    tyreCondition: asString(raw.tyreCondition) as TyreCondition | '',
    notes: asString(raw.notes),
    forecastSummary: asString(raw.forecastSummary),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export async function getTrackPrepSelectedTrack(): Promise<TrackPrepSelectedTrack | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SELECTED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrackPrepSelectedTrack;
    if (!parsed?.trackId || !parsed?.trackName) return null;
    return parsed;
  } catch (e) {
    logStorageError('getTrackPrepSelectedTrack', e);
    return null;
  }
}

export async function saveTrackPrepSelectedTrack(sel: TrackPrepSelectedTrack): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SELECTED, JSON.stringify(sel));
  } catch (e) {
    logStorageError('saveTrackPrepSelectedTrack', e);
  }
}

export async function getTrackdayPrepDraft(): Promise<TrackdayPrepDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DRAFT);
    if (!raw) return null;
    return normalizeDraft(JSON.parse(raw) as Record<string, unknown>);
  } catch (e) {
    logStorageError('getTrackdayPrepDraft', e);
    return null;
  }
}

export async function saveTrackdayPrepDraft(draft: TrackdayPrepDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_DRAFT, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch (e) {
    logStorageError('saveTrackdayPrepDraft', e);
  }
}

export async function getTrackdayPrepHistory(): Promise<TrackdayPrepReport[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackdayPrepReport[]) : [];
  } catch (e) {
    logStorageError('getTrackdayPrepHistory', e);
    return [];
  }
}

export async function saveTrackdayPrepToHistory(report: TrackdayPrepReport): Promise<void> {
  try {
    const history = await getTrackdayPrepHistory();
    history.unshift(report);
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(history.slice(0, 30)));
  } catch (e) {
    logStorageError('saveTrackdayPrepToHistory', e);
  }
}

function labelFor<T extends string>(
  options: { id: T; label: string }[],
  id: string
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

export function formatTrackdayPrepSummary(draft: TrackdayPrepDraft): string {
  const lines = [
    `Track: ${draft.trackName || '—'}`,
    `Date: ${draft.dateIso || '—'}`,
    draft.forecastSummary
      ? `Forecast: ${draft.forecastSummary}`
      : 'Forecast: not available',
    `Rider level: ${draft.riderLevel ? labelFor(RIDER_LEVEL_OPTIONS, draft.riderLevel) : '—'}`,
    `Bike: ${draft.bike || '—'}`,
    `Tyres: ${draft.tyreType ? labelFor(TYRE_TYPE_OPTIONS, draft.tyreType) : '—'} · ${
      draft.tyreCondition ? labelFor(TYRE_CONDITION_OPTIONS, draft.tyreCondition) : '—'
    }`,
  ];
  if (draft.notes.trim()) lines.push(`Notes: ${draft.notes.trim()}`);
  return lines.join('\n');
}

export function formatTrackdayPrepForAi(draft: TrackdayPrepDraft): string {
  const level = draft.riderLevel
    ? labelFor(RIDER_LEVEL_OPTIONS, draft.riderLevel)
    : 'unspecified';
  const tyreType = draft.tyreType ? labelFor(TYRE_TYPE_OPTIONS, draft.tyreType) : 'unspecified';
  const tyreCond = draft.tyreCondition
    ? labelFor(TYRE_CONDITION_OPTIONS, draft.tyreCondition)
    : 'unspecified';

  const otherBits =
    draft.trackId === 'other' && draft.otherContext
      ? [
          draft.otherContext.country ? `Country: ${draft.otherContext.country}` : null,
          draft.otherContext.layout ? `Layout: ${draft.otherContext.layout}` : null,
          draft.otherContext.length ? `Length: ${draft.otherContext.length}` : null,
          draft.otherContext.direction ? `Direction: ${draft.otherContext.direction}` : null,
          draft.otherContext.surfaceNotes
            ? `Surface: ${draft.otherContext.surfaceNotes}`
            : null,
        ]
          .filter(Boolean)
          .join('\n')
      : '';

  return [
    'Create a Trackday Prep briefing for this rider. Be practical, calm, and specific.',
    trackPrepBriefingInstruction(draft.riderLevel),
    'Infer power type / character from the bike string.',
    'Cover mindset, session structure, tyre warm-up / grip expectations for type + condition, and weather implications.',
    draft.riderLevel === 'racer' || draft.riderLevel === 'experienced'
      ? 'Include what to log on the Bike Setup Sheet after each session.'
      : 'Keep the briefing short (about one screen). Do not dump a race-engineer checklist.',
    '',
    'Rider inputs',
    formatTrackdayPrepSummary(draft),
    otherBits ? `\nOther track context\n${otherBits}` : '',
    '',
    'Required structure',
    '1. Mindset & focus for the day (level-appropriate)',
    '2. Track / layout reminders (if known)',
    '3. Weather & tyre approach',
    '4. Bike / power framing for this machine',
    '5. Session plan (warmup → build → cool-down priorities)',
    '6. Closing section titled exactly: "How to get the best from RoadRacer tools today"',
    '   In that closing section you MUST cover:',
    '   - Rider Coach — what to ask, what notes/photos to bring',
    '   - Bike Setup / Bike Setup Sheet — when to switch and what to log',
    `   - Track Walk Notes — recommend logging corner notes for ${draft.trackName || 'this circuit'} before the day`,
    '',
    `Rider level for framing: ${level}. Tyres: ${tyreType}, ${tyreCond}.`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function trackdayPrepIsComplete(draft: TrackdayPrepDraft): boolean {
  return Boolean(
    draft.trackId &&
      draft.trackName.trim() &&
      draft.dateIso.trim() &&
      draft.riderLevel &&
      draft.bike.trim() &&
      draft.tyreType &&
      draft.tyreCondition
  );
}
