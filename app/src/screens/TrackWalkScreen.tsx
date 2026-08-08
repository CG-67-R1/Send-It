import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTrackArrivalRecheck } from '../context/TrackArrivalContext';
import { isTrackArrivalEnabled } from '../location/trackGeofence';
import { AppLogo } from '../components/AppLogo';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import { CornerPicker } from '../components/CornerPicker';
import { OtherTrackContextForm } from '../components/OtherTrackContextForm';
import { TrackPicker } from '../components/TrackPicker';
import type { CornerDefinition, CornerDirection, OtherTrackContext, TrackDefinition } from '../data/tracks';
import { formatCornerHeading, getTrackById, isOtherTrackComplete, OTHER_TRACK } from '../data/tracks';
import { persistTrackWalkPhotos } from '../storage/trackWalkPhotos';
import {
  saveTrackWalkSession,
  getTrackWalkSessions,
  deleteTrackWalkSession,
  sessionReadyForCoach,
  type TrackWalkEntry,
  type TrackWalkSession,
} from '../storage/trackWalk';
import { exportTrackWalkSession } from '../utils/exportTrackWalk';
import { formatTrackNotesForCoach, sendCoachChat } from '../utils/coachChat';
import { photoUrisToCoachPayloads } from '../utils/coachAttachments';

type AddingMode = 'corner' | 'note' | null;
type SessionVisibility = TrackWalkSession['visibility'];

const VISIBILITY_OPTIONS: { value: SessionVisibility; label: string }[] = [
  { value: 'private', label: 'Private' },
  { value: 'team', label: 'Team' },
  { value: 'community', label: 'Community' },
];

/** Module-scope speech recognition (optional native module). */
type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: { lang: string; interimResults: boolean; continuous: boolean }) => void;
  stop: () => void;
  addListener?: (
    event: string,
    cb: (event: { results?: { transcript?: string }[]; isFinal?: boolean }) => void
  ) => { remove: () => void };
};

let speechRecognition: SpeechRecognitionModule | null | undefined;

function getSpeechRecognition(): SpeechRecognitionModule | null {
  if (speechRecognition !== undefined) return speechRecognition;
  try {
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechRecognitionModule;
    };
    speechRecognition = mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    speechRecognition = null;
  }
  return speechRecognition;
}

const DEFAULT_OTHER_CONTEXT: OtherTrackContext = {
  customName: '',
  direction: 'unknown',
};

function entryHeading(entry: TrackWalkEntry, trackId: string): string {
  if (entry.type === 'note') return 'General note';
  if (entry.cornerNumber === null || entry.cornerId?.endsWith('_t_finish')) {
    return formatCornerHeading({
      number: null,
      label: 'T-Finish',
      direction: entry.direction ?? 'straight',
      isFinish: true,
    });
  }
  return formatCornerHeading(
    {
      number: entry.cornerNumber ?? 0,
      label: entry.cornerLabel ?? `T${entry.cornerNumber}`,
      direction: entry.direction ?? 'complex',
    },
    entry.cornerLabel && !entry.cornerLabel.startsWith('T') ? entry.cornerLabel : undefined
  );
}

