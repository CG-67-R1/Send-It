import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { AppLogo } from '../components/AppLogo';
import {
  saveTrackWalkSession,
  formatSessionForExport,
  type TrackWalkEntry,
  type TrackWalkEntryType,
} from '../storage/trackWalk';

export function TrackWalkScreen() {
  const navigation = useNavigation();
  const [trackName, setTrackName] = useState('');
  const [entries, setEntries] = useState<TrackWalkEntry[]>([]);
  const [addingType, setAddingType] = useState<TrackWalkEntryType | null>(null);
  const [draftText, setDraftText] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishTrackName, setFinishTrackName] = useState('');
  const [saving, setSaving] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const requestVoice = useCallback(async () => {
    try {
      const { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } = require('expo-speech-recognition');
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Microphone', 'Allow microphone access to use voice notes.');
        return false;
      }
      setVoiceAvailable(true);
      return true;
    } catch {
      setVoiceAvailable(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (voiceAvailable === false) return;
    if (voiceAvailable === null) {
      const ok = await requestVoice();
      if (!ok) return;
    }
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      setInterimTranscript('');
      ExpoSpeechRecognitionModule.start({ lang: 'en-AU', interimResults: true, continuous: true });
      setRecording(true);
    } catch (e) {
      setVoiceAvailable(false);
      Alert.alert('Voice', 'Voice input is not available on this device.');
    }
  }, [voiceAvailable, requestVoice]);

  const stopRecording = useCallback(() => {
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      ExpoSpeechRecognitionModule.stop();
    } catch {}
    setRecording(false);
    if (interimTranscript.trim()) {
      setDraftText((prev) => (prev ? `${prev} ${interimTranscript.trim()}` : interimTranscript.trim()));
      setInterimTranscript('');
    }
  }, [interimTranscript]);

  React.useEffect(() => {
    let resultSub: { remove: () => void } | null = null;
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      if (ExpoSpeechRecognitionModule?.addListener) {
        resultSub = ExpoSpeechRecognitionModule.addListener('result', (event: { results?: { transcript?: string }[]; isFinal?: boolean }) => {
          const t = (event.results?.[0] as { transcript?: string } | undefined)?.transcript ?? '';
          if (event.isFinal) {
            setDraftText((prev) => (prev ? `${prev} ${t}` : t));
            setInterimTranscript('');
          } else {
            setInterimTranscript(t);
          }
        });
      }
    } catch {
      // Voice not available (e.g. web or unsupported)
    }
    return () => {
      resultSub?.remove?.();
    };
  }, []);

  const addEntry = useCallback(() => {
    const text = (draftText || interimTranscript).trim();
    if (!addingType) return;
    if (text) {
      setEntries((prev) => [...prev, { type: addingType, text }]);
    }
    setAddingType(null);
    setDraftText('');
    setInterimTranscript('');
    if (recording) stopRecording();
  }, [addingType, draftText, interimTranscript, recording, stopRecording]);

  const cancelAdding = useCallback(() => {
    setAddingType(null);
    setDraftText('');
    setInterimTranscript('');
    if (recording) stopRecording();
  }, [recording, stopRecording]);

  const removeEntry = useCallback((index: number) => {
    Alert.alert('Remove', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setEntries((prev) => prev.filter((_, i) => i !== index)) },
    ]);
  }, []);

  const handleFinish = useCallback(() => {
    if (entries.length === 0) {
      Alert.alert('No notes', 'Add at least one note or turn before finishing.');
      return;
    }
    setFinishTrackName(trackName);
    setShowFinishModal(true);
  }, [entries.length, trackName]);

  const finalTrackName = (finishTrackName || trackName).trim() || 'Track walk';
  const dateIso = new Date().toISOString().slice(0, 10);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveTrackWalkSession({
        dateIso,
        trackName: finalTrackName,
        entries,
      });
      setShowFinishModal(false);
      setEntries([]);
      setTrackName('');
      setFinishTrackName('');
      Alert.alert('Saved', 'Track walk saved. You can start a new walk or go back.');
    } finally {
      setSaving(false);
    }
  }, [dateIso, finalTrackName, entries]);

  const handleSendToCoach = useCallback(async () => {
    const session = {
      dateIso,
      trackName: finalTrackName,
      entries,
    };
    const text = formatSessionForExport({
      ...session,
      id: '',
      createdAt: 0,
    });
    await Clipboard.setStringAsync(text);
    setShowFinishModal(false);
    setEntries([]);
    setTrackName('');
    setFinishTrackName('');
    const tabNav = navigation.getParent() as { navigate: (name: string) => void } | undefined;
    tabNav?.navigate('RiderCoachTab');
    setTimeout(() => {
      Alert.alert(
        'Sent to coach',
        'Your track walk notes have been copied. Open Rider Coach, tap Import notes, then paste and send to discuss with your coach.'
      );
    }, 300);
  }, [dateIso, finalTrackName, entries, navigation]);

  const goToImport = useCallback(() => {
    (navigation as { navigate: (name: string) => void }).navigate('ImportTrackNotes');
  }, [navigation]);

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
        <Text style={styles.title}>Track Walk / Track Notes</Text>
        <Text style={styles.subtitle}>
          Add notes or turns as you walk. Tap Note or Turn, then speak or type. Finish when done to save or send to coach.
        </Text>

        <Text style={styles.label}>Track name (optional now, can set when finishing)</Text>
        <TextInput
          style={styles.trackInput}
          value={trackName}
          onChangeText={setTrackName}
          placeholder="e.g. Phillip Island"
          placeholderTextColor="#64748b"
          maxLength={80}
        />

        {entries.map((entry, index) => (
          <View key={index} style={[styles.entryCard, entry.type === 'turn' && styles.entryCardTurn]}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryBadge, entry.type === 'turn' && styles.entryBadgeTurn]}>
                {entry.type === 'turn' ? 'Turn' : 'Note'}
              </Text>
              <TouchableOpacity onPress={() => removeEntry(index)} hitSlop={8}>
                <Text style={styles.removeEntry}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.entryText}>{entry.text}</Text>
          </View>
        ))}

        {addingType === null ? (
          <View style={styles.addRow}>
            <TouchableOpacity
              style={[styles.addButton, styles.addNote]}
              onPress={() => setAddingType('note')}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, styles.addTurn]}
              onPress={() => setAddingType('turn')}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Turn</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.draftCard}>
            <Text style={styles.draftLabel}>{addingType === 'turn' ? 'Turn' : 'Note'} — speak or type below</Text>
            <View style={styles.draftRow}>
              <TextInput
                style={styles.draftInput}
                value={draftText}
                onChangeText={setDraftText}
                placeholder={recording ? 'Listening…' : 'Type or use mic'}
                placeholderTextColor="#64748b"
                multiline
                editable={!recording}
              />
              <TouchableOpacity
                style={[styles.micButton, recording && styles.micButtonActive]}
                onPress={recording ? stopRecording : startRecording}
                activeOpacity={0.8}
              >
                <Text style={styles.micButtonText}>{recording ? 'Stop' : '🎤'}</Text>
              </TouchableOpacity>
            </View>
            {interimTranscript ? <Text style={styles.interimText}>{interimTranscript}</Text> : null}
            <View style={styles.draftActions}>
              <TouchableOpacity style={styles.cancelDraftButton} onPress={cancelAdding}>
                <Text style={styles.cancelDraftText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveDraftButton, !draftText.trim() && !interimTranscript && styles.saveDraftDisabled]}
                onPress={addEntry}
                disabled={!draftText.trim() && !interimTranscript}
              >
                <Text style={styles.saveDraftText}>Save {addingType}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {entries.length > 0 && addingType === null && (
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.8}>
            <Text style={styles.finishButtonText}>I'm done — save date & track name</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.importButton} onPress={goToImport} activeOpacity={0.8}>
          <Text style={styles.importButtonText}>Import notes</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish track walk</Text>
            <Text style={styles.modalSubtitle}>Date: {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            <Text style={styles.label}>Track name</Text>
            <TextInput
              style={styles.trackInput}
              value={finishTrackName}
              onChangeText={setFinishTrackName}
              placeholder="e.g. Phillip Island"
              placeholderTextColor="#64748b"
              maxLength={80}
            />
            <Text style={styles.modalPrompt}>Save locally or send to coach to discuss?</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSaveButton]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={styles.modalButtonText}>Store / Save</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCoachButton]}
              onPress={handleSendToCoach}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCoachButtonText}>Send to coach</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFinishModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  logoRow: { marginTop: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#f8fafc', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#94a3b8', lineHeight: 20, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  trackInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  entryCardTurn: { borderLeftColor: '#0ea5e9' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryBadge: { fontSize: 12, fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase' },
  entryBadgeTurn: { color: '#0ea5e9' },
  entryText: { fontSize: 15, color: '#e2e8f0', lineHeight: 22 },
  removeEntry: { fontSize: 13, color: '#94a3b8' },
  addRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  addButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  addNote: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  addTurn: { borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.15)' },
  addButtonText: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  draftCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  draftLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  draftRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  draftInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#f8fafc',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  micButton: {
    padding: 14,
    backgroundColor: '#334155',
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  micButtonActive: { backgroundColor: '#dc2626' },
  micButtonText: { fontSize: 20 },
  interimText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 },
  draftActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelDraftButton: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelDraftText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  saveDraftButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#f59e0b', borderRadius: 10 },
  saveDraftDisabled: { opacity: 0.5 },
  saveDraftText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  finishButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#f59e0b',
    marginBottom: 24,
  },
  finishButtonText: { fontSize: 16, fontWeight: '700', color: '#f59e0b' },
  importButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  importButtonText: { fontSize: 16, fontWeight: '600', color: '#e2e8f0' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  modalPrompt: { fontSize: 15, color: '#e2e8f0', marginBottom: 16 },
  modalButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  modalSaveButton: { backgroundColor: '#f59e0b' },
  modalButtonText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalCoachButton: { backgroundColor: '#334155' },
  modalCoachButtonText: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  modalCancel: { paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#94a3b8' },
});
