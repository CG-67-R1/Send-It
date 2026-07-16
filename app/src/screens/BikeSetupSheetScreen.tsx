import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  clearBikeSetupDaySheet,
  emptyBikeSetupDaySheet,
  formatBikeSetupSheetForAi,
  getBikeSetupDaySheet,
  saveBikeSetupDaySheet,
  type BikeSetupDaySheet,
} from '../storage/bikeSetupSheet';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getBikeSetupDaySheet();
      if (cancelled) return;
      skipNextSaveRef.current = true;
      setSheet(loaded);
      setLoading(false);
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
      void saveBikeSetupDaySheet(sheet).finally(() => setSaving(false));
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sheet, loading]);

  const setField = useCallback((key: FieldKey, value: string) => {
    setSheet((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onClear = useCallback(() => {
    Alert.alert('Clear Sheet', 'Clear all day setup values? This cannot be undone.', [
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
    ]);
  }, []);

  const onImport = useCallback(() => {
    const draft = formatBikeSetupSheetForAi(sheet);
    navigation.navigate('CoachChat', {
      mode: 'bikesetup',
      seedDraftMessage: draft,
    });
  }, [navigation, sheet]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

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
        <Text style={styles.hint}>
          Record start-of-day settings. Changes auto-save.
          {saving ? ' Saving…' : ''}
        </Text>

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
        <View style={styles.row}>
          <View style={styles.half}>
            <Field
              label="Front pressure"
              value={sheet.tyreFrontPressure}
              onChangeText={(t) => setField('tyreFrontPressure', t)}
              placeholder="psi / kPa"
            />
          </View>
          <View style={styles.half}>
            <Field
              label="Rear pressure"
              value={sheet.tyreRearPressure}
              onChangeText={(t) => setField('tyreRearPressure', t)}
              placeholder="psi / kPa"
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

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={onClear} activeOpacity={0.8}>
            <Text style={styles.clearButtonText}>Clear Sheet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={onImport} activeOpacity={0.8}>
            <Text style={styles.importButtonText}>Import to Bike Setup AI</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  half: {
    flex: 1,
  },
  actions: {
    marginTop: 24,
    gap: 12,
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
});
