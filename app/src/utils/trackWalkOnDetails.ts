import type { TrackWalkEntry, TrackWalkSession } from '../storage/trackWalk';

export type WalkNoteMatch = {
  text: string;
  cornerId?: string;
  cornerNumber?: number | null;
};

export type WalkNotesForTrack = {
  session: TrackWalkSession | null;
  byCornerId: Record<string, string>;
  byNumber: Record<number, string>;
  general: WalkNoteMatch[];
  unmatchedCorners: WalkNoteMatch[];
};

function newestSession(
  sessions: TrackWalkSession[],
  trackId: string
): TrackWalkSession | null {
  const forTrack = sessions
    .filter((s) => s.trackId === trackId)
    .sort((a, b) => b.createdAt - a.createdAt);
  return forTrack[0] ?? null;
}

function entryText(entry: TrackWalkEntry): string {
  return entry.text.trim();
}

/** Latest walk for this circuit, split into matched turns and leftover lines. */
export function walkNotesForTrack(
  sessions: TrackWalkSession[],
  trackId: string,
  turns: { id: string; number: number }[]
): WalkNotesForTrack {
  const session = newestSession(sessions, trackId);
  if (!session) {
    return { session: null, byCornerId: {}, byNumber: {}, general: [], unmatchedCorners: [] };
  }

  const ids = new Set(turns.map((t) => t.id));
  const numbers = new Set(turns.map((t) => t.number));
  const byCornerId: Record<string, string> = {};
  const byNumber: Record<number, string> = {};
  const general: WalkNoteMatch[] = [];
  const unmatchedCorners: WalkNoteMatch[] = [];

  for (const entry of session.entries) {
    const text = entryText(entry);
    if (!text) continue;
    if (entry.type === 'note') {
      general.push({ text });
      continue;
    }
    const match: WalkNoteMatch = {
      text,
      cornerId: entry.cornerId,
      cornerNumber: entry.cornerNumber,
    };
    let placed = false;
    if (entry.cornerId && ids.has(entry.cornerId) && !byCornerId[entry.cornerId]) {
      byCornerId[entry.cornerId] = text;
      placed = true;
    }
    if (
      typeof entry.cornerNumber === 'number' &&
      numbers.has(entry.cornerNumber) &&
      !byNumber[entry.cornerNumber]
    ) {
      byNumber[entry.cornerNumber] = text;
      placed = true;
    }
    if (!placed) unmatchedCorners.push(match);
  }

  return { session, byCornerId, byNumber, general, unmatchedCorners };
}

export function walkNoteForTurn(
  notes: WalkNotesForTrack,
  turn: { id: string; number: number }
): string | null {
  return notes.byCornerId[turn.id] ?? notes.byNumber[turn.number] ?? null;
}

export function walkCardLines(notes: WalkNotesForTrack): { heading: string; text: string }[] {
  const lines: { heading: string; text: string }[] = [];
  for (const g of notes.general) {
    lines.push({ heading: 'General', text: g.text });
  }
  for (const c of notes.unmatchedCorners) {
    const label =
      c.cornerNumber != null ? `T${c.cornerNumber}` : c.cornerId ? c.cornerId : 'Corner';
    lines.push({ heading: label, text: c.text });
  }
  return lines;
}
