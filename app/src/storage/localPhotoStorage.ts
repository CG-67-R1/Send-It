import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export type PhotoCompressOptions = {
  /** Max width or height in px before storing on web. */
  maxDimension?: number;
  compress?: number;
};

function isDataUri(uri: string): boolean {
  return uri.startsWith('data:');
}

async function uriToDataUri(sourceUri: string, options?: PhotoCompressOptions): Promise<string> {
  let workingUri = sourceUri;

  if (options?.maxDimension) {
    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: options.maxDimension } }],
      {
        compress: options.compress ?? 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    workingUri = manipulated.uri;
  }

  if (isDataUri(workingUri)) {
    return workingUri;
  }

  const response = await fetch(workingUri);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image data'));
    reader.readAsDataURL(blob);
  });
}

export async function persistLocalPhoto(
  sourceUri: string,
  filename: string,
  storageKey: string,
  webOptions?: PhotoCompressOptions
): Promise<string> {
  if (Platform.OS === 'web') {
    const dataUri = await uriToDataUri(sourceUri, webOptions);
    await AsyncStorage.setItem(storageKey, dataUri);
    return dataUri;
  }

  const dir = FileSystem.documentDirectory;
  if (!dir) throw new Error('No document directory');
  const destUri = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  await AsyncStorage.setItem(storageKey, destUri);
  return destUri;
}

export async function getPersistedLocalPhoto(
  storageKey: string,
  revKey?: string
): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (!stored) return null;

    if (Platform.OS === 'web' || isDataUri(stored)) {
      if (!revKey) return stored;
      const rev = await AsyncStorage.getItem(revKey);
      return rev ? `${stored}#rev=${rev}` : stored;
    }

    const pathOnly = stored.split('?')[0];
    const exists = await FileSystem.getInfoAsync(pathOnly);
    if (!exists.exists) return null;

    if (!revKey) return pathOnly;

    let rev = await AsyncStorage.getItem(revKey);
    if (!rev) {
      rev = Date.now().toString();
      await AsyncStorage.setItem(revKey, rev);
    }
    return `${pathOnly}?rev=${rev}`;
  } catch {
    return null;
  }
}

export async function clearPersistedLocalPhoto(
  storageKey: string,
  revKey?: string
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored && !isDataUri(stored)) {
      const pathOnly = stored.split('?')[0];
      await FileSystem.deleteAsync(pathOnly, { idempotent: true });
    }
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(storageKey);
  if (revKey) await AsyncStorage.removeItem(revKey);
}

/** Strip cache-bust suffix for Image/SvgImage source URIs. */
export function photoDisplayUri(uri: string): string {
  if (isDataUri(uri)) {
    const hashIdx = uri.indexOf('#rev=');
    return hashIdx >= 0 ? uri.slice(0, hashIdx) : uri;
  }
  return uri.split('?')[0];
}
