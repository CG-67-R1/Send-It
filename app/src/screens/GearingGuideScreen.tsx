import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PrivateSetupBanner } from '../components/PrivateSetupBanner';
import { TrackPicker } from '../components/TrackPicker';
import {
  ENGINE_CONFIG_OPTIONS,
  FRONT_TEETH_MAX,
  FRONT_TEETH_MIN,
  GEARING_GOALS,
  REAR_TEETH_MAX,
  REAR_TEETH_MIN,
  filterBikePowerbandCatalog,
  formatGearingForCoach,
  formatRatio,
  formatSignedPct,
  getBikePowerbandById,
  matchBikePowerbandRef,
  nearbyPairs,
  parseSprocketPair,
  parseTeeth,
  resolveBikeProvenance,
  type BikePowerbandRef,
  type EngineConfig,
  type GearingGoalId,
} from '../calc/gearing';
import type { TrackDefinition } from '../data/tracks';
import {
  emptyGearingGuideState,
  loadGearingGuideState,
  saveGearingGuideState,
  type GearingGuideState,
} from '../storage/gearingGuide';
import { getBikeSetupDaySheet, parseFavouriteBike } from '../storage/bikeSetupSheet';
import { loadBikeBalanceState } from '../storage/bikeBalance';
import { getOnboardingAnswers } from '../storage/onboarding';
import { getTrackPrepSelectedTrack } from '../storage/trackdayPrep';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'GearingGuide'>;

const BIKE_FIELDS = [
  'manufacturer',
  'family',
  'yearFrom',
  'yearTo',
  'capacityCc',
  'engineConfig',
  'peakTorqueRpm',
  'peakPowerRpm',
  'powerbandRpmFrom',
  'powerbandRpmTo',
] as const;

type BikeField = (typeof BIKE_FIELDS)[number];

function catalogToFields(row: BikePowerbandRef): Pick<GearingGuideState, BikeField> {
  return {
    manufacturer: row.manufacturer,
    family: row.family,
    yearFrom: String(row.yearFrom),
    yearTo: String(row.yearTo),
    capacityCc: String(row.capacityCc),
    engineConfig: row.engineConfig,
    peakTorqueRpm: row.peakTorqueRpm != null ? String(row.peakTorqueRpm) : '',
    peakPowerRpm: row.peakPowerRpm != null ? String(row.peakPowerRpm) : '',
    powerbandRpmFrom: row.powerbandRpmFrom != null ? String(row.powerbandRpmFrom) : '',
    powerbandRpmTo: row.powerbandRpmTo != null ? String(row.powerbandRpmTo) : '',
  };
}

