import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const KEY_AVATAR_FACE_URI = '@roadrace_avatar_face_photo_uri';
const FACE_FILENAME = 'avatar_face.jpg';

export async function getAvatarFacePhotoUri(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(KEY_AVATAR_FACE_URI);
    if (!uri) return null;
    const exists = await FileSystem.getInfoAsync(uri);
    return exists.exists ? uri : null;
  } catch {
    return null;
  }
}

export async function setAvatarFacePhotoUri(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('No document directory');
  const destUri = `${dir}${FACE_FILENAME}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  await AsyncStorage.setItem(KEY_AVATAR_FACE_URI, destUri);
  return destUri;
}

export async function clearAvatarFacePhoto(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(KEY_AVATAR_FACE_URI);
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(KEY_AVATAR_FACE_URI);
}
