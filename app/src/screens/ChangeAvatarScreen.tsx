import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getOnboardingAnswers, setOnboardingAnswers } from '../storage/onboarding';
import { getAvatarPhotoUri, setAvatarPhotoUri } from '../storage/avatarPhoto';
import { AVATAR_IDS, AVATAR_SOURCES, NO_FACE_IDS } from '../constants/avatars';

const CUSTOM_AVATAR_ID = 'custom';

export function ChangeAvatarScreen() {
  const navigation = useNavigation();
  const [avatarId, setAvatarId] = useState<string>('devil');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [noFaceFrameId, setNoFaceFrameId] = useState<string | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [choosingFrame, setChoosingFrame] = useState(false);

  const loadCurrent = useCallback(async () => {
    const [answers, avatarUri] = await Promise.all([
      getOnboardingAnswers(),
      getAvatarPhotoUri(),
    ]);
    const id = answers?.avatarId ?? 'devil';
    setAvatarId(id);
    setCustomAvatarUri(id === 'custom' ? avatarUri : null);
    setNoFaceFrameId(answers?.noFaceFrameId ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrent();
    }, [loadCurrent])
  );

  const startFaceUpload = () => setChoosingFrame(true);

  const pickFacePhotoForFrame = async (frameId: string) => {
    if (pickingAvatar) return;
    setPickingAvatar(true);
    setChoosingFrame(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo access',
          'Allow photo access to use your face in the frame.',
          [{ text: 'OK' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = await setAvatarPhotoUri(result.assets[0].uri);
        setCustomAvatarUri(uri);
        setNoFaceFrameId(frameId);
        setAvatarId(CUSTOM_AVATAR_ID);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not pick image';
      Alert.alert('Error', msg);
    } finally {
      setPickingAvatar(false);
    }
  };

  const handleSave = useCallback(async () => {
    const answers = await getOnboardingAnswers();
    if (!answers) return;
    await setOnboardingAnswers({
      ...answers,
      avatarId,
      noFaceFrameId: avatarId === CUSTOM_AVATAR_ID ? noFaceFrameId ?? undefined : undefined,
    });
    navigation.goBack();
  }, [avatarId, noFaceFrameId, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Change avatar</Text>
      <Text style={styles.subtitle}>
        Choose an avatar, or add your face to a frame (pick a frame, then we'll ask for your photo).
      </Text>

      {choosingFrame ? (
        <>
          <Text style={styles.framePrompt}>Pick a frame — next we'll ask for your face photo</Text>
          <View style={styles.avatarGrid}>
            {NO_FACE_IDS.map((id) => (
              <TouchableOpacity
                key={id}
                style={styles.avatarCell}
                onPress={() => pickFacePhotoForFrame(id)}
                activeOpacity={0.8}
                disabled={pickingAvatar}
              >
                <Image source={AVATAR_SOURCES[id]} style={styles.avatarImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
          {pickingAvatar && <ActivityIndicator size="small" color="#f59e0b" style={{ marginTop: 8 }} />}
          <TouchableOpacity style={styles.optionButton} onPress={() => setChoosingFrame(false)} activeOpacity={0.8}>
            <Text style={styles.optionLabel}>Back to avatars</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.avatarGrid}>
            {AVATAR_IDS.map((id) => (
              <TouchableOpacity
                key={id}
                style={[styles.avatarCell, avatarId === id && styles.avatarCellActive]}
                onPress={() => setAvatarId(id)}
                activeOpacity={0.8}
              >
                <Image source={AVATAR_SOURCES[id]} style={styles.avatarImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.optionButton, avatarId === CUSTOM_AVATAR_ID && styles.optionButtonActive]}
            onPress={startFaceUpload}
            disabled={pickingAvatar}
            activeOpacity={0.8}
          >
            {customAvatarUri ? (
              <View style={styles.customAvatarPreview}>
                <Image source={{ uri: customAvatarUri }} style={styles.customAvatarImage} resizeMode="cover" />
                <Text style={[styles.optionLabel, styles.optionLabelActive]}>Your photo (tap to change)</Text>
              </View>
            ) : (
              <Text style={[styles.optionLabel, avatarId === CUSTOM_AVATAR_ID && styles.optionLabelActive]}>
                Add my face (pick a frame, then your photo)
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
    marginBottom: 20,
  },
  framePrompt: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  avatarCell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  avatarCellActive: {
    borderColor: '#f59e0b',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  customAvatarPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  optionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionLabel: {
    fontSize: 17,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  optionLabelActive: {
    color: '#f59e0b',
  },
  saveButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
});
