import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { ROADRACE_CHAT_URL } from '../../constants/api';
import { AppLogo } from '../components/AppLogo';

type Props = {
  onSendToCoach?: (payload: { trackName: string; notes: string; photoUris: string[] }) => Promise<void>;
};

export function ImportTrackNotesScreen({ onSendToCoach }: Props) {
  const [notes, setNotes] = useState('');
  const [trackName, setTrackName] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pasting, setPasting] = useState(false);
  const [sending, setSending] = useState(false);

  const handlePaste = useCallback(async () => {
    setPasting(true);
    try {
      const text = await Clipboard.getStringAsync();
      if (text?.trim()) {
        setNotes((prev: string) => (prev ? `${prev}\n\n${text.trim()}` : text.trim()));
      } else {
        Alert.alert('Clipboard empty', 'Copy track notes from a message first, then tap Paste.');
      }
    } catch {
      Alert.alert('Couldn’t read clipboard', 'Paste the notes into the box below instead.');
    } finally {
      setPasting(false);
    }
  }, []);

  const handleAddPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
      }
    } catch {
      Alert.alert('Couldn’t open photos', 'Try again or attach photos later.');
    }
  }, []);

  const sendNotesToCoach = useCallback(
    async (payload: { trackName: string; notes: string; photoUris: string[] }) => {
      const photoNote =
        payload.photoUris.length > 0
          ? `\n\n[User attached ${payload.photoUris.length} photo(s) — summarise the written notes; photos are for context only.]`
          : '';
      const message = `Summarise these track notes for "${payload.trackName}" into clear, actionable coaching points (corners, braking, lines, setup hints):\n\n${payload.notes}${photoNote}`;

      const res = await fetch(ROADRACE_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode: 'coach', history: [] }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Coach request failed');
      }
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (!reply) {
        throw new Error('No response from coach');
      }
      await Clipboard.setStringAsync(reply);
      Alert.alert(
        'Coach summary ready',
        'The coach summary was copied to your clipboard. Paste it into your track log or share it.',
        [{ text: 'OK' }]
      );
    },
    []
  );

  const handleSendToCoach = useCallback(async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      Alert.alert('No notes', 'Paste or type track notes first.');
      return;
    }
    const payload = {
      trackName: trackName.trim() || 'Imported track',
      notes: trimmed,
      photoUris: photos,
    };
    setSending(true);
    try {
      if (onSendToCoach) {
        await onSendToCoach(payload);
      } else {
        await sendNotesToCoach(payload);
      }
    } catch (e) {
      Alert.alert('Send failed', e instanceof Error ? e.message : 'Could not reach coach');
    } finally {
      setSending(false);
    }
  }, [notes, trackName, photos, onSendToCoach, sendNotesToCoach]);

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
          <AppLogo size={28} />
        </View>
        <Text style={styles.heroTitle}>Import track notes</Text>
        <Text style={styles.heroSubtitle}>
          Paste notes shared by another rider (e.g. from Messages or WhatsApp). The coach can then
          summarise and add them to your log.
        </Text>

        <TouchableOpacity
          style={[styles.pasteButton, pasting && styles.buttonDisabled]}
          onPress={handlePaste}
          disabled={pasting}
          activeOpacity={0.7}
        >
          {pasting ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <Text style={styles.pasteButtonText}>Paste from clipboard</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Track name (optional)</Text>
        <TextInput
          style={styles.trackInput}
          value={trackName}
          onChangeText={setTrackName}
          placeholder="e.g. Phillip Island"
          placeholderTextColor="#64748b"
          maxLength={80}
        />

        <View style={styles.photosSection}>
          <Text style={styles.label}>Photos (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosRow}
          >
            {photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photoThumb} />
            ))}
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
              activeOpacity={0.7}
            >
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
          activeOpacity={0.7}
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
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 8,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 20,
  },
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
  pasteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  trackInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 16,
  },
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
  photosSection: {
    marginBottom: 20,
  },
  photosRow: {
    alignItems: 'center',
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#020617',
  },
  addPhotoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#020617',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  sendButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
