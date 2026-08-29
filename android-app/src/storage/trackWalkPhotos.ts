import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copy picker/camera URIs into the app document directory so they survive
 * after the original temp URI is gone.
 */
export async function persistTrackWalkPhotos(sourceUris: string[]): Promise<string[]> {
  const dir = FileSystem.documentDirectory;
  if (!dir || sourceUris.length === 0) return [];

  const persisted: string[] = [];
  for (let i = 0; i < sourceUris.length; i++) {
    const ext = sourceUris[i].split('.').pop()?.split('?')[0] || 'jpg';
    const dest = `${dir}track_walk_${Date.now()}_${i}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUris[i], to: dest });
    persisted.push(dest);
  }
  return persisted;
}
