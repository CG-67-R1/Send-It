import type { TrackDetailsCorner } from '../data/trackDetailsCorners/types';
import type { TrackWalkSession } from '../storage/trackWalk';

type TrackWalkCornerEntry = TrackWalkSession['entries'][number] & { type: 'corner' };

export type TrackDetailsNoteMatch = {
  savedNote: string | null;
  unpinnedNotes: string[];
};

// These layouts changed geometry or turn count before notes stored layout revisions.
const REVISION_REQUIRED_TRACKS = new Set([
  'broadford',
  'hidden_valley',
  'mallala',
  'smp_druitt',
  'wanneroo',
]);

function entryText(entry: TrackWalkCornerEntry): string | null {
  const text = entry.text.trim();
  return text ? text : null;
}

function isCurrentEntry(
  entry: TrackWalkCornerEntry,
  trackId: string,
  currentLayoutRevision?: string
): boolean {
  if (entry.trackDetailsLayoutRevision && currentLayoutRevision) {
    return entry.trackDetailsLayoutRevision === currentLayoutRevision;
  }
  if (entry.trackDetailsLayoutRevision && !currentLayoutRevision) return false;
  return !REVISION_REQUIRED_TRACKS.has(trackId);
}

function noteLabel(entry: TrackWalkCornerEntry): string {
  if (entry.cornerNumber != null) return `T${entry.cornerNumber}`;
  if (entry.cornerLabel) return entry.cornerLabel;
  return 'Corner note';
}

export function findLatestTrackDetailsNote(
  sessions: TrackWalkSession[],
  trackId: string,
  corner: TrackDetailsCorner,
  currentCornerIds: Set<string>,
  currentLayoutRevision?: string
): TrackDetailsNoteMatch {
  const forTrack = sessions
    .filter((s) => s.trackId === trackId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const unpinned: string[] = [];
  let savedNote: string | null = null;

  for (const session of forTrack) {
    for (const rawEntry of session.entries) {
      if (rawEntry.type !== 'corner') continue;
      const entry = rawEntry as TrackWalkCornerEntry;
      const text = entryText(entry);
      if (!text) continue;

      const current = isCurrentEntry(entry, trackId, currentLayoutRevision);
      if (current && entry.cornerId === corner.id && savedNote == null) {
        savedNote = text;
        continue;
      }

      const removedCorner = entry.cornerId ? !currentCornerIds.has(entry.cornerId) : false;
      if (!current || removedCorner) {
        unpinned.push(`${noteLabel(entry)}: ${text}`);
      }
    }
  }

  return { savedNote, unpinnedNotes: unpinned };
}
