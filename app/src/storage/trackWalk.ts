import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SESSIONS = '@roadrace_track_walk_sessions';

export type TrackWalkEntryType = 'note' | 'turn';

export interface TrackWalkEntry {
  type: TrackWalkEntryType;
  text: string;
}

export interface TrackWalkSession {
  id: string;
  dateIso: string;
  trackName: string;
  entries: TrackWalkEntry[];
  createdAt: number;
}

export async function getTrackWalkSessions(): Promise<TrackWalkSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function saveTrackWalkSession(session: Omit<TrackWalkSession, 'id' | 'createdAt'>): Promise<TrackWalkSession> {
  const full: TrackWalkSession = {
    ...session,
    id: `tw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  const list = await getTrackWalkSessions();
  list.unshift(full);
  await AsyncStorage.setItem(KEY_SESSIONS, JSON.stringify(list));
  return full;
}

export function formatSessionForExport(session: TrackWalkSession): string {
  const date = new Date(session.dateIso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const lines = [`Track: ${session.trackName}`, `Date: ${date}`, ''];
  for (const e of session.entries) {
    const label = e.type === 'turn' ? 'Turn' : 'Note';
    lines.push(`${label}: ${e.text.trim()}`);
  }
  return lines.join('\n');
}