export function TrackWalkScreen() {
  const navigation = useNavigation();
  const recheckArrival = useTrackArrivalRecheck();
  const [trackId, setTrackId] = useState<string | null>(null);
  const [otherContext, setOtherContext] = useState<OtherTrackContext>(DEFAULT_OTHER_CONTEXT);
  const [entries, setEntries] = useState<TrackWalkEntry[]>([]);
  const [addingMode, setAddingMode] = useState<AddingMode>(null);
  const [draftText, setDraftText] = useState('');
  const [draftCornerId, setDraftCornerId] = useState<string | null>(null);
  const [draftDirection, setDraftDirection] = useState<CornerDirection | null>(null);
  const [draftNickname, setDraftNickname] = useState('');
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [visibility, setVisibility] = useState<SessionVisibility>('private');
  const [bikeClass, setBikeClass] = useState('');
  const [conditions, setConditions] = useState('');
  const [authorExperience, setAuthorExperience] = useState('');
  const [savedSessions, setSavedSessions] = useState<TrackWalkSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingCoach, setSendingCoach] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const interimRef = useRef('');

  const selectedTrack = useMemo<TrackDefinition | null>(() => {
    if (!trackId) return null;
    if (trackId === 'other') {
      return {
        ...OTHER_TRACK,
        name: otherContext.customName.trim() || 'Other track',
        direction: otherContext.direction === 'unknown' ? 'unknown' : otherContext.direction,
      };
    }
    return getTrackById(trackId) ?? null;
  }, [trackId, otherContext.customName, otherContext.direction]);

  const loadSavedSessions = useCallback(async () => {
    setSavedSessions(await getTrackWalkSessions());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedSessions();
      void isTrackArrivalEnabled().then((enabled) => {
        if (enabled) recheckArrival();
      });
    }, [loadSavedSessions, recheckArrival])
  );

  const buildSession = useCallback((): Omit<TrackWalkSession, 'id' | 'createdAt'> => {
    const dateIso = new Date().toISOString().slice(0, 10);
    const isOther = trackId === 'other';
    return {
      dateIso,
      trackId: trackId ?? 'other',
      trackName: isOther
        ? otherContext.customName.trim() || 'Other track'
        : selectedTrack?.name ?? 'Track walk',
      trackDirection: isOther
        ? otherContext.direction
        : selectedTrack?.direction !== 'unknown'
          ? selectedTrack?.direction
          : undefined,
      otherTrackContext: isOther ? otherContext : undefined,
      entries,
      visibility,
      bikeClass: visibility !== 'private' ? bikeClass.trim() || undefined : undefined,
      conditions: visibility !== 'private' ? conditions.trim() || undefined : undefined,
      authorExperience:
        visibility !== 'private' ? authorExperience.trim() || undefined : undefined,
    };
  }, [
    trackId,
    otherContext,
    selectedTrack,
    entries,
    visibility,
    bikeClass,
    conditions,
    authorExperience,
  ]);

  const requestVoice = useCallback(async () => {
    try {
      const ExpoSpeechRecognitionModule = getSpeechRecognition();
      if (!ExpoSpeechRecognitionModule) {
        setVoiceAvailable(false);
        return false;
      }
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
      const ExpoSpeechRecognitionModule = getSpeechRecognition();
      if (!ExpoSpeechRecognitionModule) {
        setVoiceAvailable(false);
        Alert.alert('Voice', 'Voice input is not available on this device.');
        return;
      }
      setInterimTranscript('');
      interimRef.current = '';
      ExpoSpeechRecognitionModule.start({ lang: 'en-AU', interimResults: true, continuous: true });
      setRecording(true);
    } catch {
      setVoiceAvailable(false);
      Alert.alert('Voice', 'Voice input is not available on this device.');
    }
  }, [voiceAvailable, requestVoice]);

  const stopRecording = useCallback(() => {
    try {
      getSpeechRecognition()?.stop();
    } catch {}
    setRecording(false);
    const pending = interimRef.current.trim();
    if (pending) {
      setDraftText((prev) => (prev ? `${prev} ${pending}` : pending));
      interimRef.current = '';
      setInterimTranscript('');
    }
  }, []);

  React.useEffect(() => {
    let resultSub: { remove: () => void } | null = null;
    try {
      const ExpoSpeechRecognitionModule = getSpeechRecognition();
      if (ExpoSpeechRecognitionModule?.addListener) {
        resultSub = ExpoSpeechRecognitionModule.addListener(
          'result',
          (event: { results?: { transcript?: string }[]; isFinal?: boolean }) => {
            const t = (event.results?.[0] as { transcript?: string } | undefined)?.transcript ?? '';
            if (event.isFinal) {
              setDraftText((prev) => (prev ? `${prev} ${t}` : t));
              interimRef.current = '';
              setInterimTranscript('');
            } else {
              interimRef.current = t;
              setInterimTranscript(t);
            }
          }
        );
      }
    } catch {}
    return () => resultSub?.remove?.();
  }, []);

  const resetDraft = useCallback(() => {
    setAddingMode(null);
    setDraftText('');
    setDraftCornerId(null);
    setDraftDirection(null);
    setDraftNickname('');
    setDraftPhotos([]);
    setInterimTranscript('');
    if (recording) stopRecording();
  }, [recording, stopRecording]);

  const resetWalk = useCallback(() => {
    setEntries([]);
    setTrackId(null);
    setOtherContext(DEFAULT_OTHER_CONTEXT);
    setShowFinishModal(false);
    setVisibility('private');
    setBikeClass('');
    setConditions('');
    setAuthorExperience('');
    resetDraft();
  }, [resetDraft]);

  const handleSelectTrack = useCallback((track: TrackDefinition) => {
    setTrackId(track.id);
    if (track.id === 'other') {
      setOtherContext(DEFAULT_OTHER_CONTEXT);
    }
  }, []);

  const handleSelectCorner = useCallback(
    (corner: CornerDefinition) => {
      setDraftCornerId(corner.id);
      setDraftDirection(corner.direction);
    },
    []
  );

  const addDraftPhoto = useCallback(async (source: 'gallery' | 'camera') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera', 'Allow camera access to take track photos.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled && result.assets?.[0]?.uri) {
          setDraftPhotos((prev) => [...prev, result.assets[0].uri]);
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photos', 'Allow photo access to attach track photos.', [
            { text: 'OK' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
        if (!result.canceled && result.assets?.length) {
          setDraftPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
        }
      }
    } catch {
      Alert.alert('Photos', 'Could not add photo. Try again.');
    }
  }, []);

  const addEntry = useCallback(async () => {
    const text = (draftText || interimTranscript).trim();
    if (!addingMode || !text) return;

    if (addingMode === 'corner') {
      if (!draftCornerId || !selectedTrack) {
        Alert.alert('Corner', 'Select a corner first.');
        return;
      }
      const corner = selectedTrack.corners.find((c) => c.id === draftCornerId);
      if (!corner) return;
      const direction = trackId === 'other' ? draftDirection : corner.direction;
      if (!direction) {
        Alert.alert('Direction', 'Select turn direction for this corner.');
        return;
      }
      const photoUris = draftPhotos.length ? await persistTrackWalkPhotos(draftPhotos) : undefined;
      setEntries((prev) => [
        ...prev,
        {
          type: 'corner',
          cornerId: corner.id,
          cornerNumber: corner.number,
          cornerLabel: draftNickname.trim() || corner.label,
          direction,
          text,
          photoUris,
        },
      ]);
    } else {
      setEntries((prev) => [...prev, { type: 'note', text }]);
    }
    resetDraft();
  }, [
    addingMode,
    draftText,
    interimTranscript,
    draftCornerId,
    selectedTrack,
    trackId,
    draftDirection,
    draftPhotos,
    draftNickname,
    resetDraft,
  ]);

  const removeEntry = useCallback((index: number) => {
    Alert.alert('Remove', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setEntries((prev) => prev.filter((_, i) => i !== index)) },
    ]);
  }, []);

  const canAddEntries = trackId && (trackId !== 'other' || isOtherTrackComplete(otherContext));

  const handleFinish = useCallback(() => {
    if (!canAddEntries) {
      Alert.alert('Track', 'Select a track and complete required details before finishing.');
      return;
    }
    if (entries.length === 0) {
      Alert.alert('No notes', 'Add at least one corner or general note before finishing.');
      return;
    }
    setShowFinishModal(true);
  }, [canAddEntries, entries.length]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveTrackWalkSession(buildSession());
      resetWalk();
      await loadSavedSessions();
      Alert.alert('Saved', 'Track walk saved on this device.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save track walk.');
    } finally {
      setSaving(false);
    }
  }, [buildSession, resetWalk, loadSavedSessions]);

  const handleExportFile = useCallback(async () => {
    setExporting(true);
    try {
      await exportTrackWalkSession({ ...buildSession(), id: `export_${Date.now()}`, createdAt: Date.now() });
      resetWalk();
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not export track walk file.');
    } finally {
      setExporting(false);
    }
  }, [buildSession, resetWalk]);

  const handleSendToCoach = useCallback(async () => {
    const session = buildSession();
    if (!sessionReadyForCoach(session)) {
      Alert.alert('Track', 'Complete track details before asking the coach.');
      return;
    }
    setSendingCoach(true);
    try {
      const coachMessage = formatTrackNotesForCoach({ ...session, id: '', createdAt: 0 });
      const photoUris = session.entries.flatMap((e) => e.photoUris ?? []);
      const attachments = photoUris.length ? await photoUrisToCoachPayloads(photoUris) : [];
      const result = await sendCoachChat(coachMessage, 'coach', [], attachments);
      if (!result.ok) {
        Alert.alert('Coach unavailable', result.error);
        return;
      }
      resetWalk();
      (navigation as { navigate: (name: string, params?: object) => void }).navigate('RiderCoach', {
        seedMessages: [
          { role: 'user', content: coachMessage },
          { role: 'assistant', content: result.reply },
        ],
      });
    } finally {
      setSendingCoach(false);
    }
  }, [buildSession, navigation, resetWalk]);

  const goToImport = useCallback(() => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate('ImportTrackNotes', {
      initialTrackId: trackId ?? undefined,
      initialTrackName: otherContext.customName.trim() || selectedTrack?.name,
    });
  }, [navigation, trackId, otherContext.customName, selectedTrack?.name]);

  const draftCorner = selectedTrack?.corners.find((c) => c.id === draftCornerId);

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
          <AppLogo size={COMPACT_LOGO_SIZE} />
        </View>

        <Text style={styles.purposeBlurb}>
          Use Track Walk to capture corner and general notes while walking the circuit or
          reviewing a session. Notes stay private on this device; finish a walk to save,
          export a file, or ask RR AI Coach for feedback.
        </Text>

        <TrackPicker selectedTrackId={trackId} onSelect={handleSelectTrack} />

        {trackId === 'other' && (
          <OtherTrackContextForm value={otherContext} onChange={setOtherContext} />
        )}

        {entries.map((entry, index) => (
          <View
            key={index}
            style={[styles.entryCard, entry.type === 'corner' && styles.entryCardCorner]}
          >
            <View style={styles.entryHeader}>
              <Text style={[styles.entryBadge, entry.type === 'corner' && styles.entryBadgeCorner]}>
                {entryHeading(entry, trackId ?? 'other')}
              </Text>
              <TouchableOpacity onPress={() => removeEntry(index)} hitSlop={8}>
                <Text style={styles.removeEntry}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.entryText}>{entry.text}</Text>
            {entry.photoUris?.length ? (
              <Text style={styles.entryPhotoMeta}>
                {entry.photoUris.length} photo{entry.photoUris.length === 1 ? '' : 's'} attached
              </Text>
            ) : null}
          </View>
        ))}

        {addingMode === null ? (
          <View style={styles.addRow}>
            <TouchableOpacity
              style={[styles.addButton, styles.addCorner, !canAddEntries && styles.addDisabled]}
              onPress={() => canAddEntries && setAddingMode('corner')}
              disabled={!canAddEntries}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Corner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, styles.addNote, !canAddEntries && styles.addDisabled]}
              onPress={() => canAddEntries && setAddingMode('note')}
              disabled={!canAddEntries}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ General</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.draftCard}>
            <Text style={styles.draftLabel}>
              {addingMode === 'corner' ? 'Corner note' : 'General note'} — speak or type below
            </Text>

            {addingMode === 'corner' && selectedTrack && (
              <>
                <CornerPicker
                  corners={selectedTrack.corners}
                  selectedCornerId={draftCornerId}
                  isOtherTrack={trackId === 'other'}
                  direction={draftDirection}
                  onSelectCorner={handleSelectCorner}
                  onSelectDirection={setDraftDirection}
                />
                {trackId === 'other' && draftCorner && !draftCorner.isFinish && (
                  <>
                    <Text style={styles.label}>Corner nickname (optional)</Text>
                    <TextInput
                      style={styles.nicknameInput}
                      value={draftNickname}
                      onChangeText={setDraftNickname}
                      placeholder="e.g. back hairpin"
                      placeholderTextColor="#64748b"
                      maxLength={60}
                    />
                  </>
                )}
                {draftCorner?.approachFrom && (
                  <Text style={styles.approachHint}>Photo context: approach from {draftCorner.approachFrom}</Text>
                )}
                <View style={styles.photosRow}>
                  {draftPhotos.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.photoThumb} />
                  ))}
                  <TouchableOpacity style={styles.addPhotoButton} onPress={() => addDraftPhoto('gallery')}>
                    <Text style={styles.addPhotoText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addPhotoButton} onPress={() => addDraftPhoto('camera')}>
                    <Text style={styles.addPhotoText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

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
              >
                <Text style={styles.micButtonText}>{recording ? 'Stop' : '🎤'}</Text>
              </TouchableOpacity>
            </View>
            {interimTranscript ? <Text style={styles.interimText}>{interimTranscript}</Text> : null}
            <View style={styles.draftActions}>
              <TouchableOpacity style={styles.cancelDraftButton} onPress={resetDraft}>
                <Text style={styles.cancelDraftText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveDraftButton,
                  (!draftText.trim() && !interimTranscript) && styles.saveDraftDisabled,
                ]}
                onPress={() => void addEntry()}
                disabled={!draftText.trim() && !interimTranscript}
              >
                <Text style={styles.saveDraftText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {entries.length > 0 && addingMode === null && (
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish} activeOpacity={0.8}>
            <Text style={styles.finishButtonText}>I'm done — save or ask coach</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.importButton} onPress={goToImport} activeOpacity={0.8}>
          <Text style={styles.importButtonText}>Import notes</Text>
        </TouchableOpacity>

        {savedSessions.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Saved walks ({savedSessions.length})</Text>
            {savedSessions.slice(0, 5).map((session) => (
              <View key={session.id} style={styles.savedCard}>
                <View style={styles.savedHeader}>
                  <Text style={styles.savedTrack}>{session.trackName}</Text>
                  <Text style={styles.savedDate}>{session.dateIso}</Text>
                </View>
                <View style={styles.savedMetaRow}>
                  <Text style={styles.savedMeta}>{session.entries.length} entries</Text>
                  <Text
                    style={[
                      styles.visibilityBadge,
                      session.visibility === 'team' && styles.visibilityBadgeTeam,
                      session.visibility === 'community' && styles.visibilityBadgeCommunity,
                    ]}
                  >
                    {session.visibility.charAt(0).toUpperCase() + session.visibility.slice(1)}
                  </Text>
                </View>
                {session.visibility === 'community' && (session.bikeClass || session.conditions) ? (
                  <Text style={styles.sharedMeta}>
                    {[session.bikeClass, session.conditions].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <View style={styles.savedActions}>
                  <TouchableOpacity onPress={() => exportTrackWalkSession(session)}>
                    <Text style={styles.savedActionText}>Export file</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Delete walk', `Remove "${session.trackName}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteTrackWalkSession(session.id);
                            await loadSavedSessions();
                          },
                        },
                      ])
                    }
                  >
                    <Text style={styles.savedDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTitle}>Finish track walk</Text>
            <Text style={styles.modalSubtitle}>
              {selectedTrack?.name ?? 'Track'} ·{' '}
              {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={styles.modalPrompt}>Save on device, export a file, or ask your coach?</Text>
            <Text style={styles.visibilityLabel}>Note visibility</Text>
            <View style={styles.visibilityRow}>
              {VISIBILITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.visibilityOption,
                    visibility === option.value && styles.visibilityOptionActive,
                  ]}
                  onPress={() => setVisibility(option.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.visibilityOptionText,
                      visibility === option.value && styles.visibilityOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.visibilityHelp}>
              Private = only on this device. Team = tagged for future sharing with selected people
              (stored locally for now). Community = tagged for moderated publish (stored locally
              until a server exists).
            </Text>
            {visibility !== 'private' ? (
              <View style={styles.sharedFields}>
                <TextInput
                  style={styles.sharedInput}
                  value={bikeClass}
                  onChangeText={setBikeClass}
                  placeholder="Bike class (optional)"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  style={styles.sharedInput}
                  value={conditions}
                  onChangeText={setConditions}
                  placeholder="Conditions (optional)"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  style={styles.sharedInput}
                  value={authorExperience}
                  onChangeText={setAuthorExperience}
                  placeholder="Rider experience (optional)"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            ) : null}
            <Text style={styles.riderNoteHelp}>
              All user notes are rider notes. Official and coach notes will be distinguished in a
              future update.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSaveButton]}
              onPress={handleSave}
              disabled={saving || exporting || sendingCoach}
            >
              {saving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.modalButtonText}>Store / Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalExportButton]}
              onPress={handleExportFile}
              disabled={saving || exporting || sendingCoach}
            >
              {exporting ? <ActivityIndicator size="small" color="#f8fafc" /> : <Text style={styles.modalExportButtonText}>Export file</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCoachButton]}
              onPress={handleSendToCoach}
              disabled={saving || exporting || sendingCoach}
            >
              {sendingCoach ? <ActivityIndicator size="small" color="#f8fafc" /> : <Text style={styles.modalCoachButtonText}>Ask coach</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFinishModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  logoRow: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  purposeBlurb: {
    fontSize: 14,
    color: '#93c5fd',
    lineHeight: 20,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  entryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  entryCardCorner: { borderLeftColor: '#0ea5e9' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  entryBadge: { fontSize: 12, fontWeight: '700', color: '#f59e0b', flex: 1 },
  entryBadgeCorner: { color: '#0ea5e9' },
  entryText: { fontSize: 15, color: '#e2e8f0', lineHeight: 22 },
  entryPhotoMeta: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  removeEntry: { fontSize: 13, color: '#94a3b8' },
  addRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  addButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  addNote: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  addCorner: { borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.15)' },
  addDisabled: { opacity: 0.4 },
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
  nicknameInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#f8fafc',
    marginBottom: 8,
  },
  approachHint: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 8 },
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
  micButton: { padding: 14, backgroundColor: '#334155', borderRadius: 10, minWidth: 52, alignItems: 'center' },
  micButtonActive: { backgroundColor: '#dc2626' },
  micButtonText: { fontSize: 20 },
  interimText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 },
  draftActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelDraftButton: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelDraftText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  saveDraftButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#f59e0b', borderRadius: 10 },
  saveDraftDisabled: { opacity: 0.5 },
  saveDraftText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  photosRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  photoThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#020617' },
  addPhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  addPhotoText: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
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
  importButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#334155' },
  importButtonText: { fontSize: 16, fontWeight: '600', color: '#e2e8f0' },
  savedSection: { marginTop: 28 },
  savedTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  savedCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10 },
  savedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  savedTrack: { fontSize: 16, fontWeight: '600', color: '#f8fafc', flex: 1 },
  savedDate: { fontSize: 13, color: '#94a3b8' },
  savedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  savedMeta: { fontSize: 13, color: '#94a3b8' },
  visibilityBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    backgroundColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  visibilityBadgeTeam: { color: '#bae6fd', backgroundColor: '#075985' },
  visibilityBadgeCommunity: { color: '#bbf7d0', backgroundColor: '#166534' },
  sharedMeta: { fontSize: 12, color: '#cbd5e1', marginBottom: 8 },
  savedActions: { flexDirection: 'row', gap: 16 },
  savedActionText: { fontSize: 14, fontWeight: '600', color: '#f59e0b' },
  savedDeleteText: { fontSize: 14, fontWeight: '600', color: '#f87171' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 16, maxHeight: '90%' },
  modalContentInner: { padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  modalPrompt: { fontSize: 15, color: '#e2e8f0', marginBottom: 16 },
  visibilityLabel: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  visibilityRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  visibilityOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
  },
  visibilityOptionActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  visibilityOptionText: { fontSize: 12, fontWeight: '700', color: '#cbd5e1' },
  visibilityOptionTextActive: { color: '#0f172a' },
  visibilityHelp: { fontSize: 12, color: '#cbd5e1', lineHeight: 17, marginBottom: 10 },
  sharedFields: { gap: 8, marginBottom: 10 },
  sharedInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f8fafc',
  },
  riderNoteHelp: { fontSize: 12, color: '#cbd5e1', lineHeight: 17, marginBottom: 14 },
  modalButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  modalSaveButton: { backgroundColor: '#f59e0b' },
  modalButtonText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalExportButton: { backgroundColor: '#0ea5e9' },
  modalExportButtonText: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  modalCoachButton: { backgroundColor: '#334155' },
  modalCoachButtonText: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  modalCancel: { paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#94a3b8' },
});
