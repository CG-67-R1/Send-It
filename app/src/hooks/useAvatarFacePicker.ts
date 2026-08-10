import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type Options = {
  /** Called with the Align-baked URI. Throw to keep the Align modal open. */
  onAligned: (uri: string) => void | Promise<void>;
  /** When true, ignore library picks while a pick is already in flight. */
  guardBusy?: boolean;
};

/**
 * Shared library → camera → Align pipeline for face-in-hole avatars.
 * Used by Onboarding and Headlines Settings (FACE_PHOTO.md invariants).
 */
export function useAvatarFacePicker({ onAligned, guardBusy = false }: Options) {
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [alignImageUri, setAlignImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickFromLibrary = useCallback(async () => {
    if (guardBusy && busy) return;
    if (guardBusy) setBusy(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photos', 'Allow access to choose a photo for your rider avatar.', [
          { text: 'OK' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setAlignImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not pick image');
    } finally {
      if (guardBusy) setBusy(false);
    }
  }, [busy, guardBusy]);

  const openCamera = useCallback(() => {
    setFaceCameraOpen(true);
  }, []);

  /** Camera returns a full frame; Align bakes the hole crop (same as library). */
  const onCaptured = useCallback((uri: string) => {
    setAlignImageUri(uri);
  }, []);

  const confirmAligned = useCallback(
    async (uri: string) => {
      await onAligned(uri);
      setAlignImageUri(null);
    },
    [onAligned]
  );

  return {
    faceCameraOpen,
    setFaceCameraOpen,
    alignImageUri,
    setAlignImageUri,
    busy,
    pickFromLibrary,
    openCamera,
    onCaptured,
    confirmAligned,
  };
}
