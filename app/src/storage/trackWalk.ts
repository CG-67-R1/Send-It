import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { CornerDirection, OtherTrackContext } from '../data/tracks';
import { formatCornerHeading, getTrackById, isOtherTrackComplete } from '../data/tracks';
import { logStorageError } from './logStorageError';
import { getPrimaryLocale } from '../packs/loader';

const KEY_SESSIONS = STORAGE_KEYS.TRACK_WALK_SESSIONS;

/** @deprecated use 'corner' */
export type TrackWalkEntryType = 'note' | 'turn' | 'corner';

export interface TrackWalkEntry {
  type: 'corner' | 'note';
  cornerId?: string;
  cornerNumber?: number | null;
  cornerLabel?: string;
  direction?: CornerDirection;
  text: string;
  photoUris?: string[];
}

export interface TrackWalkSession {
  id: string;
  dateIso: string;
  trackId: string;
  trackName: string;
  visibility: 'private' | 'team' | 'community';
  /** Optional metadata for shared notes. */
  bikeClass?: string;
  conditions?: string;
  authorExperience?: string;
  trackDirection?: string;
  otherTrackContext?: OtherTrackContext;
  entries: TrackWalkEntry[];
  /** @deprecated session-level photos — use entry.photoUris */
  photoUris?: string[];
  createdAt: number;
}

function normalizeEntry(raw: Record<string, unknown>): TrackWalkEntry {
  const typeRaw = raw.type as string;
  const type: TrackWalkEntry['type'] =
    typeRaw === 'note' ? 'note' : typeRaw === 'corner' || typeRaw === 'turn' ? 'corner' : 'note';
  return {
    type,
    cornerId: typeof raw.cornerId === 'string' ? raw.cornerId : undefined,
    cornerNumber:
      typeof raw.cornerNumber === 'number' || raw.cornerNumber === null
        ? (raw.cornerNumber as number | null)
        : undefined,
    cornerLabel: typeof raw.cornerLabel === 'string' ? raw.cornerLabel : undefined,
    direction: raw.direction as CornerDirection | undefined,
    text: typeof raw.text === 'string' ? raw.text : '',
    photoUris: Array.isArray(raw.photoUris) ? (raw.photoUris as string[]) : undefined,
  };
}

function normalizeSession(raw: Record<string, unknown>): TrackWalkSession {
  const entries = Array.isArray(raw.entries)
    ? (raw.entries as Record<string, unknown>[]).map(normalizeEntry)
    : [];
  const trackId = typeof raw.trackId === 'string' ? raw.trackId : 'other';
  const trackName =
    typeof raw.trackName === 'string' ? raw.trackName : (raw.trackName as string) || 'Track walk';
  return {
    id: typeof raw.id === 'string' ? raw.id : `tw_legacy_${Date.now()}`,
    dateIso: typeof raw.dateIso === 'string' ? raw.dateIso : new Date().toISOString().slice(0, 10),
    trackId,
    trackName,
    visibility:
      raw.visibility === 'team' || raw.visibility === 'community' ? raw.visibility : 'private',
    bikeClass: typeof raw.bikeClass === 'string' ? raw.bikeClass : undefined,
    conditions: typeof raw.conditions === 'string' ? raw.conditions : undefined,
    authorExperience:
      typeof raw.authorExperience === 'string' ? raw.authorExperience : undefined,
    trackDirection: typeof raw.trackDirection === 'string' ? raw.trackDirection : undefined,
    otherTrackContext: raw.otherTrackContext as OtherTrackContext | undefined,
    entries,
    photoUris: Array.isArray(raw.photoUris) ? (raw.photoUris as string[]) : undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
  };
}

export async function getTrackWalkSessions(): Promise<TrackWalkSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((s) => normalizeSession(s as Record<string, unknown>));
    }
  } catch (e) {
    logStorageError('getTrackWalkSessions', e);
  }
  return [];
}

