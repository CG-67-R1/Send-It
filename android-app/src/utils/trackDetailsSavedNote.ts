export type TrackDetailsNoteSession = {
  trackId: string;
  createdAt: number;
  entries: { type: string; cornerId?: string; text: string }[];
};

export type TrackDetailsSavedNoteSelection = {
  requestId: number;
  trackId: string | null;
  cornerId: string | null;
};

export function latestTrackDetailsCornerNote(
  sessions: TrackDetailsNoteSession[],
  trackId: string,
  cornerId: string
): string | null {
  const forTrack = sessions
    .filter((s) => s.trackId === trackId)
    .sort((a, b) => b.createdAt - a.createdAt);
  for (const session of forTrack) {
    const entry = session.entries.find(
      (e) => e.type === 'corner' && e.cornerId === cornerId && e.text.trim()
    );
    if (entry) return entry.text.trim();
  }
  return null;
}

export function shouldApplyTrackDetailsSavedNote(
  request: TrackDetailsSavedNoteSelection,
  current: TrackDetailsSavedNoteSelection
): boolean {
  return (
    request.requestId === current.requestId &&
    request.trackId === current.trackId &&
    request.cornerId === current.cornerId &&
    current.cornerId != null
  );
}
