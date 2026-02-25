import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const KEY_AVATAR_PHOTO_URI = '@roadrace_avatar_photo_uri';
const AVATAR_PHOTO_FILENAME = 'avatar_photo.jpg';

export async function getAvatarPhotoUri(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(KEY_AVATAR_PHOTO_URI);
    if (!uri) return null;
    const exists = await FileSystem.getInfoAsync(uri, { size: false });
    return exists.exists ? uri : null;
  } catch {
    return null;
  }
}

export async function setAvatarPhotoUri(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('No document directory');
  const destUri = `${dir}${AVATAR_PHOTO_FILENAME}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  await AsyncStorage.setItem(KEY_AVATAR_PHOTO_URI, destUri);
  return destUri;
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
