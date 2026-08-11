import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import { getTrackMemoryLayout } from '../trackMemory/layouts';
import {
  formatTrackdayPrepSummary,
  saveTrackdayPrepToHistory,
} from '../storage/trackdayPrep';
import { createChatMessage } from '../utils/coachChat';
import { exportTrackdayPrepReport, printTrackdayPrepReport } from '../utils/exportTrackdayPrep';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TrackdayPrepReport'>;
type Route = RouteProp<RiderCoachStackParamList, 'TrackdayPrepReport'>;

export function TrackdayPrepReportScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { draft, reportText } = route.params;
  const [busy, setBusy] = useState<'save' | 'export' | 'print' | null>(null);

  const memoryAvailable = Boolean(getTrackMemoryLayout(draft.trackId));

  const onSave = useCallback(async () => {
    setBusy('save');
    try {
      await saveTrackdayPrepToHistory({
        ...draft,
        reportText,
        savedAt: Date.now(),
      });
      Alert.alert('Saved', 'Prep briefing saved on this device.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  }, [draft, reportText]);

  const onExport = useCallback(async () => {
    setBusy('export');
    try {
      await exportTrackdayPrepReport(draft, reportText);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  }, [draft, reportText]);

  const onPrint = useCallback(async () => {
    setBusy('print');
    try {
      await printTrackdayPrepReport(draft, reportText);
    } catch (e) {
      Alert.alert('Print failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  }, [draft, reportText]);

  const onContinueCoach = useCallback(() => {
    navigation.navigate('CoachChat', {
      mode: 'coach',
      seedMessages: [
        createChatMessage({
          role: 'user',
          content: `Trackday Prep for ${draft.trackName} on ${draft.dateIso}`,
        }),
        createChatMessage({ role: 'assistant', content: reportText }),
      ],
    });
  }, [navigation, draft.trackName, draft.dateIso, reportText]);

  const onTrackMemory = useCallback(() => {
    navigation.navigate('TrackMemory', { initialTrackId: draft.trackId });
  }, [navigation, draft.trackId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoRow}>
        <AppLogo size={COMPACT_LOGO_SIZE} />
      </View>
      <Text style={styles.title}>Trackday Prep</Text>
      <Text style={styles.sub}>
        {draft.trackName} · {draft.dateIso}
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{formatTrackdayPrepSummary(draft)}</Text>
      </View>

      <Text style={styles.reportBody}>{reportText}</Text>

      <View style={styles.actions}>
        <ActionButton label="Save" busy={busy === 'save'} disabled={!!busy} onPress={onSave} />
        <ActionButton
          label="Export"
          busy={busy === 'export'}
          disabled={!!busy}
          onPress={onExport}
        />
        <ActionButton label="Print" busy={busy === 'print'} disabled={!!busy} onPress={onPrint} />
        <ActionButton label="Continue in Coach" disabled={!!busy} onPress={onContinueCoach} />
        <ActionButton
          label="Play Track Memory"
          disabled={!!busy || !memoryAvailable}
          onPress={onTrackMemory}
          hint={!memoryAvailable ? 'Layout game not available for this track yet' : undefined}
        />
      </View>
    </ScrollView>
  );
}

function ActionButton({
  label,
  onPress,
  busy,
  disabled,
  hint,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.actionWrap}>
      <TouchableOpacity
        style={[styles.actionBtn, disabled && styles.actionDisabled]}
        disabled={disabled}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.actionText}>{label}</Text>
        )}
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  logoRow: { alignItems: 'center', marginBottom: 8 },
  title: {
    fontFamily: 'RaceSport',
    fontSize: 20,
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: { textAlign: 'center', color: '#94a3b8', marginBottom: 16, fontSize: 14 },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 16,
  },
  summaryText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  reportBody: { color: '#e2e8f0', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  actions: { gap: 10 },
  actionWrap: { marginBottom: 4 },
  actionBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  actionDisabled: { opacity: 0.45 },
  actionText: { fontFamily: 'RaceSport', fontSize: 16, color: '#0f172a' },
  hint: { marginTop: 6, fontSize: 12, color: '#94a3b8', textAlign: 'center' },
});