export async function saveTrackWalkSession(
  session: Omit<TrackWalkSession, 'id' | 'createdAt'>
): Promise<TrackWalkSession> {
  const full: TrackWalkSession = {
    ...session,
    id: `tw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  try {
    const list = await getTrackWalkSessions();
    list.unshift(full);
    await AsyncStorage.setItem(KEY_SESSIONS, JSON.stringify(list));
    return full;
  } catch (e) {
    logStorageError('saveTrackWalkSession', e);
    throw e;
  }
}

function formatEntryLine(entry: TrackWalkEntry, trackId: string): string {
  if (entry.type === 'note') {
    return `General:\n  ${entry.text.trim()}`;
  }
  const corner = entry.cornerId ? getTrackById(trackId)?.corners.find((c) => c.id === entry.cornerId) : undefined;
  const heading = corner
    ? formatCornerHeading(
        { ...corner, direction: entry.direction ?? corner.direction },
        entry.cornerLabel && entry.cornerLabel !== corner.label ? entry.cornerLabel : undefined
      )
    : entry.cornerNumber != null
      ? `T${entry.cornerNumber}${entry.cornerLabel ? ` — ${entry.cornerLabel}` : ''}${entry.direction ? ` (${entry.direction})` : ''}`
      : 'Corner (unassigned)';
  const lines = [`${heading}:`, `  ${entry.text.trim()}`];
  if (entry.photoUris?.length) {
    const approach = corner?.approachFrom ?? 'approach not specified';
    lines.push(
      `  Photo: ${entry.photoUris.length} attached — ${approach}`
    );
  }
  return lines.join('\n');
}

export function formatSessionForExport(session: TrackWalkSession): string {
  const date = new Date(session.dateIso).toLocaleDateString(getPrimaryLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const track = getTrackById(session.trackId);
  const isOther = session.trackId === 'other';
  const lines: string[] = [];

  if (isOther) {
    lines.push(`Track: ${session.otherTrackContext?.customName ?? session.trackName} (OTHER — not in catalog)`);
    lines.push('Track ID: other');
    const ctx = session.otherTrackContext;
    if (ctx?.direction) lines.push(`Direction: ${ctx.direction}`);
    if (ctx?.country) lines.push(`Region: ${ctx.country}`);
    if (ctx?.layout) lines.push(`Layout: ${ctx.layout}`);
    if (ctx?.length) lines.push(`Length: ${ctx.length}`);
    if (ctx?.surfaceNotes) lines.push(`Surface: ${ctx.surfaceNotes}`);
    if (ctx?.additionalNotes) lines.push(`Notes: ${ctx.additionalNotes}`);
  } else {
    const meta = [
      session.trackName,
      track?.direction && track.direction !== 'unknown' ? track.direction : null,
      track?.lengthKm,
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(`Track: ${meta}`);
    lines.push(`Track ID: ${session.trackId}`);
  }

  lines.push(`Date: ${date}`);
  lines.push(`Visibility: ${session.visibility}`);
  if (session.bikeClass) lines.push(`Bike class: ${session.bikeClass}`);
  if (session.conditions) lines.push(`Conditions: ${session.conditions}`);
  if (session.authorExperience) lines.push(`Rider experience: ${session.authorExperience}`);
  lines.push('');

  for (const e of session.entries) {
    lines.push(formatEntryLine(e, session.trackId));
    lines.push('');
  }

  // Legacy session-level photos
  if (session.photoUris?.length) {
    lines.push(`Photos (session): ${session.photoUris.length} attached in app`);
  }

  return lines.join('\n').trim();
}

export function sessionReadyForCoach(session: Pick<TrackWalkSession, 'trackId' | 'otherTrackContext'>): boolean {
  if (session.trackId === 'other') {
    return isOtherTrackComplete(session.otherTrackContext);
  }
  return Boolean(session.trackId && getTrackById(session.trackId));
}

export async function deleteTrackWalkSession(id: string): Promise<void> {
  try {
    const list = await getTrackWalkSessions();
    const next = list.filter((s) => s.id !== id);
    await AsyncStorage.setItem(KEY_SESSIONS, JSON.stringify(next));
  } catch (e) {
    logStorageError('deleteTrackWalkSession', e);
    throw e;
  }
}

/** Clears all Track Walk sessions and notes stored on this device. */
export async function clearTrackWalkSessions(): Promise<void> {
  await AsyncStorage.removeItem(KEY_SESSIONS);
}
