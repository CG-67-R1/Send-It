import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { formatSessionForExport, type TrackWalkSession } from '../storage/trackWalk';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'track-walk';
}

/**
 * Write track walk notes to app documents and open the system share sheet
 * so the rider can save to Files, Drive, email, etc.
 */
export async function exportTrackWalkSession(session: TrackWalkSession): Promise<void> {
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('File storage is not available on this device.');

  const text = formatSessionForExport(session);
  const filename = `track-walk-${session.dateIso}-${sanitizeFilename(session.trackName)}.txt`;
  const fileUri = `${dir}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });

  const title = `${session.trackName} – ${session.dateIso}`;
  await Share.share({
    message: Platform.OS === 'android' ? `${title}\n\n${text}` : text,
    title,
    url: Platform.OS === 'ios' ? fileUri : undefined,
  });
}
