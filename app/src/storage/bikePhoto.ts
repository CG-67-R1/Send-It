import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPersistedLocalPhoto,
  getPersistedLocalPhoto,
  persistLocalPhoto,
} from './localPhotoStorage';

const KEY_BIKE_PHOTO_URI = '@roadrace_bike_photo_uri';
const KEY_BIKE_PHOTO_REV = '@roadrace_bike_photo_rev';
const BIKE_PHOTO_FILENAME = 'bike_photo.jpg';

const BIKE_WEB_MAX_DIMENSION = 1200;

export async function getBikePhotoUri(): Promise<string | null> {
  return getPersistedLocalPhoto(KEY_BIKE_PHOTO_URI, KEY_BIKE_PHOTO_REV);
}

export async function setBikePhotoUri(sourceUri: string): Promise<string> {
  const stored = await persistLocalPhoto(sourceUri, BIKE_PHOTO_FILENAME, KEY_BIKE_PHOTO_URI, {
    maxDimension: BIKE_WEB_MAX_DIMENSION,
    compress: 0.8,
  });
  const rev = Date.now().toString();
  await AsyncStorage.setItem(KEY_BIKE_PHOTO_REV, rev);

  if (stored.startsWith('data:')) {
    return `${stored}#rev=${rev}`;
  }
  return `${stored}?rev=${rev}`;
}

export async function clearBikePhoto(): Promise<void> {
  await clearPersistedLocalPhoto(KEY_BIKE_PHOTO_URI, KEY_BIKE_PHOTO_REV);
}
