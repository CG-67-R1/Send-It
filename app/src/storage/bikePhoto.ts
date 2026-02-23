import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const KEY_BIKE_PHOTO_URI = '@roadrace_bike_photo_uri';
const BIKE_PHOTO_FILENAME = 'bike_photo.jpg';

export async function getBikePhotoUri(): Promise<string | null> {
  try {
    const uri = await AsyncStorage.getItem(KEY_BIKE_PHOTO_URI);
    if (!uri) return null;
    const exists = await FileSystem.getInfoAsync(uri, { size: false });
    return exists.exists ? uri : null;
  } catch {
    return null;
  }
}

export async function setBikePhotoUri(sourceUri: string): Promise<string> {
  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('No document directory');
  const destUri = `${dir}${BIKE_PHOTO_FILENAME}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  await AsyncStorage.setItem(KEY_BIKE_PHOTO_URI, destUri);
  return destUri;
}

export async function clearBikePhoto(): Promise<void> {
  try {
    const uri = await AsyncStorage.getItem(KEY_BIKE_PHOTO_URI);
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(KEY_BIKE_PHOTO_URI);
}
