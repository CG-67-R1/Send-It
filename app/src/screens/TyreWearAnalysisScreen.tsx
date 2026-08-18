import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PrivateSetupBanner } from '../components/PrivateSetupBanner';
import { TrackPicker } from '../components/TrackPicker';
import {
  PHOTO_TAKEN_OPTIONS,
  SESSION_LENGTH_OPTIONS,
  TYRE_AXLE_OPTIONS,
  TYRE_PHOTO_SLOTS,
  WARMERS_OPTIONS,
  formatTyreWearForCoach,
  missingTyreWearFacts,
  type PhotoTakenWhen,
  type TyreAxle,
  type TyrePhotoSlotId,
  type WarmersUse,
} from '../calc/tyreWear';
import type { TrackDefinition } from '../data/tracks';
import { navigateToCoachChat } from '../navigation/rootNavigation';
import { formatFavouriteBikeFromSheet, getBikeSetupDaySheet } from '../storage/bikeSetupSheet';
import { getTrackPrepSelectedTrack } from '../storage/trackdayPrep';
import {
  emptyTyreWearAnalysisState,
  loadTyreWearAnalysisState,
  saveTyreWearAnalysisState,
  clearTyreWearAnalysisState,
  type TyreWearAnalysisState,
} from '../storage/tyreWearAnalysis';
import {
  attachmentsToPayload,
  pickCoachPhotoFromLibrary,
  takeCoachPhoto,
  type CoachAttachment,
} from '../utils/coachAttachments';
import { sendCoachChat } from '../utils/coachChat';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TyreWearAnalysis'>;

type CoachImageAttachment = Extract<CoachAttachment, { kind: 'image' }>;
type PhotoSlots = Partial<Record<TyrePhotoSlotId, CoachImageAttachment>>;