function applyCatalog(state: GearingGuideState, row: BikePowerbandRef): GearingGuideState {
  const next = catalogToFields(row);
  const merged: GearingGuideState = { ...state, catalogId: row.id };
  for (const field of BIKE_FIELDS) {
    if (state.overriddenFields.includes(field)) continue;
    merged[field] = next[field] as never;
  }
  return merged;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

function teethRange(min: number, max: number): number[] {
  const values: number[] = [];
  for (let n = min; n <= max; n += 1) values.push(n);
  return values;
}

function TeethDropdown({
  label,
  value,
  min,
  max,
  onChange,
  placeholder,
  allowEmpty,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (next: string) => void;
  placeholder: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => teethRange(min, max), [min, max]);
  const selected = value.trim();

  return (
    <View style={styles.teethPickerWrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.teethTrigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[styles.teethTriggerText, !selected && styles.teethPlaceholder]}>
          {selected ? `${selected}T` : placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {allowEmpty ? (
                <TouchableOpacity
                  style={[styles.option, !selected && styles.optionSelected]}
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>None</Text>
                </TouchableOpacity>
              ) : null}
              {options.map((n) => {
                const active = selected === String(n);
                return (
                  <TouchableOpacity
                    key={n}
                    style={[styles.option, active && styles.optionSelected]}
                    onPress={() => {
                      onChange(String(n));
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{n}T</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function GearingGuideScreen() {
  const navigation = useNavigation<Nav>();
  const [state, setState] = useState<GearingGuideState>(() => emptyGearingGuideState());
  const [ready, setReady] = useState(false);
  const [bikePickerOpen, setBikePickerOpen] = useState(false);
  const [bikeQuery, setBikeQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadGearingGuideState();
      const [sheet, balance, onboarding, trackSel] = await Promise.all([
        getBikeSetupDaySheet(),
        loadBikeBalanceState(),
        getOnboardingAnswers(),
        getTrackPrepSelectedTrack(),
      ]);
      if (cancelled) return;

      let next = saved;
      if (!next.catalogId && !next.manufacturer.trim() && !next.family.trim()) {
        const identity = sheetHasText(sheet.bikeMake, sheet.bikeModel)
          ? `${sheet.bikeYear} ${sheet.bikeMake} ${sheet.bikeModel}`.trim()
          : onboarding?.favouriteBike ?? '';
        const matched = identity ? matchBikePowerbandRef(identity) : null;
        if (matched) {
          next = applyCatalog(next, matched);
        } else if (identity) {
          const parsed = parseFavouriteBike(identity);
          next = {
            ...next,
            manufacturer: parsed.bikeMake,
            family: parsed.bikeModel,
            yearFrom: parsed.bikeYear,
            yearTo: parsed.bikeYear,
          };
        }
      }

      if (!next.frontTeeth && !next.rearTeeth) {
        const fromBalance =
          balance.inputs.frontSprocketTeeth != null && balance.inputs.rearSprocketTeeth != null
            ? { front: balance.inputs.frontSprocketTeeth, rear: balance.inputs.rearSprocketTeeth }
            : null;
        const fromSheet = parseSprocketPair(sheet.gearing);
        const pair = fromBalance ?? fromSheet;
        if (pair) {
          next = { ...next, frontTeeth: String(pair.front), rearTeeth: String(pair.rear) };
        }
      }

      if (!next.trackId && trackSel) {
        next = { ...next, trackId: trackSel.trackId, trackName: trackSel.trackName };
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
    void saveGearingGuideState(state);
  }, [ready, state]);

  const setBikeField = useCallback((field: BikeField, value: string) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
      overriddenFields: prev.overriddenFields.includes(field)
        ? prev.overriddenFields
        : [...prev.overriddenFields, field],
    }));
  }, []);

  const selectCatalog = useCallback((row: BikePowerbandRef) => {
    setState((prev) => applyCatalog({ ...prev, overriddenFields: [] }, row));
    setBikePickerOpen(false);
    setBikeQuery('');
  }, []);

  const useManualBike = useCallback(() => {
    setState((prev) => ({ ...prev, catalogId: null, overriddenFields: [] }));
    setBikePickerOpen(false);
    setBikeQuery('');
  }, []);

  const catalog = state.catalogId ? getBikePowerbandById(state.catalogId) : null;
  const provenance = resolveBikeProvenance({
    manufacturer: state.manufacturer,
    family: state.family,
    yearFrom: state.yearFrom,
    yearTo: state.yearTo,
    capacityCc: state.capacityCc,
    engineConfig: state.engineConfig,
    peakTorqueRpm: state.peakTorqueRpm,
    peakPowerRpm: state.peakPowerRpm,
    powerbandRpmFrom: state.powerbandRpmFrom,
    powerbandRpmTo: state.powerbandRpmTo,
    catalog,
    front: 16,
    rear: 43,
    newFront: null,
    newRear: null,
    goalId: 'more_drive',
    requestText: '',
    trackName: '',
  });

  const front = parseTeeth(state.frontTeeth);
  const rear = parseTeeth(state.rearTeeth);
  const newFront = parseTeeth(state.newFrontTeeth);
  const newRear = parseTeeth(state.newRearTeeth);
  const ratioReady =
    front != null &&
    rear != null &&
    front >= FRONT_TEETH_MIN &&
    front <= FRONT_TEETH_MAX &&
    rear >= REAR_TEETH_MIN &&
    rear <= REAR_TEETH_MAX;
  const currentRatio = ratioReady ? rear / front : null;
  const nearby = ratioReady ? nearbyPairs(front, rear) : [];
  const bikeReady = Boolean(state.manufacturer.trim() || state.family.trim() || state.catalogId);
  const canSend = bikeReady && ratioReady && state.goalId != null;

  const filteredBikes = useMemo(() => filterBikePowerbandCatalog(bikeQuery), [bikeQuery]);

  const sendToCoach = useCallback(() => {
    if (!canSend || front == null || rear == null || state.goalId == null) return;
    const seed = formatGearingForCoach({
      manufacturer: state.manufacturer,
      family: state.family,
      yearFrom: state.yearFrom,
      yearTo: state.yearTo,
      capacityCc: state.capacityCc,
      engineConfig: state.engineConfig,
      peakTorqueRpm: state.peakTorqueRpm,
      peakPowerRpm: state.peakPowerRpm,
      powerbandRpmFrom: state.powerbandRpmFrom,
      powerbandRpmTo: state.powerbandRpmTo,
      provenance,
      catalog,
      front,
      rear,
      newFront: newFront != null && newRear != null ? newFront : null,
      newRear: newFront != null && newRear != null ? newRear : null,
      goalId: state.goalId,
      requestText: state.requestText,
      trackName: state.trackName,
    });
    navigation.navigate('CoachChat', { mode: 'bikesetup', seedDraftMessage: seed });
  }, [canSend, catalog, front, navigation, newFront, newRear, provenance, rear, state]);

  if (!ready) return <View style={styles.container} />;

  const provenanceLabel =
    provenance === 'catalog' ? 'Catalog specs' : provenance === 'user_override' ? 'You overrode catalog specs' : 'Manual bike';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PrivateSetupBanner detail="Gearing inputs stay on this device until you send a brief to Bike Setup Coach." />
        <Text style={styles.intro}>
          Enter the bike, current sprockets, and the problem you want to fix. Nearby ratios are a
          helper — Bike Setup Coach writes the recommendation.
        </Text>

        <Text style={styles.section}>Bike</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setBikePickerOpen(true)} activeOpacity={0.8}>
          <Text style={styles.pickerText}>
            {state.family || state.manufacturer
              ? `${state.manufacturer} ${state.family}`.trim()
              : 'Select a bike…'}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.badge}>{provenanceLabel}</Text>
        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label="Manufacturer"
              value={state.manufacturer}
              onChangeText={(t) => setBikeField('manufacturer', t)}
              placeholder="Yamaha"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Model"
              value={state.family}
              onChangeText={(t) => setBikeField('family', t)}
              placeholder="YZF-R6"
            />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label="Year from"
              value={state.yearFrom}
              onChangeText={(t) => setBikeField('yearFrom', t)}
              placeholder="2017"
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Year to"
              value={state.yearTo}
              onChangeText={(t) => setBikeField('yearTo', t)}
              placeholder="2025"
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label="Capacity (cc)"
              value={state.capacityCc}
              onChangeText={(t) => setBikeField('capacityCc', t)}
              placeholder="599"
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text style={styles.label}>Engine</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {ENGINE_CONFIG_OPTIONS.map((opt) => {
            const active = state.engineConfig === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setBikeField('engineConfig', opt.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label="Peak torque RPM"
              value={state.peakTorqueRpm}
              onChangeText={(t) => setBikeField('peakTorqueRpm', t)}
              placeholder="Leave blank if unknown"
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Peak power RPM"
              value={state.peakPowerRpm}
              onChangeText={(t) => setBikeField('peakPowerRpm', t)}
              placeholder="Leave blank if unknown"
              keyboardType="number-pad"
            />
          </View>
        </View>
        <View style={styles.row2}>
          <View style={styles.flex}>
            <Field
              label="Powerband from"
              value={state.powerbandRpmFrom}
              onChangeText={(t) => setBikeField('powerbandRpmFrom', t)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Powerband to"
              value={state.powerbandRpmTo}
              onChangeText={(t) => setBikeField('powerbandRpmTo', t)}
              keyboardType="number-pad"
            />
          </View>
        </View>
        {!state.peakPowerRpm.trim() ? (
          <Text style={styles.hint}>Peak power RPM unknown — Coach must not invent it.</Text>
        ) : null}

        <Text style={styles.section}>Current gearing</Text>
        <View style={styles.row2}>
          <TeethDropdown
            label="Front sprocket"
            value={state.frontTeeth}
            min={FRONT_TEETH_MIN}
            max={FRONT_TEETH_MAX}
            placeholder="Select front…"
            onChange={(t) => setState((prev) => ({ ...prev, frontTeeth: t }))}
          />
          <TeethDropdown
            label="Rear sprocket"
            value={state.rearTeeth}
            min={REAR_TEETH_MIN}
            max={REAR_TEETH_MAX}
            placeholder="Select rear…"
            onChange={(t) => setState((prev) => ({ ...prev, rearTeeth: t }))}
          />
        </View>
        <Text style={styles.ratio}>
          Current ratio:{' '}
          {currentRatio != null && front != null && rear != null
            ? `${formatRatio(currentRatio)}  (${front}/${rear})`
            : '—'}
        </Text>
        <Text style={styles.hint}>Optional pair you are considering:</Text>
        <View style={styles.row2}>
          <TeethDropdown
            label="New front"
            value={state.newFrontTeeth}
            min={FRONT_TEETH_MIN}
            max={FRONT_TEETH_MAX}
            placeholder="None"
            allowEmpty
            onChange={(t) => setState((prev) => ({ ...prev, newFrontTeeth: t }))}
          />
          <TeethDropdown
            label="New rear"
            value={state.newRearTeeth}
            min={REAR_TEETH_MIN}
            max={REAR_TEETH_MAX}
            placeholder="None"
            allowEmpty
            onChange={(t) => setState((prev) => ({ ...prev, newRearTeeth: t }))}
          />
        </View>

        <Text style={styles.section}>What are you trying to fix?</Text>
        <View style={styles.chipWrap}>
          {GEARING_GOALS.map((goal) => {
            const active = state.goalId === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.chip, styles.chipWrapItem, active && styles.chipActive]}
                onPress={() =>
                  setState((prev) => ({
                    ...prev,
                    goalId: prev.goalId === goal.id ? null : (goal.id as GearingGoalId),
                  }))
                }
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{goal.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Field
          label="Your request (optional)"
          value={state.requestText}
          onChangeText={(t) => setState((prev) => ({ ...prev, requestText: t }))}
          placeholder="e.g. keep 6th for the main straight"
        />

        <TrackPicker
          selectedTrackId={state.trackId}
          onSelect={(track: TrackDefinition) =>
            setState((prev) => ({ ...prev, trackId: track.id, trackName: track.name }))
          }
        />

        {nearby.length ? (
          <>
            <Text style={styles.section}>Nearby ratios</Text>
            <Text style={styles.hint}>
              Rear is the fine step. One front tooth is about 2–3 rear teeth. Drive % up = shorter
              (more acceleration, less top speed).
            </Text>
            <View style={styles.tableHead}>
              <Text style={[styles.cell, styles.cellHead, styles.cellPair]}>F/R</Text>
              <Text style={[styles.cell, styles.cellHead]}>Ratio</Text>
              <Text style={[styles.cell, styles.cellHead]}>Drive</Text>
              <Text style={[styles.cell, styles.cellHead]}>Speed</Text>
            </View>
            {nearby.map((row) => (
              <View
                key={`${row.front}-${row.rear}-${row.kind}`}
                style={[styles.tableRow, row.kind === 'current' && styles.tableRowCurrent]}
              >
                <Text style={[styles.cell, styles.cellPair]}>
                  {row.front}/{row.rear}
                  {row.kind === 'front_step' ? ' *' : ''}
                </Text>
                <Text style={styles.cell}>{formatRatio(row.ratio)}</Text>
                <Text style={styles.cell}>{formatSignedPct(row.drivePct)}</Text>
                <Text style={styles.cell}>{formatSignedPct(row.speedPct)}</Text>
              </View>
            ))}
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={sendToCoach}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          <Text style={styles.sendBtnText}>Send to Bike Setup Coach</Text>
        </TouchableOpacity>
        {!canSend ? (
          <Text style={styles.hint}>Need a bike, current front/rear, and a problem to send.</Text>
        ) : null}

        <Text style={styles.footer}>
          Sprocket changes also move anti-squat and wheelbase. For the most accurate overall setup,
          use Bike Balance Setup.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('BikeBalanceSetup')}>
          <Text style={styles.link}>Open Bike Balance Setup</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={bikePickerOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select bike</Text>
            <TextInput
              style={styles.search}
              value={bikeQuery}
              onChangeText={setBikeQuery}
              placeholder="Search make or model…"
              placeholderTextColor="#64748b"
              autoFocus
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.option} onPress={useManualBike}>
                <Text style={styles.optionText}>Manual — type the bike yourself</Text>
                <Text style={styles.optionMeta}>No catalog row. Fill capacity and RPM if you know them.</Text>
              </TouchableOpacity>
              {filteredBikes.map((row) => (
                <TouchableOpacity
                  key={row.id}
                  style={[styles.option, row.id === state.catalogId && styles.optionSelected]}
                  onPress={() => selectCatalog(row)}
                >
                  <Text style={styles.optionText}>
                    {row.manufacturer} {row.family}
                  </Text>
                  <Text style={styles.optionMeta}>
                    {row.yearFrom}–{row.yearTo} · {row.capacityCc} cc · {row.engineConfig}
                    {row.peakPowerRpm != null ? ` · peak ${row.peakPowerRpm} rpm` : ' · peak RPM unknown'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancel} onPress={() => setBikePickerOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function sheetHasText(...parts: string[]): boolean {
  return parts.some((part) => part.trim().length > 0);
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerText: { fontSize: 16, color: '#f8fafc', flex: 1 },
  chevron: { color: '#94a3b8', fontSize: 12, marginLeft: 8 },
  badge: { fontSize: 12, color: '#fbbf24', marginTop: 6, marginBottom: 10 },
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
  row2: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  chipScroll: { marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chipWrapItem: { marginBottom: 0 },
  chip: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  chipText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fbbf24' },
  teethPickerWrap: { flex: 1, marginBottom: 12 },
  teethTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 52,
  },
  teethTriggerText: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  teethPlaceholder: { fontWeight: '600', fontSize: 14, color: '#94a3b8' },
  ratio: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  hint: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 10 },
  tableHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#334155' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1e293b' },
  tableRowCurrent: { backgroundColor: 'rgba(245,158,11,0.12)' },
  cell: { flex: 1, color: '#e2e8f0', fontSize: 13 },
  cellHead: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
  cellPair: { flex: 1.1, fontWeight: '600' },
  sendBtn: {
    marginTop: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#334155' },
  sendBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  footer: { marginTop: 22, fontSize: 13, color: '#93c5fd', lineHeight: 18 },
  link: { marginTop: 8, color: '#f59e0b', fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  search: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 12,
  },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  optionSelected: { backgroundColor: 'rgba(245,158,11,0.1)' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
  optionMeta: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  cancel: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
});
