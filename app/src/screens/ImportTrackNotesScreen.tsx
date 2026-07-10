import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { AppLogo } from '../components/AppLogo';
import { OtherTrackContextForm } from '../components/OtherTrackContextForm';
import { TrackPicker } from '../components/TrackPicker';
import type { OtherTrackContext, TrackDefinition } from '../data/tracks';
import { getTrackById } from '../data/tracks';
import { sessionReadyForCoach } from '../storage/trackWalk';
import { formatTrackNotesForCoach, sendCoachChat } from '../utils/coachChat';
import { photoUrisToCoachPayloads } from '../utils/coachAttachments';

type ImportRouteParams = {
  ImportTrackNotes: {
    initialNotes?: string;
    initialTrackId?: string;
    initialTrackName?: string;
  };
};

const DEFAULT_OTHER: OtherTrackContext = { customName: '', direction: 'unknown' };

export function ImportTrackNotesScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ImportRouteParams, 'ImportTrackNotes'>>();
  const [notes, setNotes] = useState('');
  const [trackId, setTrackId] = useState<string | null>(null);
  const [otherContext, setOtherContext] = useState<OtherTrackContext>(DEFAULT_OTHER);
  const [photos, setPhotos] = useState<string[]>([]);
  const [pasting, setPasting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (route.params?.initialNotes) setNotes(route.params.initialNotes);
    if (route.params?.initialTrackId) setTrackId(route.params.initialTrackId);
    if (route.params?.initialTrackName) {
      setOtherContext((prev) => ({ ...prev, customName: route.params!.initialTrackName! }));
    }
  }, [route.params?.initialNotes, route.params?.initialTrackId, route.params?.initialTrackName]);

  const handleSelectTrack = useCallback((track: TrackDefinition) => {
    setTrackId(track.id);
    if (track.id !== 'other') {
      setOtherContext(DEFAULT_OTHER);
    }
  }, []);

  const handlePaste = useCallback(async () => {
    setPasting(true);
    try {
      const text = await Clipboard.getStringAsync();
      if (text?.trim()) {
        setNotes((prev) => (prev ? `${prev}\n\n${text.trim()}` : text.trim()));
      } else {
        Alert.alert('Clipboard empty', 'Copy track notes from a message first, then tap Paste.');
      }
    } catch {
      Alert.alert('Clipboard', 'Could not read clipboard. Paste the notes into the box below instead.');
    } finally {
      setPasting(false);
    }
  }, []);

  const handleAddPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photos', 'Allow photo access to attach reference images.', [
          { text: 'OK' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
      }
    } catch {
      Alert.alert('Photos', 'Could not open photos. Try again or attach photos later.');
    }
  }, []);

  const removePhoto = useCallback((uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }, []);

  const handleSendToCoach = useCallback(async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      Alert.alert('No notes', 'Paste or type track notes first.');
      return;
    }

    if (!trackId) {
      Alert.alert('Track', 'Select a track from the list before sending to coach.');
      return;
    }

    const isOther = trackId === 'other';
    const catalogTrack = !isOther ? getTrackById(trackId) : undefined;
    const session = {
      id: '',
      createdAt: 0,
      dateIso: new Date().toISOString().slice(0, 10),
      trackId,
      trackName: isOther
        ? otherContext.customName.trim() || 'Imported track'
        : catalogTrack?.name ?? 'Imported track',
      trackDirection: isOther ? otherContext.direction : catalogTrack?.direction,
      otherTrackContext: isOther ? otherContext : undefined,
      entries: [{ type: 'note' as const, text: trimmed }],
      photoUris: photos.length ? photos : undefined,
    };

    if (!sessionReadyForCoach(session)) {
      Alert.alert(
        'Track details',
        isOther
          ? 'Select Other track and enter track name plus direction before sending.'
          : 'Select a track from the list before sending.'
      );
      return;
    }

    const coachMessage = formatTrackNotesForCoach(session);

    setSending(true);
    try {
      const attachments = photos.length ? await photoUrisToCoachPayloads(photos) : [];
      const result = await sendCoachChat(coachMessage, 'coach', [], attachments);
      if (!result.ok) {
        Alert.alert('Coach unavailable', result.error);
        return;
      }

      setNotes('');
      setTrackId(null);
      setOtherContext(DEFAULT_OTHER);
      setPhotos([]);

      const seedParams = {
        seedMessages: [
          { role: 'user' as const, content: coachMessage },
          { role: 'assistant' as const, content: result.reply },
        ],
      };
      const stackRoutes = navigation.getState()?.routeNames ?? [];
      let navigated = false;
      if (stackRoutes.includes('RiderCoach')) {
        (navigation as { navigate: (name: string, params?: object) => void }).navigate(
          'RiderCoach',
          seedParams
        );
        navigated = true;
      } else {
        const tabNav = navigation.getParent() as
          | { navigate: (name: string, params?: object) => void }
          | undefined;
        if (tabNav) {
          tabNav.navigate('RiderCoachTab', {
            screen: 'RiderCoach',
            params: seedParams,
          });
          navigated = true;
        }
      }
      if (!navigated) {
        Alert.alert(
          'Sent to coach',
          'Your notes were sent. Open the Rider Coach tab to continue the conversation.'
        );
      }
    } finally {
      setSending(false);
    }
  }, [notes, trackId, otherContext, photos, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <AppLogo size={32} />
        </View>
        <Text style={styles.heroTitle}>Import track notes</Text>
        <Text style={styles.heroSubtitle}>
          Paste notes from another rider. Select the track so your coach gets proper corner context.
        </Text>

        <TouchableOpacity
          style={[styles.pasteButton, pasting && styles.buttonDisabled]}
          onPress={handlePaste}
          disabled={pasting}
        >
          {pasting ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Text style={styles.pasteButtonText}>Paste from clipboard</Text>
          )}
        </TouchableOpacity>

        <TrackPicker selectedTrackId={trackId} onSelect={handleSelectTrack} />

        {trackId === 'other' && (
          <OtherTrackContextForm value={otherContext} onChange={setOtherContext} />
        )}

        <View style={styles.photosSection}>
          <Text style={styles.label}>Photos (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(uri)}>
                  <Text style={styles.photoRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
              <Text style={styles.addPhotoText}>Add photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Paste or type track notes here…"
          placeholderTextColor="#64748b"
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.sendButton, (!notes.trim() || sending) && styles.buttonDisabled]}
          onPress={handleSendToCoach}
          disabled={!notes.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Text style={styles.sendButtonText}>Send to coach</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  logoRow: { marginTop: 8, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginTop: 8, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#94a3b8', lineHeight: 20, marginBottom: 20 },
  pasteButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 20,
  },
  pasteButtonText: { fontSize: 16, fontWeight: '600', color: '#f59e0b' },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    minHeight: 160,
    marginBottom: 20,
  },
  photosSection: { marginBottom: 20 },
  photosRow: { alignItems: 'center' },
  photoWrap: { position: 'relative', marginRight: 12 },
  photoThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#020617' },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  addPhotoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#020617',
  },
  addPhotoText: { fontSize: 14, fontWeight: '600', color: '#f59e0b' },
  sendButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    alignItems: 'center',
  },
  sendButtonText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  buttonDisabled: { opacity: 0.6 },
});