function isSessionLengthPreset(value: string): boolean {
  return (SESSION_LENGTH_OPTIONS as readonly string[]).includes(value);
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function TyreWearAnalysisScreen() {
  const navigation = useNavigation<Nav>();
  const [state, setState] = useState<TyreWearAnalysisState>(() => emptyTyreWearAnalysisState());
  const [photos, setPhotos] = useState<PhotoSlots>({});
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);
  const sheetHotRef = useRef({ front: '', rear: '' });
  const bikeLabelRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, sheet, trackSel] = await Promise.all([
        loadTyreWearAnalysisState(),
        getBikeSetupDaySheet(),
        getTrackPrepSelectedTrack(),
      ]);
      if (cancelled) return;

      sheetHotRef.current = {
        front: sheet.tyreFrontPressureHot.trim(),
        rear: sheet.tyreRearPressureHot.trim(),
      };
      bikeLabelRef.current = formatFavouriteBikeFromSheet(sheet);

      let next = saved;
      if (!next.brandCompound.trim() && sheet.tyreBrandCompound.trim()) {
        next = { ...next, brandCompound: sheet.tyreBrandCompound };
      }
      if (!next.trackTemp.trim() && sheet.trackTemp.trim()) {
        next = { ...next, trackTemp: sheet.trackTemp };
      }
      if (!next.ambientTemp.trim() && sheet.ambientTemp.trim()) {
        next = { ...next, ambientTemp: sheet.ambientTemp };
      }
      if (!next.pressureUnit) {
        next = { ...next, pressureUnit: sheet.pressureUnit };
      } else if (!saved.hotPressure.trim()) {
        next = { ...next, pressureUnit: sheet.pressureUnit };
      }
      if (!next.hotPressure.trim() && next.axle) {
        const fromSheet = next.axle === 'front' ? sheetHotRef.current.front : sheetHotRef.current.rear;
        if (fromSheet) next = { ...next, hotPressure: fromSheet };
      }
      if (!next.trackId && trackSel) {
        next = { ...next, trackId: trackSel.trackId, trackName: trackSel.trackName };
      } else if (!next.trackName.trim() && sheet.trackName.trim()) {
        next = { ...next, trackName: sheet.trackName };
      }

      setState(next);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveTyreWearAnalysisState(state);
  }, [ready, state]);

  const setAxle = useCallback((axle: TyreAxle) => {
    setState((prev) => {
      const next: TyreWearAnalysisState = { ...prev, axle };
      if (!prev.hotPressure.trim()) {
        const fromSheet = axle === 'front' ? sheetHotRef.current.front : sheetHotRef.current.rear;
        if (fromSheet) next.hotPressure = fromSheet;
      }
      return next;
    });
  }, []);

  const captureSlot = useCallback((slotId: TyrePhotoSlotId) => {
    Alert.alert(TYRE_PHOTO_SLOTS.find((s) => s.id === slotId)?.label ?? 'Photo', 'Add a tyre photo for this slot.', [
      {
        text: 'Take photo',
        onPress: () => {
          void (async () => {
            const att = await takeCoachPhoto();
            if (att?.kind === 'image') setPhotos((prev) => ({ ...prev, [slotId]: att }));
          })();
        },
      },
      {
        text: 'Photo library',
        onPress: () => {
          void (async () => {
            const att = await pickCoachPhotoFromLibrary();
            if (att?.kind === 'image') setPhotos((prev) => ({ ...prev, [slotId]: att }));
          })();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const removeSlot = useCallback((slotId: TyrePhotoSlotId) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const photoOrder = useMemo(() => {
    const order: TyrePhotoSlotId[] = [];
    for (const slot of TYRE_PHOTO_SLOTS) {
      if (photos[slot.id]) order.push(slot.id);
    }
    return order;
  }, [photos]);

  const missing = useMemo(
    () =>
      missingTyreWearFacts({
        hasBandFollow: Boolean(photos.bandFollow),
        brandCompound: state.brandCompound,
        hotPressure: state.hotPressure,
        trackTemp: state.trackTemp,
        warmers: state.warmers,
        photoTaken: state.photoTaken,
      }),
    [photos.bandFollow, state]
  );

  const canSend = Boolean(state.axle && photos.overview && !sending);
  const hasDraft =
    photoOrder.length > 0 ||
    state.axle != null ||
    Boolean(state.brandCompound.trim()) ||
    Boolean(state.hotPressure.trim()) ||
    Boolean(state.notes.trim()) ||
    Boolean(state.sessionLength.trim());

  const resetAnalysis = useCallback(() => {
    setPhotos({});
    setState(emptyTyreWearAnalysisState());
    void clearTyreWearAnalysisState();
  }, []);

  const confirmResetAnalysis = useCallback(() => {
    Alert.alert('Start new analysis?', 'This clears photos and tyre facts on this screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: resetAnalysis },
    ]);
  }, [resetAnalysis]);

  const handleSend = useCallback(async () => {
    if (!state.axle || !photos.overview) {
      Alert.alert('Need a photo', 'Pick Front or Rear and capture the overview photo first.');
      return;
    }

    const brief = formatTyreWearForCoach({
      axle: state.axle,
      brandCompound: state.brandCompound,
      hotPressure: state.hotPressure,
      pressureUnit: state.pressureUnit,
      trackTemp: state.trackTemp,
      ambientTemp: state.ambientTemp,
      sessionLength: state.sessionLength,
      warmers: state.warmers,
      photoTaken: state.photoTaken,
      trackName: state.trackName,
      bikeLabel: bikeLabelRef.current,
      notes: state.notes,
      photoSlots: photoOrder,
    });

    const attachments = attachmentsToPayload(photoOrder.map((id) => photos[id]!));

    setSending(true);
    try {
      const result = await sendCoachChat(brief, 'bikesetup', [], attachments);
      if (!result.ok) {
        Alert.alert('Coach unavailable', result.error);
        return;
      }

      resetAnalysis();

      const seedParams = {
        mode: 'bikesetup' as const,
        seedMessages: [
          {
            role: 'user' as const,
            content: brief,
            attachments: photoOrder.map((id) => {
              const att = photos[id]!;
              return { kind: 'image' as const, uri: att.uri, name: att.name };
            }),
          },
          { role: 'assistant' as const, content: result.reply },
        ],
      };

      const stackRoutes = navigation.getState()?.routeNames ?? [];
      if (stackRoutes.includes('CoachChat')) {
        navigation.navigate('CoachChat', seedParams);
      } else {
        navigateToCoachChat(seedParams);
      }
    } finally {
      setSending(false);
    }
  }, [navigation, photoOrder, photos, resetAnalysis, state]);

  if (!ready) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PrivateSetupBanner detail="Photos and tyre facts stay on this device until you send them to Bike Setup Coach for diagnosis." />

        <Text style={styles.intro}>
          Capture the tyre the way a crew chief would look at it, then fill what the photos cannot
          show. Two or three shots beat one tight close-up.
        </Text>

        <Text style={styles.section}>How to photograph</Text>
        <View style={styles.guideCard}>
          <Text style={styles.guideLine}>
            Overview — whole tyre from about 45°, centre through shoulder to the edge.
          </Text>
          <Text style={styles.guideLine}>
            Band follow — rotate the wheel 90–180° so we can see if the wear is a full ring or
            patches.
          </Text>
          <Text style={styles.guideLine}>
            Macro — optional. One groove or tear flap filling the frame. Daylight or even paddock
            light; skip flash glare.
          </Text>
          <Text style={styles.guideNote}>
            Say whether the tyre was hot at pit-in or already cooled. Cooled rubber looks different;
            blue oils show after cooling.
          </Text>
        </View>

        <Text style={styles.section}>Required photos</Text>
        {TYRE_PHOTO_SLOTS.map((slot) => {
          const att = photos[slot.id];
          return (
            <View key={slot.id} style={styles.slot}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotLabel}>
                  {slot.label}
                  {slot.required ? ' · required' : ' · optional'}
                </Text>
              </View>
              <Text style={styles.hint}>{slot.tip}</Text>
              {att ? (
                <View style={styles.thumbRow}>
                  <Image source={{ uri: att.uri }} style={styles.thumb} />
                  <View style={styles.slotActions}>
                    <TouchableOpacity style={styles.slotBtn} onPress={() => captureSlot(slot.id)}>
                      <Text style={styles.slotBtnText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.slotBtn} onPress={() => removeSlot(slot.id)}>
                      <Text style={styles.slotBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.captureBtn} onPress={() => captureSlot(slot.id)}>
                  <Text style={styles.captureBtnText}>Take photo / library</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={styles.section}>Facts that help diagnosis</Text>
        <Text style={styles.label}>Front or rear</Text>
        <ChipRow options={TYRE_AXLE_OPTIONS} value={state.axle} onChange={setAxle} />

        <Field
          label="Brand / model / compound"
          value={state.brandCompound}
          onChangeText={(t) => setState((prev) => ({ ...prev, brandCompound: t }))}
          placeholder="e.g. Pirelli Diablo Superbike SC2"
        />

        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label={`Hot pit-in pressure (${state.pressureUnit})`}
              value={state.hotPressure}
              onChangeText={(t) => setState((prev) => ({ ...prev, hotPressure: t }))}
              placeholder="Immediate after session"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.unitCol}>
            <Text style={styles.label}>Unit</Text>
            <ChipRow
              options={[
                { id: 'psi', label: 'psi' },
                { id: 'kPa', label: 'kPa' },
              ]}
              value={state.pressureUnit}
              onChange={(unit) => setState((prev) => ({ ...prev, pressureUnit: unit }))}
            />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label="Track temp"
              value={state.trackTemp}
              onChangeText={(t) => setState((prev) => ({ ...prev, trackTemp: t }))}
              placeholder="°C if known"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Ambient"
              value={state.ambientTemp}
              onChangeText={(t) => setState((prev) => ({ ...prev, ambientTemp: t }))}
              placeholder="optional"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>Session length</Text>
        <View style={styles.chipWrap}>
          {SESSION_LENGTH_OPTIONS.map((opt) => {
            const active = state.sessionLength === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() =>
                  setState((prev) => ({
                    ...prev,
                    sessionLength: prev.sessionLength === opt ? '' : opt,
                  }))
                }
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Field
          label="Or type session length"
          value={isSessionLengthPreset(state.sessionLength) ? '' : state.sessionLength}
          onChangeText={(t) => setState((prev) => ({ ...prev, sessionLength: t }))}
          placeholder="e.g. 8 laps"
        />

        <Text style={styles.label}>Tyre warmers</Text>
        <ChipRow
          options={WARMERS_OPTIONS}
          value={state.warmers}
          onChange={(warmers: WarmersUse) => setState((prev) => ({ ...prev, warmers }))}
        />

        <Text style={styles.label}>Photos taken</Text>
        <ChipRow
          options={PHOTO_TAKEN_OPTIONS}
          value={state.photoTaken}
          onChange={(photoTaken: PhotoTakenWhen) => setState((prev) => ({ ...prev, photoTaken }))}
        />

        <TrackPicker
          selectedTrackId={state.trackId}
          onSelect={(track: TrackDefinition) =>
            setState((prev) => ({ ...prev, trackId: track.id, trackName: track.name }))
          }
        />

        <Field
          label="What you felt (optional)"
          value={state.notes}
          onChangeText={(t) => setState((prev) => ({ ...prev, notes: t }))}
          placeholder="e.g. front washed mid-corner, rear spun on exit"
          multiline
        />

        {!canSend ? (
          <Text style={styles.hint}>Need Front or Rear and the overview photo to analyse.</Text>
        ) : missing.length ? (
          <Text style={styles.hint}>Coach will ask about: {missing.join(', ')}.</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={() => void handleSend()}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.sendBtnText}>Analyse with Bike Setup Coach</Text>
          )}
        </TouchableOpacity>
        {hasDraft && !sending ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={confirmResetAnalysis}
            activeOpacity={0.85}
          >
            <Text style={styles.clearBtnText}>Start new analysis</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  intro: { fontSize: 14, color: '#cbd5e1', lineHeight: 20, marginBottom: 16 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 10,
  },
  guideCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  guideLine: { fontSize: 13, color: '#e2e8f0', lineHeight: 19, marginBottom: 8 },
  guideNote: { fontSize: 13, color: '#93c5fd', lineHeight: 18, marginTop: 4 },
  slot: { marginBottom: 14 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotLabel: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  captureBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
  },
  captureBtnText: { color: '#fbbf24', fontSize: 15, fontWeight: '700' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#020617' },
  slotActions: { flex: 1, gap: 8 },
  slotBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 10,
    alignItems: 'center',
  },
  slotBtnText: { color: '#f8fafc', fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
  },
  inputMultiline: { minHeight: 88 },
  row2: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  unitCol: { width: 120 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  chipText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fbbf24' },
  hint: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 10 },
  sendBtn: {
    marginTop: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#334155' },
  sendBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  clearBtn: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearBtnText: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
});
