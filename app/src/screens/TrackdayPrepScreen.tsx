import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { PrivateSetupBanner } from '../components/PrivateSetupBanner';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import { getTrackCoords } from '../location/trackGeofenceMatch';
import { fetchTrackForecastForDate } from '../location/trackWeather';
import { getOnboardingAnswers } from '../storage/onboarding';
import {
  emptyTrackdayPrepDraft,
  formatTrackdayPrepForAi,
  RIDER_LEVEL_OPTIONS,
  saveTrackdayPrepDraft,
  trackPrepLevelFromActivity,
  trackdayPrepIsComplete,
  TYRE_CONDITION_OPTIONS,
  TYRE_TYPE_OPTIONS,
  type RiderLevel,
  type TrackdayPrepDraft,
  type TyreCondition,
  type TyreType,
} from '../storage/trackdayPrep';
import { sendCoachChat } from '../utils/coachChat';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TrackdayPrep'>;
type Route = RouteProp<RiderCoachStackParamList, 'TrackdayPrep'>;

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T | '';
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function TrackdayPrepScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { trackId, trackName, otherContext } = route.params;

  const [draft, setDraft] = useState<TrackdayPrepDraft>(() =>
    emptyTrackdayPrepDraft({ trackId, trackName, otherContext })
  );
  const [forecastLoading, setForecastLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      trackId,
      trackName,
      otherContext,
    }));
  }, [trackId, trackName, otherContext]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const answers = await getOnboardingAnswers();
      if (cancelled || !answers) return;
      setDraft((prev) => ({
        ...prev,
        bike: prev.bike.trim() ? prev.bike : answers.favouriteBike?.trim() || prev.bike,
        riderLevel: prev.riderLevel || trackPrepLevelFromActivity(answers.activity),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const coords = getTrackCoords(trackId);
    const dateIso = draft.dateIso.trim();
    if (!coords || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      setDraft((prev) => (prev.forecastSummary ? { ...prev, forecastSummary: '' } : prev));
      return;
    }
    setForecastLoading(true);
    void (async () => {
      const weather = await fetchTrackForecastForDate(coords.lat, coords.lng, dateIso);
      if (cancelled) return;
      setDraft((prev) => ({
        ...prev,
        forecastSummary: weather?.summary ?? '',
      }));
      setForecastLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId, draft.dateIso]);

  const patch = useCallback((partial: Partial<TrackdayPrepDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const canGo = useMemo(() => trackdayPrepIsComplete(draft), [draft]);

  const onLetsGo = useCallback(async () => {
    if (!trackdayPrepIsComplete(draft) || generating) return;
    setGenerating(true);
    try {
      await saveTrackdayPrepDraft(draft);
      const prompt = formatTrackdayPrepForAi(draft);
      const result = await sendCoachChat(prompt, 'coach', []);
      if (!result.ok) {
        Alert.alert('Could not generate briefing', result.error, [{ text: 'OK' }]);
        return;
      }
      navigation.navigate('TrackdayPrepReport', {
        draft,
        reportText: result.reply,
      });
    } catch (e) {
      Alert.alert(
        'Could not generate briefing',
        e instanceof Error ? e.message : 'Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  }, [draft, generating, navigation]);

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <AppLogo size={COMPACT_LOGO_SIZE} />
        </View>
        <PrivateSetupBanner detail="Your prep stays on this device until you export or print." />

        <View style={styles.trackCard}>
          <Text style={styles.trackLabel}>Track</Text>
          <Text style={styles.trackName}>{trackName}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TrackPrep')} activeOpacity={0.7}>
            <Text style={styles.changeTrack}>Change track</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date of track day (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={draft.dateIso}
            onChangeText={(dateIso) => patch({ dateIso })}
            placeholder="2026-08-15"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.forecast}>
            {forecastLoading
              ? 'Loading forecast…'
              : draft.forecastSummary
                ? `Forecast: ${draft.forecastSummary}`
                : 'Forecast: not available for this date/location'}
          </Text>
        </View>

        <ChipRow
          label="Rider level"
          options={RIDER_LEVEL_OPTIONS}
          value={draft.riderLevel}
          onChange={(riderLevel: RiderLevel) => patch({ riderLevel })}
        />
        <Text style={styles.levelHint}>
          Filled from how you ride so the briefing matches you. Change it for this day, or anytime
          in Settings.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Bike</Text>
          <TextInput
            style={styles.input}
            value={draft.bike}
            onChangeText={(bike) => patch({ bike })}
            placeholder="e.g. Yamaha R6, Ducati V2"
            placeholderTextColor="#64748b"
          />
        </View>

        <ChipRow
          label="Tyre type"
          options={TYRE_TYPE_OPTIONS}
          value={draft.tyreType}
          onChange={(tyreType: TyreType) => patch({ tyreType })}
        />

        <ChipRow
          label="Tyre condition"
          options={TYRE_CONDITION_OPTIONS}
          value={draft.tyreCondition}
          onChange={(tyreCondition: TyreCondition) => patch({ tyreCondition })}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={draft.notes}
            onChangeText={(notes) => patch({ notes })}
            placeholder="Goals, concerns, group, first time here…"
            placeholderTextColor="#64748b"
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.cta, (!canGo || generating) && styles.ctaDisabled]}
          disabled={!canGo || generating}
          onPress={() => void onLetsGo()}
          activeOpacity={0.85}
        >
          {generating ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.ctaText}>Let&apos;s Go!</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  logoRow: { alignItems: 'center', marginBottom: 8 },
  trackCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 16,
  },
  trackLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  trackName: { fontSize: 18, color: '#f8fafc', fontWeight: '700' },
  changeTrack: { marginTop: 8, color: '#38bdf8', fontSize: 14, fontWeight: '600' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
  },
  inputMultiline: { minHeight: 96 },
  forecast: { marginTop: 8, fontSize: 13, color: '#93c5fd', lineHeight: 18 },
  levelHint: { marginTop: -8, marginBottom: 16, fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  chipActive: { borderColor: '#f59e0b', backgroundColor: '#422006' },
  chipText: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fde68a' },
  cta: {
    marginTop: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: {
    fontFamily: 'RaceSport',
    fontSize: 18,
    color: '#0f172a',
  },
});
