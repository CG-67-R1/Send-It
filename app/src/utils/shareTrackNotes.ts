import { Share, Platform } from 'react-native';

export type ShareTrackNotesOptions = {
  /** Track name (e.g. "Phillip Island") */
  trackName: string;
  /** AI summarised notes to share */
  summary: string;
  /** Optional date label (e.g. "Track walk – 23 Feb 2025") */
  dateLabel?: string;
};

/**
 * Share AI summarised track notes via the system share sheet
 * (Messages, WhatsApp, Email, etc.). Use after coach returns
 * summarised track walk notes or when sharing a log entry.
 */
export async function shareTrackNotes(options: ShareTrackNotesOptions): Promise<void> {
  const { trackName, summary, dateLabel } = options;
  const title = dateLabel ? `${trackName} – ${dateLabel}` : trackName;
  const message = `${title}\n\n${summary}\n\n— Shared from Send It`;
  await Share.share({
    message,
    title: Platform.OS === 'ios' ? title : undefined,
  });
}
