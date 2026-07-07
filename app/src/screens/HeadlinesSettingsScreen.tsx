import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCustomSources,
  getPriorityOrder,
  setPriorityOrder,
  getNotifyPriority1,
  setNotifyPriority1,
  addCustomSource,
  removeCustomSource,
} from '../storage/headlinesSettings';
import { requestNotificationPermissions } from '../notifications/priority1Notifications';
import { SOURCES_URL } from '../../constants/api';
import type { CustomSource, PriorityOrder, Source } from '../types';
import { AppLogo } from '../components/AppLogo';
import { AvatarFaceCameraModal } from '../components/AvatarFaceCameraModal';
import { getAvatarPreset } from '../avatar/presets';
import { getOnboardingAnswers } from '../storage/onboarding';
import { getAvatarFacePhotoUri, setAvatarFacePhotoUri } from '../storage/avatarFacePhoto';
import { useOnboardingReset } from '../context/OnboardingResetContext';

export function HeadlinesSettingsScreen() {
  const onboardingReset = useOnboardingReset();
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [facePreviewUri, setFacePreviewUri] = useState<string | null>(null);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [builtinSources, setBuiltinSources] = useState<Source[]>([]);
  const [customSources, setCustomSourcesState] = useState<CustomSource[]>([]);
  const [priority, setPriorityState] = useState<PriorityOrder>([]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [notifyPriority1, setNotifyPriority1State] = useState(false);

  const allSources: Source[] = [
    ...builtinSources,
    ...customSources.map((s) => ({ id: s.id, name: s.name })),
  ];

  const load = useCallback(async () => {
    const [order, custom, notify] = await Promise.all([
      getPriorityOrder(),
      getCustomSources(),
      getNotifyPriority1(),
    ]);
    setPriorityState(order);
    setCustomSourcesState(custom);
    setNotifyPriority1State(notify);
    try {
      const res = await fetch(SOURCES_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        setBuiltinSources([]);
        return;
      }
      const data = await res.json();
      if (data.sources) setBuiltinSources(data.sources);
    } catch {
      setBuiltinSources([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadRiderFace = useCallback(async () => {
    const [answers, uri] = await Promise.all([getOnboardingAnswers(), getAvatarFacePhotoUri()]);
    setAvatarId(answers?.avatarId ?? null);
    setFacePreviewUri(uri);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRiderFace();
    }, [loadRiderFace])
  );

  const riderPreset = avatarId ? getAvatarPreset(avatarId) : undefined;
  const showRiderPhotoControls = Boolean(riderPreset?.hasFaceHole);

  const pickRiderFaceFromLibrary = useCallback(async () => {
    if (faceBusy) return;
    setFaceBusy(true);
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
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const saved = await setAvatarFacePhotoUri(result.assets[0].uri);
        setFacePreviewUri(saved);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not pick image');
    } finally {
      setFaceBusy(false);
    }
  }, [faceBusy]);

  const takeRiderFaceWithSystemCamera = useCallback(async () => {
    if (faceBusy) return;
    setFaceBusy(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera', 'Allow camera access to take your rider photo.', [
          { text: 'OK' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const saved = await setAvatarFacePhotoUri(result.assets[0].uri);
        setFacePreviewUri(saved);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not take photo');
    } finally {
      setFaceBusy(false);
    }
  }, [faceBusy]);

  const openRiderFaceCamera = useCallback(() => {
    if (Platform.OS === 'web') {
      void takeRiderFaceWithSystemCamera();
    } else {
      setFaceCameraOpen(true);
    }
  }, [takeRiderFaceWithSystemCamera]);

  const onRiderFaceCaptured = useCallback(async (uri: string) => {
    try {
      const saved = await setAvatarFacePhotoUri(uri);
      setFacePreviewUri(saved);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save photo');
    }
  }, []);

  // When built-in sources first load, if priority is empty init from built-in order
  useEffect(() => {
    if (builtinSources.length > 0 && priority.length === 0) {
      const ids = builtinSources.map((s) => s.id);
      setPriorityState(ids);
      setPriorityOrder(ids);
    }
  }, [builtinSources.length]);

  const handleSelectSource = useCallback(
    async (slotIndex: number, sourceId: string) => {
      const current = priority[slotIndex];
      if (current === sourceId) {
        setPickerSlot(null);
        return;
      }
      const next = [...priority];
      const swapIdx = next.indexOf(sourceId);
      if (swapIdx >= 0) next[swapIdx] = current;
      next[slotIndex] = sourceId;
      setPriorityState(next);
      await setPriorityOrder(next);
      setPickerSlot(null);
    },
    [priority]
  );

  const handleAddCustom = useCallback(async () => {
    const url = addUrl.trim();
    const name = addName.trim();
    if (!url || !name) return;
    if (customSources.length >= 4) {
      Alert.alert(
        'Custom feed limit',
        'You can add up to 4 custom news feeds. Remove one before adding another.'
      );
      return;
    }
    setAdding(true);
    try {
      const newSource = await addCustomSource(url, name);
      setCustomSourcesState((prev) => [...prev, newSource]);
      setPriorityState((prev) => {
        const next = [...prev, newSource.id];
        void setPriorityOrder(next);
        return next;
      });
      setAddUrl('');
      setAddName('');
    } finally {
      setAdding(false);
    }
  }, [addUrl, addName, customSources.length]);

  const handleRemoveCustom = useCallback(
    (id: string) => {
      Alert.alert('Remove source', 'Remove this custom source?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCustomSource(id);
            setCustomSourcesState((prev) => prev.filter((s) => s.id !== id));
            setPriorityState((prev) => {
              const next = prev.filter((sid) => sid !== id);
              void setPriorityOrder(next);
              return next;
            });
          },
        },
      ]);
    },
    []
  );

  const handleResetOnboarding = useCallback(() => {
    if (!onboardingReset || !__DEV__) return;
    Alert.alert(
      'Reset onboarding',
      'This clears your profile answers and the avatar face photo, then runs the welcome flow again. Headlines settings are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await onboardingReset.resetOnboarding();
            } catch (e) {
              Alert.alert(
                'Could not reset',
                e instanceof Error ? e.message : 'Something went wrong. Try again.'
              );
            }
          },
        },
      ]
    );
  }, [onboardingReset]);

  const handleNotifyPriority1Toggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications',
          'Permission was denied. Enable notifications in your device settings to get alerts for Priority 1 news.'
        );
        return;
      }
    }
    setNotifyPriority1State(value);
    await setNotifyPriority1(value);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoRow}>
        <AppLogo size={80} />
      </View>

      {showRiderPhotoControls ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rider photo</Text>
          <Text style={styles.sectionSubtitle}>
            Update the photo that appears in your leathers on the home screen. Same crop guide as during
            onboarding on this device.
          </Text>
          <View style={styles.riderFaceRow}>
            {facePreviewUri ? (
              <Image
                key={facePreviewUri}
                source={{ uri: facePreviewUri.split('?')[0] }}
                style={styles.riderFacePreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.riderFacePreviewPlaceholder}>
                <Text style={styles.riderFacePreviewPlaceholderText}>No photo</Text>
              </View>
            )}
            <View style={styles.riderFaceButtons}>
              <TouchableOpacity
                style={[styles.riderFaceBtn, faceBusy && styles.riderFaceBtnDisabled]}
                onPress={openRiderFaceCamera}
                disabled={faceBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.riderFaceBtnText}>
                  {facePreviewUri ? 'Retake photo' : 'Take photo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.riderFaceBtnSecondary, faceBusy && styles.riderFaceBtnDisabled]}
                onPress={pickRiderFaceFromLibrary}
                disabled={faceBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.riderFaceBtnSecondaryText}>From library</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionSubtitle}>
          When new headlines appear from your Priority 1 source (e.g. when you open the app or refresh), show a notification.
        </Text>
        <View style={styles.notifyRow}>
          <Text style={styles.notifyLabel}>Notify for Priority 1 news</Text>
          <Switch
            value={notifyPriority1}
            onValueChange={handleNotifyPriority1Toggle}
            trackColor={{ false: '#334155', true: '#f59e0b' }}
            thumbColor="#f8fafc"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source priority</Text>
        <Text style={styles.sectionSubtitle}>1 = first on the Headlines page. Tap to change.</Text>
        {priority.map((sourceId, index) => {
          const source = allSources.find((s) => s.id === sourceId);
          return (
            <View key={`${sourceId}-${index}`} style={styles.priorityRow}>
              <Text style={styles.priorityNum}>{index + 1}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setPickerSlot(index)}
              >
                <Text style={styles.pickerButtonText} numberOfLines={1}>
                  {source?.name ?? sourceId}
                </Text>
                <Text style={styles.pickerChevron}>▼</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom sources</Text>
        <Text style={styles.sectionSubtitle}>Add an RSS feed URL. It will appear in the priority list above.</Text>
        <TextInput
          style={styles.input}
          placeholder="Feed URL (e.g. https://example.com/feed.xml)"
          placeholderTextColor="#64748b"
          value={addUrl}
          onChangeText={setAddUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor="#64748b"
          value={addName}
          onChangeText={setAddName}
        />
        <TouchableOpacity
          style={[styles.addButton, adding && styles.addButtonDisabled]}
          onPress={handleAddCustom}
          disabled={adding || !addUrl.trim() || !addName.trim()}
        >
          <Text style={styles.addButtonText}>Add source</Text>
        </TouchableOpacity>

        {customSources.length > 0 && (
          <View style={styles.customList}>
            <Text style={styles.customListTitle}>Your custom sources</Text>
            {customSources.map((s) => (
              <View key={s.id} style={styles.customRow}>
                <View style={styles.customRowText}>
                  <Text style={styles.customName}>{s.name}</Text>
                  <Text style={styles.customUrl} numberOfLines={1}>{s.url}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveCustom(s.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {__DEV__ && onboardingReset ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <Text style={styles.sectionSubtitle}>
            Re-run onboarding without reinstalling the app (Expo Go / dev builds).
          </Text>
          <TouchableOpacity style={styles.devResetButton} onPress={handleResetOnboarding} activeOpacity={0.85}>
            <Text style={styles.devResetButtonText}>Reset onboarding</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <AvatarFaceCameraModal
        visible={faceCameraOpen}
        onClose={() => setFaceCameraOpen(false)}
        onCapture={onRiderFaceCaptured}
      />

      <Modal
        visible={pickerSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerSlot(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerSlot(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select source for position {(pickerSlot ?? 0) + 1}</Text>
            <ScrollView style={styles.modalList}>
              {allSources.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.modalOption}
                  onPress={() => pickerSlot !== null && handleSelectSource(pickerSlot, s.id)}
                >
                  <Text style={styles.modalOptionText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerSlot(null)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  logoRow: {
    marginBottom: 8,
    alignItems: 'center',
  },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  riderFaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  riderFacePreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#1e293b',
  },
  riderFacePreviewPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderFacePreviewPlaceholderText: { fontSize: 11, color: '#64748b' },
  riderFaceButtons: { flex: 1, gap: 8 },
  riderFaceBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  riderFaceBtnDisabled: { opacity: 0.55 },
  riderFaceBtnText: { color: '#0f172a', fontWeight: '600', fontSize: 15 },
  riderFaceBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  riderFaceBtnSecondaryText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  notifyLabel: { fontSize: 16, color: '#e2e8f0', flex: 1 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priorityNum: { width: 28, fontSize: 16, fontWeight: '600', color: '#f59e0b' },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  pickerButtonText: { fontSize: 16, color: '#e2e8f0', flex: 1 },
  pickerChevron: { fontSize: 10, color: '#64748b', marginLeft: 8 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 16 },
  devResetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  devResetButtonText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
  customList: { marginTop: 16 },
  customListTitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
  },
  customRowText: { flex: 1 },
  customName: { fontSize: 16, color: '#e2e8f0', fontWeight: '500' },
  customUrl: { fontSize: 12, color: '#64748b', marginTop: 2 },
  removeButton: { paddingVertical: 8, paddingHorizontal: 12 },
  removeButtonText: { color: '#f87171', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '70%',
  },
  modalTitle: { padding: 16, fontSize: 18, fontWeight: '600', color: '#f8fafc' },
  modalList: { maxHeight: 320 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  modalOptionText: { fontSize: 16, color: '#e2e8f0' },
  modalClose: { padding: 16, alignItems: 'center' },
  modalCloseText: { color: '#94a3b8', fontSize: 16 },
});
