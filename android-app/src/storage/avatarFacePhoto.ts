import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  clearPersistedLocalPhoto,
  getPersistedLocalPhoto,
  persistLocalPhoto,
} from './localPhotoStorage';

const KEY_AVATAR_FACE_URI = STORAGE_KEYS.AVATAR_FACE_URI;
/** Bumps on each save so display URIs change and Image/SvgImage reload (same path is otherwise cached). */
const KEY_AVATAR_FACE_REV = STORAGE_KEYS.AVATAR_FACE_REV;
const FACE_FILENAME = 'avatar_face.jpg';

const FACE_WEB_MAX_DIMENSION = 512;

export async function getAvatarFacePhotoUri(): Promise<string | null> {
  return getPersistedLocalPhoto(KEY_AVATAR_FACE_URI, KEY_AVATAR_FACE_REV);
}

export async function setAvatarFacePhotoUri(sourceUri: string): Promise<string> {
  const stored = await persistLocalPhoto(sourceUri, FACE_FILENAME, KEY_AVATAR_FACE_URI, {
    maxDimension: FACE_WEB_MAX_DIMENSION,
    compress: 0.85,
  });
  const rev = Date.now().toString();
  await AsyncStorage.setItem(KEY_AVATAR_FACE_REV, rev);

  if (stored.startsWith('data:')) {
    return `${stored}#rev=${rev}`;
  }
  return `${stored}?rev=${rev}`;
}

export async function clearAvatarFacePhoto(): Promise<void> {
  await clearPersistedLocalPhoto(KEY_AVATAR_FACE_URI, KEY_AVATAR_FACE_REV);
}
