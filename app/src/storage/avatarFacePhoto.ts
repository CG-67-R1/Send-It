import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const KEY_AVATAR_FACE_URI = '@roadrace_avatar_face_photo_uri';
/** Bumps on each save so display URIs change and Image/SvgImage reload (same path is otherwise cached). */
const KEY_AVATAR_FACE_REV = '@roadrace_avatar_face_photo_rev';
const FACE_FILENAME = 'avatar_face.jpg';

export async function getAvatarFacePhotoUri(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY_AVATAR_FACE_URI);
    if (!stored) return null;
    const pathOnly = stored.split('?')[0];
    const exists = await FileSystem.getInfoAsync(pathOnly);
    if (!exists.exists) return null;

    let rev = await AsyncStorage.getItem(KEY_AVATAR_FACE_REV);
    if (!rev) {
      rev = Date.now().toString();
      await AsyncStorage.setItem(KEY_AVATAR_FACE_REV, rev);
    }
    return `${pathOnly}?rev=${rev}`;
  } catch {
    return null;
  }
}

export async function setAvatarFacePhotoUri(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('No document directory');
  const destUri = `${dir}${FACE_FILENAME}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  const rev = Date.now().toString();
  await AsyncStorage.setItem(KEY_AVATAR_FACE_REV, rev);
  await AsyncStorage.setItem(KEY_AVATAR_FACE_URI, destUri);
  return `${destUri}?rev=${rev}`;
}

export async function clearAvatarFacePhoto(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(KEY_AVATAR_FACE_URI);
    const pathOnly = uri?.split('?')[0];
    if (pathOnly) await FileSystem.deleteAsync(pathOnly, { idempotent: true });
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(KEY_AVATAR_FACE_URI);
  await AsyncStorage.removeItem(KEY_AVATAR_FACE_REV);
}
