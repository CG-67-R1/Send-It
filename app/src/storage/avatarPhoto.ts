import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const KEY_AVATAR_PHOTO_URI = '@roadrace_avatar_photo_uri';
const AVATAR_PHOTO_FILENAME = 'avatar_photo.jpg';

export async function getAvatarPhotoUri(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(KEY_AVATAR_PHOTO_URI);
    if (!uri) return null;
    // Only validate file existence for file:// paths (copied to app dir).
    // content:// and other URIs from camera/picker may not pass getInfoAsync; still return them so the UI can show the photo.
    if (uri.startsWith('file://')) {
      const exists = await FileSystem.getInfoAsync(uri, { size: false });
      return exists.exists ? uri : null;
    }
    return uri;
  } catch {
    return null;
  }
}

export async function setAvatarPhotoUri(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) {
    await AsyncStorage.setItem(KEY_AVATAR_PHOTO_URI, sourceUri);
    return sourceUri;
  }
  const destUri = `${dir}${AVATAR_PHOTO_FILENAME}`;
  try {
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    await AsyncStorage.setItem(KEY_AVATAR_PHOTO_URI, destUri);
    return destUri;
  } catch {
    // copyAsync often fails for content:// URIs; try read + write so we have a stable file:// path
    try {
      const base64 = await FileSystem.readAsStringAsync(sourceUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await AsyncStorage.setItem(KEY_AVATAR_PHOTO_URI, destUri);
      return destUri;
    } catch {
      await AsyncStorage.setItem(KEY_AVATAR_PHOTO_URI, sourceUri);
      return sourceUri;
    }
  }
}

export async function clearAvatarPhoto(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(KEY_AVATAR_PHOTO_URI);
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(KEY_AVATAR_PHOTO_URI);
}
