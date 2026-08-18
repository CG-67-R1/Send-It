import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PrivateSetupBanner } from '../components/PrivateSetupBanner';
import {
  bikeSetupSheetShareTitle,
  clearBikeSetupDaySheet,
  compareBikeSetupSheets,
  deleteSessionFromHistory,
  emptyBikeSetupDaySheet,
  formatBikeSetupSheetAsText,
  formatBikeSetupSheetForAi,
  formatFavouriteBikeFromSheet,
  getBikeSetupDaySheet,
  getSessionHistory,
  loadSessionFromHistory,
  parseFavouriteBike,
  saveBikeSetupDaySheet,
  saveSessionToHistory,
  sheetHasBikeIdentity,
  type BikeSetupDaySheet,
} from '../storage/bikeSetupSheet';
import { getOnboardingAnswers, updateOnboardingAnswers } from '../storage/onboarding';
import { shareBikeSetupAsText } from '../utils/shareBikeSetup';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

const SAVE_DEBOUNCE_MS = 400;

type FieldKey = Exclude<keyof BikeSetupDaySheet, 'updatedAt'>;

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'BikeSetupSheet'>;

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
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
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export function BikeSetupSheetScreen() {
  const navigation = useNavigation<Nav>();
  const [sheet, setSheet] = useState<BikeSetupDaySheet>(() => emptyBikeSetupDaySheet());
  const [history, setHistory] = useState<BikeSetupDaySheet[]>([]);
  const [compareUpdatedAt, setCompareUpdatedAt] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(true);

  const compareTarget = useMemo(
    () => (compareUpdatedAt == null ? null : history.find((item) => item.updatedAt === compareUpdatedAt) ?? null),
    [compareUpdatedAt, history]
  );
  const compareDiffs = useMemo(
    () => (compareTarget ? compareBikeSetupSheets(sheet, compareTarget) : []),
    [sheet, compareTarget]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, savedHistory, onboarding] = await Promise.all([
        getBikeSetupDaySheet(),
        getSessionHistory(),
        getOnboardingAnswers(),
      ]);
      if (cancelled) return;

      let next = loaded;
      if (!sheetHasBikeIdentity(loaded)) {
        const favourite = onboarding?.favouriteBike?.trim();
        if (favourite && favourite.toLowerCase() !== 'my bike') {
          next = { ...loaded, ...parseFavouriteBike(favourite) };
        }
      }

      skipNextSaveRef.current = true;
      setSheet(next);
      setHistory(savedHistory);
      setLoading(false);

      // Persist prefilled bike identity so the next open keeps it without re-parsing.
      if (next !== loaded) {
        void saveBikeSetupDaySheet(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      void (async () => {
        try {
          await saveBikeSetupDaySheet(sheet);
          const favouriteBike = formatFavouriteBikeFromSheet(sheet);
          if (favouriteBike) {
            await updateOnboardingAnswers({ favouriteBike });
          }
        } finally {
          setSaving(false);
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sheet, loading]);

  const setField = useCallback((key: FieldKey, value: string) => {
    setSheet((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onClear = useCallback(() => {
    Alert.alert(
      'Clear Sheet',
      'Clear session values? Bike year, make, and model are kept for next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const empty = await clearBikeSetupDaySheet();
              skipNextSaveRef.current = true;
              setSheet(empty);
            })();
          },
        },
      ]
    );
  }, []);

  const onImport = useCallback(() => {
    const draft = formatBikeSetupSheetForAi(sheet);
    const preview = draft.length > 500 ? `${draft.slice(0, 500)}…` : draft;
    Alert.alert('Import preview', preview, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () =>
          navigation.navigate('CoachChat', {
            mode: 'bikesetup',
            seedDraftMessage: draft,
          }),
      },
    ]);
  }, [navigation, sheet]);

  const onSaveSession = useCallback(() => {
    void saveSessionToHistory(sheet)
      .then((next) => {
        setHistory(next);
        Alert.alert(
          'Setup saved privately',
          'A snapshot was saved on this device. Use it later to load or compare.'
        );
      })
      .catch(() => Alert.alert('Save failed', 'The session snapshot could not be saved.'));
  }, [sheet]);

  const onShareSheet = useCallback(
    async (target: BikeSetupDaySheet) => {
      if (sharing) return;
      setSharing(true);
      try {
        await shareBikeSetupAsText({
          title: bikeSetupSheetShareTitle(target),
          body: formatBikeSetupSheetAsText(target),
        });
      } catch (e) {
        Alert.alert('Share failed', e instanceof Error ? e.message : 'Could not open share sheet.');
      } finally {
        setSharing(false);
      }
    },
    [sharing]
  );

  const onLoadSession = useCallback((updatedAt: number) => {
    Alert.alert('Load saved setup', 'Replace the current sheet with this private snapshot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Load',
        onPress: () => {
          void loadSessionFromHistory(updatedAt).then((loaded) => {
            if (!loaded) return;
            skipNextSaveRef.current = true;
            setSheet(loaded);
            void saveBikeSetupDaySheet(loaded);
          });
        },
      },
    ]);
  }, []);

  const onDeleteSession = useCallback((updatedAt: number) => {
    Alert.alert('Delete saved setup', 'Remove this snapshot from private local storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteSessionFromHistory(updatedAt).then((next) => {
            setHistory(next);
            setCompareUpdatedAt((prev) => (prev === updatedAt ? null : prev));
          });
        },
      },
    ]);
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PrivateSetupBanner detail="Save a session snapshot to keep a private copy for later reference or side-by-side comparison." />

        <Text style={styles.hint}>
          Record start-of-day settings. Changes auto-save on this device.
          {saving ? ' Saving…' : ''}
        </Text>

        <Text style={styles.sectionTitle}>Bike</Text>
        <View style={styles.row}>
          <View style={styles.yearCol}>
            <Field
              label="Year"
              value={sheet.bikeYear}
              onChangeText={(t) => setField('bikeYear', t)}
              placeholder="e.g. 2020"
            />
          </View>
          <View style={styles.half}>
            <Field
              label="Make"
              value={sheet.bikeMake}
              onChangeText={(t) => setField('bikeMake', t)}
              placeholder="e.g. Yamaha"
            />
          </View>
        </View>
        <Field
          label="Model"
          value={sheet.bikeModel}
          onChangeText={(t) => setField('bikeModel', t)}
          placeholder="e.g. YZF-R6"
        />

        <Text style={styles.sectionTitle}>Session</Text>
        <Field
          label="Date"
          value={sheet.dateIso}
          onChangeText={(t) => setField('dateIso', t)}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Track"
          value={sheet.trackName}
          onChangeText={(t) => setField('trackName', t)}
          placeholder="e.g. Phillip Island"
        />
        <Field
          label="Session number"
          value={sheet.sessionNumber ?? ''}
          onChangeText={(t) => setField('sessionNumber', t)}
          placeholder="e.g. 2"
        />
        <Field
          label="Session notes"
          value={sheet.sessionNotes}
          onChangeText={(t) => setField('sessionNotes', t)}
          placeholder="Weather, tyre compound, session type…"
          multiline
        />

        <Text style={styles.sectionTitle}>Goals for today</Text>
        <Text style={styles.coachPrompt}>
          What are your goals for today — lap times, consistency, a corner, or bike feel?
        </Text>
        <Field
          label="My goals"
          value={sheet.goalsForToday}
          onChangeText={(t) => setField('goalsForToday', t)}
          placeholder="What do you want to work on?"
          multiline
        />

        <Text style={styles.sectionTitle}>Tyres</Text>
        <View style={styles.unitToggle}>
          {(['psi', 'kPa'] as const).map((unit) => (
            <TouchableOpacity
              key={unit}
              style={[styles.unitButton, sheet.pressureUnit === unit && styles.unitButtonActive]}
              onPress={() => setSheet((prev) => ({ ...prev, pressureUnit: unit }))}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitButtonText,
                  sheet.pressureUnit === unit && styles.unitButtonTextActive,
                ]}
              >
                {unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="Tyre brand / compound"
          value={sheet.tyreBrandCompound}
          onChangeText={(t) => setField('tyreBrandCompound', t)}
          placeholder="e.g. Pirelli SC1 / SC2"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label={`Front cold (${sheet.pressureUnit})`}
              value={sheet.tyreFrontPressureCold}
              onChangeText={(t) => setField('tyreFrontPressureCold', t)}
              placeholder={sheet.pressureUnit}
            />
          </View>
          <View style={styles.half}>
            <Field
              label={`Front hot (${sheet.pressureUnit})`}
              value={sheet.tyreFrontPressureHot}
              onChangeText={(t) => setField('tyreFrontPressureHot', t)}
              placeholder={sheet.pressureUnit}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label={`Rear cold (${sheet.pressureUnit})`}
              value={sheet.tyreRearPressureCold}
              onChangeText={(t) => setField('tyreRearPressureCold', t)}
              placeholder={sheet.pressureUnit}
            />
          </View>
          <View style={styles.half}>
            <Field
              label={`Rear hot (${sheet.pressureUnit})`}
              value={sheet.tyreRearPressureHot}
              onChangeText={(t) => setField('tyreRearPressureHot', t)}
              placeholder={sheet.pressureUnit}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Front suspension</Text>
        <Field
          label="Sag"
          value={sheet.frontSag}
          onChangeText={(t) => setField('frontSag', t)}
          placeholder="mm"
        />
        <Field
          label="Preload"
          value={sheet.frontPreload}
          onChangeText={(t) => setField('frontPreload', t)}
          placeholder="turns / rings"
        />
        <Field
          label="Compression"
          value={sheet.frontCompression}
          onChangeText={(t) => setField('frontCompression', t)}
          placeholder="clicks from closed"
        />
        <Field
          label="Rebound"
          value={sheet.frontRebound}
          onChangeText={(t) => setField('frontRebound', t)}
          placeholder="clicks from closed"
        />
        <Field
          label="Ride height"
          value={sheet.frontRideHeight}
          onChangeText={(t) => setField('frontRideHeight', t)}
          placeholder="mm / spacer"
        />

        <Text style={styles.sectionTitle}>Rear suspension</Text>
        <Field
          label="Sag"
          value={sheet.rearSag}
          onChangeText={(t) => setField('rearSag', t)}
          placeholder="mm"
        />
        <Field
          label="Preload"
          value={sheet.rearPreload}
          onChangeText={(t) => setField('rearPreload', t)}
          placeholder="turns / rings"
        />
        <Field
          label="Compression"
          value={sheet.rearCompression}
          onChangeText={(t) => setField('rearCompression', t)}
          placeholder="clicks from closed"
        />
        <Field
          label="Rebound"
          value={sheet.rearRebound}
          onChangeText={(t) => setField('rearRebound', t)}
          placeholder="clicks from closed"
        />
        <Field
          label="Ride height"
          value={sheet.rearRideHeight}
          onChangeText={(t) => setField('rearRideHeight', t)}
          placeholder="mm / spacer"
        />

        <Text style={styles.sectionTitle}>Extended session</Text>
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label="Ambient temperature"
              value={sheet.ambientTemp}
              onChangeText={(t) => setField('ambientTemp', t)}
              placeholder="e.g. 24 °C"
            />
          </View>
          <View style={styles.half}>
            <Field
              label="Track temperature"
              value={sheet.trackTemp}
              onChangeText={(t) => setField('trackTemp', t)}
              placeholder="e.g. 38 °C"
            />
          </View>
        </View>
        <Field
          label="Fuel level"
          value={sheet.fuelLevel}
          onChangeText={(t) => setField('fuelLevel', t)}
          placeholder="Litres or percentage"
        />
        <Field
          label="Gearing"
          value={sheet.gearing}
          onChangeText={(t) => setField('gearing', t)}
          placeholder="Front / rear sprockets"
        />
        <Field
          label="Lap times"
          value={sheet.lapTimes}
          onChangeText={(t) => setField('lapTimes', t)}
          placeholder="Best, average, consistency…"
          multiline
        />
        <Field
          label="Changes made"
          value={sheet.changesMade}
          onChangeText={(t) => setField('changesMade', t)}
          placeholder="What changed for this session?"
          multiline
        />
        <Field
          label="Result"
          value={sheet.changeResult}
          onChangeText={(t) => setField('changeResult', t)}
          placeholder="How did the change affect the bike?"
          multiline
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveSessionButton} onPress={onSaveSession} activeOpacity={0.8}>
            <Text style={styles.saveSessionButtonText}>Save privately</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => void onShareSheet(sheet)}
            activeOpacity={0.8}
            disabled={sharing}
          >
            <Text style={styles.shareButtonText}>
              {sharing ? 'Opening share…' : 'Share as text'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={onClear} activeOpacity={0.8}>
            <Text style={styles.clearButtonText}>Clear Sheet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={onImport} activeOpacity={0.8}>
            <Text style={styles.importButtonText}>Import to Bike Setup AI</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Saved setups (private)</Text>
        <Text style={styles.historyHint}>
          Snapshots stay on this device. Load one to restore it, Compare to see what changed, or Share
          via Messages / WhatsApp / email.
        </Text>
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>No saved setups yet. Tap Save privately after a session.</Text>
        ) : (
          [...history].reverse().map((item) => {
            const comparing = compareUpdatedAt === item.updatedAt;
            return (
              <View key={item.updatedAt} style={styles.historyItem}>
                <TouchableOpacity
                  style={styles.historyLoad}
                  onPress={() => onLoadSession(item.updatedAt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.historyTitle}>
                    {item.dateIso || 'No date'} · {item.trackName || 'No track'}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Saved {new Date(item.updatedAt).toLocaleString()}
                  </Text>
                </TouchableOpacity>
                <View style={styles.historyActions}>
                  <TouchableOpacity
                    style={styles.historyAction}
                    onPress={() =>
                      setCompareUpdatedAt((prev) => (prev === item.updatedAt ? null : item.updatedAt))
                    }
                    accessibilityLabel="Compare with current sheet"
                  >
                    <Text style={[styles.historyActionText, comparing && styles.historyActionActive]}>
                      {comparing ? 'Hide' : 'Compare'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.historyAction}
                    onPress={() => void onShareSheet(item)}
                    accessibilityLabel="Share saved setup as text"
                  >
                    <Text style={styles.historyActionText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.historyAction}
                    onPress={() => onDeleteSession(item.updatedAt)}
                    accessibilityLabel="Delete saved setup"
                  >
                    <Text style={styles.historyDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {compareTarget ? (
          <View style={styles.compareBox}>
            <Text style={styles.compareTitle}>
              Compare current vs{' '}
              {compareTarget.trackName.trim() || compareTarget.dateIso || 'saved setup'}
            </Text>
            {compareDiffs.length === 0 ? (
              <Text style={styles.compareSame}>No differences — current sheet matches this save.</Text>
            ) : (
              compareDiffs.map((diff) => (
                <View key={String(diff.key)} style={styles.compareRow}>
                  <Text style={styles.compareLabel}>{diff.label}</Text>
                  <Text style={styles.compareValues}>
                    Now: {diff.current}
                    {'\n'}
                    Saved: {diff.saved}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  hint: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
    marginBottom: 8,
  },
  coachPrompt: {
    fontSize: 14,
    color: '#fbbf24',
    lineHeight: 20,
    marginBottom: 8,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  yearCol: {
    width: 110,
  },
  half: {
    flex: 1,
  },
  unitToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  unitButton: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  unitButtonActive: {
    backgroundColor: '#f59e0b',
  },
  unitButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  unitButtonTextActive: {
    color: '#0f172a',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  saveSessionButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveSessionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  shareButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#93c5fd',
  },
  clearButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  importButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyHint: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  emptyHistory: {
    color: '#64748b',
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    marginBottom: 10,
  },
  historyLoad: {
    flex: 1,
    padding: 14,
  },
  historyTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  historyMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  historyActions: {
    paddingRight: 8,
    gap: 2,
    alignItems: 'flex-end',
  },
  historyAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  historyActionText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
  },
  historyActionActive: {
    color: '#fbbf24',
  },
  historyDeleteText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  compareBox: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
  },
  compareTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  compareSame: {
    color: '#86efac',
    fontSize: 13,
  },
  compareRow: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  compareLabel: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  compareValues: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
});
