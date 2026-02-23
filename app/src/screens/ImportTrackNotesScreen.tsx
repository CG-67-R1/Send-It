import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Props = {
  onSendToCoach?: (payload: { trackName: string; notes: string }) => Promise<void>;
};

export function ImportTrackNotesScreen({ onSendToCoach }: Props) {
  const [notes, setNotes] = useState('');
  const [trackName, setTrackName] = useState('');
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

  const handleSendToCoach = useCallback(async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      Alert.alert('No notes', 'Paste or type track notes first.');
      return;
    }
    if (onSendToCoach) {
      setSending(true);
      try {
        await onSendToCoach({
          trackName: trackName.trim() || 'Imported track',
          notes: trimmed,
        });
      } finally {
        setSending(false);
      }
      return;
    }
    // Placeholder when coach API not connected
    Alert.alert(
      'Send to coach',
      'When the coach is connected, your notes will be sent for summarising and then you can add them to your track log.',
      [{ text: 'OK' }]
    );
  }, [notes, trackName, onSendToCoach]);

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
