import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BikeBalanceDiagramPanel } from '../components/bikeBalance/BikeBalanceDiagramPanel';
import { BikeBalanceSourcesSheet } from '../components/BikeBalanceSourcesSheet';
import {
  GEOMETRY_AS_FIXTURE,
  POSITION_PRESETS,
  SECTION8_EXT_EXAMPLE,
  SECTION8_LADEN_EXAMPLE,
  SYMPTOM_GUIDES,
  antiSquatFlagLabel,
  applyPositionPreset,
  buildCitableReport,
  computeBikeBalance,
  formatBikeBalanceForAi,
  rememberTravelsForPosition,
  runCrossChecks,
  type AntiSquatAngleMode,
  type BikeBalanceInputs,
  type BikeBalancePositionLabel,
  type CalcResult,
  type CogProvenance,
  type SkillMode,
} from '../calc/bikeBalance';
import {
  loadBikeBalanceState,
  saveBikeBalanceState,
} from '../storage/bikeBalance';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'BikeBalanceSetup'>;
type TabKey = 'inputs' | 'results' | 'compare' | 'guide';

const SKILL_MODES: SkillMode[] = ['rider', 'tuner', 'engineer'];
const TABS: TabKey[] = ['inputs', 'results', 'compare', 'guide'];

const INPUT_FIELDS: {
  key: keyof BikeBalanceInputs;
  label: string;
  hint: string;
}[] = [
  { key: 'rakeDeg', label: 'Rake (°)', hint: 'Steering axis from vertical' },
  { key: 'trailMm', label: 'Trail (mm)', hint: 'Ground trail' },
  { key: 'wheelbaseMm', label: 'Wheelbase (mm)', hint: 'Contact patch to contact patch' },
  { key: 'forkTravelMm', label: 'Fork travel (mm)', hint: 'Along fork axis — measure at Pos' },
  { key: 'shockTravelMm', label: 'Shock travel (mm)', hint: 'Shock shaft — measure at Pos' },
  { key: 'forkRateNPerMm', label: 'Fork rate (N/mm)', hint: 'Combined legs' },
  { key: 'shockRateNPerMm', label: 'Shock rate (N/mm)', hint: 'At shaft' },
  { key: 'linkRatio', label: 'Link ratio', hint: 'Instantaneous MR' },
  { key: 'forkForceN', label: 'Fork force (N)', hint: 'Set by position preset or manual' },
  { key: 'shockForceN', label: 'Shock force (N)', hint: 'Set by position preset or manual' },
  { key: 'cogXMm', label: 'CoG X (mm)', hint: 'From front contact' },
  { key: 'cogYMm', label: 'CoG Y (mm)', hint: 'Height above ground' },
  { key: 'antiSquatAngleDeg', label: 'Anti-squat angle (°)', hint: 'Manual mode only' },
];

const GEO_FIELDS: {
  key: keyof BikeBalanceInputs;
  label: string;
  hint: string;
}[] = [
  { key: 'rearTyreRadiusMm', label: 'Rear tyre radius (mm)', hint: 'Effective rolling radius' },
  { key: 'swingarmLengthMm', label: 'Swingarm length (mm)', hint: 'Pivot to rear axle' },
  {
    key: 'swingarmAngleDeg',
    label: 'Swingarm angle (°)',
    hint: 'Above horizontal; + when pivot above axle',
  },
  { key: 'csFromPivotXMm', label: 'CS from pivot X (mm)', hint: '+ rearward (frame convention)' },
  { key: 'csFromPivotYMm', label: 'CS from pivot Y (mm)', hint: '+ up' },
  { key: 'frontSprocketTeeth', label: 'Front sprocket teeth', hint: 'e.g. 15–17' },
  { key: 'rearSprocketTeeth', label: 'Rear sprocket teeth', hint: 'e.g. 40–45' },
  { key: 'chainPitchMm', label: 'Chain pitch (mm)', hint: '520/525/530 ≈ 15.875' },
];

function parseOptionalNumber(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatValue(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '';
  return String(v);
}

function formatResultValue(r: CalcResult): string {
  if (r.value == null) return '—';
  if (r.equationId === 'EQ-AS-FLAG-01') return antiSquatFlagLabel(r.value);
  const digits = Math.abs(r.value) >= 100 ? 1 : 2;
  return `${r.value.toFixed(digits)}${r.unit ? ` ${r.unit}` : ''}`;
}

function resultDelta(current: number | null, ref: number | null): string | null {
  if (current == null || ref == null) return null;
  const d = current - ref;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(2)}`;
}

export function BikeBalanceSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [ready, setReady] = useState(false);
  const [inputs, setInputs] = useState<BikeBalanceInputs>({ ...SECTION8_LADEN_EXAMPLE });
  const [refInputs, setRefInputs] = useState<BikeBalanceInputs | null>(null);
  const [skillMode, setSkillMode] = useState<SkillMode>('rider');
  const [tab, setTab] = useState<TabKey>('results');
  const [sourceResult, setSourceResult] = useState<CalcResult | null>(null);
  const [showVerify, setShowVerify] = useState(false);
  const [presetNotes, setPresetNotes] = useState<string[]>([]);
  const [highlightEqIds, setHighlightEqIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await loadBikeBalanceState();
      if (cancelled) return;
      setInputs(state.inputs);
      setRefInputs(state.refInputs);
      setSkillMode(state.skillMode);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const withTravels = rememberTravelsForPosition(inputs);
    void saveBikeBalanceState({ inputs: withTravels, refInputs, skillMode });
  }, [inputs, refInputs, skillMode, ready]);

  const results = useMemo(() => computeBikeBalance(inputs), [inputs]);
  const refResults = useMemo(
    () => (refInputs ? computeBikeBalance(refInputs) : null),
    [refInputs]
  );
  const refById = useMemo(() => {
    const map = new Map<string, CalcResult>();
    for (const r of refResults ?? []) map.set(r.equationId, r);
    return map;
  }, [refResults]);
  const checks = useMemo(() => runCrossChecks(inputs), [inputs]);

  const displayResults = useMemo(() => {
    if (!highlightEqIds.length) return results;
    const preferred = results.filter((r) => highlightEqIds.includes(r.equationId));
    const rest = results.filter((r) => !highlightEqIds.includes(r.equationId));
    return [...preferred, ...rest];
  }, [results, highlightEqIds]);

  const setNum = useCallback((key: keyof BikeBalanceInputs, text: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseOptionalNumber(text) }));
  }, []);

  const onPickPosition = useCallback((position: BikeBalancePositionLabel) => {
    setInputs((prev) => {
      const applied = applyPositionPreset(prev, position);
      setPresetNotes(applied.warnings);
      return applied.inputs;
    });
  }, []);

  const sendToAi = useCallback(() => {
    navigation.navigate('CoachChat', {
      mode: 'bikesetup',
      seedDraftMessage: formatBikeBalanceForAi(inputs, results),
    });
  }, [inputs, results, navigation]);

  const exportReport = useCallback(async () => {
    const md = buildCitableReport(inputs, refInputs);
    await Clipboard.setStringAsync(md);
    Alert.alert('Report copied', 'Citable Markdown report is on the clipboard.');
  }, [inputs, refInputs]);

  const renderResultCard = (r: CalcResult) => {
    const highlighted = highlightEqIds.includes(r.equationId);
    const ref = refById.get(r.equationId);
    const delta = resultDelta(r.value, ref?.value ?? null);

    if (skillMode === 'rider') {
      return (
        <TouchableOpacity
          key={r.equationId}
          style={[styles.card, highlighted && styles.cardHighlight]}
          onPress={() => setSourceResult(r)}
          activeOpacity={0.85}
        >
          <Text style={styles.cardTitle}>{r.riderLabel}</Text>
          {r.value == null ? (
            <Text style={styles.needsInput}>{r.unavailableReason}</Text>
          ) : (
            <Text style={styles.cardValue}>{formatResultValue(r)}</Text>
          )}
          <Text style={styles.cardMeaning}>{r.riderMeaning}</Text>
          {r.warning ? <Text style={styles.warn}>{r.warning}</Text> : null}
          <Text style={styles.linkish}>Why this number?</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={r.equationId}
        style={[styles.row, highlighted && styles.cardHighlight]}
        onPress={() => setSourceResult(r)}
        activeOpacity={0.85}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowName}>{r.name}</Text>
          {skillMode === 'engineer' ? <Text style={styles.eqId}>{r.equationId}</Text> : null}
          {r.warning ? <Text style={styles.warn}>{r.warning}</Text> : null}
        </View>
        <View style={styles.rowRight}>
          {r.value == null ? (
            <Text style={styles.needsInputSmall}>Needs input</Text>
          ) : (
            <Text style={styles.rowValue}>{formatResultValue(r)}</Text>
          )}
          {delta != null && r.equationId !== 'EQ-AS-FLAG-01' ? (
            <Text style={styles.delta}>Δ {delta}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.disclaimer}>
          Informational setup aid. Same math in every skill mode. Not affiliated with Zero Chassis
          Software. Prefer deltas vs Ref. Travels are never invented from force presets.
        </Text>

        <Text style={styles.meta}>
          Pos: {inputs.position} · Lean: {inputs.leanDeg}° · CoG: {inputs.cogProvenance}
        </Text>

        {tab === 'guide' || (tab === 'results' && skillMode === 'rider') ? (
          <BikeBalanceDiagramPanel />
        ) : null}

        <Text style={styles.sectionLabel}>Position</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
          {POSITION_PRESETS.map((p) => {
            const active = inputs.position === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.posChip, active && styles.posChipActive]}
                onPress={() => onPickPosition(p.id)}
              >
                <Text style={[styles.posChipText, active && styles.posChipTextActive]}>
                  {p.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {presetNotes.map((note) => (
          <Text key={note} style={styles.presetNote}>
            {note}
          </Text>
        ))}

        <View style={styles.segmentRow}>
          {SKILL_MODES.map((mode) => {
            const active = skillMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setSkillMode(mode)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.segmentRow}>
          {TABS.map((key) => {
            const active = tab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setTab(key)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'inputs' ? (
          <View>
            <Text style={styles.fieldLabel}>Setup name</Text>
            <TextInput
              style={styles.input}
              value={inputs.name}
              onChangeText={(name) => setInputs((p) => ({ ...p, name }))}
              placeholderTextColor="#64748b"
            />

            <Text style={styles.fieldLabel}>CoG provenance</Text>
            <View style={styles.segmentRow}>
              {(['measured', 'estimated', 'unknown'] as CogProvenance[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.segment, inputs.cogProvenance === p && styles.segmentActive]}
                  onPress={() => setInputs((prev) => ({ ...prev, cogProvenance: p }))}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      inputs.cogProvenance === p && styles.segmentTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Anti-squat angle mode</Text>
            <View style={styles.segmentRow}>
              {(['manual', 'geometry'] as AntiSquatAngleMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.segment, inputs.antiSquatAngleMode === mode && styles.segmentActive]}
                  onPress={() => setInputs((prev) => ({ ...prev, antiSquatAngleMode: mode }))}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      inputs.antiSquatAngleMode === mode && styles.segmentTextActive,
                    ]}
                  >
                    {mode === 'manual' ? 'Manual' : 'Geometry'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              Geometry computes AS angle from swingarm × top chain run (IFC). Travels are stored per
              position when you edit them.
            </Text>

            {INPUT_FIELDS.map((field) => {
              if (field.key === 'antiSquatAngleDeg' && inputs.antiSquatAngleMode === 'geometry') {
                return null;
              }
              return (
                <View key={field.key}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={styles.hint}>{field.hint}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={formatValue(inputs[field.key] as number | null)}
                    onChangeText={(t) => setNum(field.key, t)}
                    placeholderTextColor="#64748b"
                    placeholder="—"
                  />
                </View>
              );
            })}

            {inputs.antiSquatAngleMode === 'geometry' ? (
              <View>
                <Text style={styles.sectionLabel}>Drive-side geometry</Text>
                {GEO_FIELDS.map((field) => (
                  <View key={field.key}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <Text style={styles.hint}>{field.hint}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={formatValue(inputs[field.key] as number | null)}
                      onChangeText={(t) => setNum(field.key, t)}
                      placeholderTextColor="#64748b"
                      placeholder="—"
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setInputs({ ...SECTION8_LADEN_EXAMPLE });
                setPresetNotes(['Loaded §8 laden worked example.']);
                setTab('results');
              }}
            >
              <Text style={styles.secondaryBtnText}>Load §8 laden example</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setInputs({ ...SECTION8_EXT_EXAMPLE });
                setPresetNotes(['Loaded §8 Ext example (full extension).']);
                setTab('results');
              }}
            >
              <Text style={styles.secondaryBtnText}>Load §8 Ext example</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setInputs({ ...GEOMETRY_AS_FIXTURE });
                setPresetNotes(['Loaded geometry AS fixture (Geometry mode).']);
                setTab('results');
              }}
            >
              <Text style={styles.secondaryBtnText}>Load geometry AS fixture</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {tab === 'results' ? (
          <View>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtnHalf}
                onPress={() => {
                  setRefInputs({ ...inputs });
                  setTab('compare');
                }}
              >
                <Text style={styles.secondaryBtnText}>Save as Ref</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtnHalf}
                onPress={() => setShowVerify((v) => !v)}
              >
                <Text style={styles.secondaryBtnText}>
                  {showVerify || skillMode === 'engineer' ? 'Hide verify' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>

            {(showVerify || skillMode === 'engineer') && (
              <View style={styles.verifyBox}>
                <Text style={styles.sectionLabel}>Cross-checks</Text>
                {checks.length === 0 ? (
                  <Text style={styles.muted}>Enter inputs to run checks.</Text>
                ) : (
                  checks.map((c) => (
                    <Text key={c.id} style={c.pass ? styles.pass : styles.fail}>
                      {c.pass ? '✓' : '✗'} {c.label}
                    </Text>
                  ))
                )}
              </View>
            )}

            {highlightEqIds.length ? (
              <TouchableOpacity onPress={() => setHighlightEqIds([])}>
                <Text style={styles.linkish}>Clear guide highlight</Text>
              </TouchableOpacity>
            ) : null}

            {displayResults.map(renderResultCard)}

            <TouchableOpacity style={styles.primaryBtn} onPress={sendToAi}>
              <Text style={styles.primaryBtnText}>Send to RR Bike Setup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => void exportReport()}>
              <Text style={styles.secondaryBtnText}>Copy citable report</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {tab === 'compare' ? (
          <View>
            {!refInputs ? (
              <Text style={styles.muted}>Save a Ref from Results to compare deltas.</Text>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Proposal vs Ref ({refInputs.name})</Text>
                {results.map((r) => {
                  const ref = refById.get(r.equationId);
                  const delta =
                    r.equationId === 'EQ-AS-FLAG-01'
                      ? null
                      : resultDelta(r.value, ref?.value ?? null);
                  return (
                    <View key={r.equationId} style={styles.row}>
                      <Text style={styles.rowName}>{r.name}</Text>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowValue}>{formatResultValue(r)}</Text>
                        <Text style={styles.delta}>{delta ? `Δ ${delta}` : 'Δ —'}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        ) : null}

        {tab === 'guide' ? (
          <View>
            <Text style={styles.muted}>
              Pick a feel/problem — we highlight related results. Math is unchanged.
            </Text>
            {SYMPTOM_GUIDES.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.card}
                onPress={() => {
                  setHighlightEqIds(g.equationIds);
                  setTab('results');
                }}
              >
                <Text style={styles.cardTitle}>{g.symptom}</Text>
                <Text style={styles.cardMeaning}>Look at: {g.lookAt.join(', ')}</Text>
                <Text style={styles.hint}>{g.typicalDirection}</Text>
                <Text style={styles.linkish}>Show related results</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <BikeBalanceSourcesSheet
        result={sourceResult}
        visible={sourceResult != null}
        onClose={() => setSourceResult(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  disclaimer: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  meta: { color: '#cbd5e1', fontSize: 13, marginBottom: 10 },
  posScroll: { marginBottom: 8 },
  posChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  posChipActive: { borderColor: '#f59e0b' },
  posChipText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  posChipTextActive: { color: '#f8fafc' },
  presetNote: { color: '#fbbf24', fontSize: 11, lineHeight: 16, marginBottom: 4 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  segmentActive: { borderColor: '#f59e0b' },
  segmentText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#f8fafc' },
  fieldLabel: { marginTop: 10, color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  hint: { color: '#64748b', fontSize: 11, marginBottom: 4, lineHeight: 15 },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 10,
  },
  cardHighlight: { borderColor: '#38bdf8' },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  cardValue: { color: '#f59e0b', fontSize: 22, fontWeight: '700', marginTop: 6 },
  cardMeaning: { color: '#cbd5e1', fontSize: 13, lineHeight: 19, marginTop: 8 },
  linkish: { color: '#38bdf8', fontSize: 12, marginTop: 10, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  rowMain: { flex: 1 },
  rowName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  eqId: { color: '#64748b', fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowValue: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  delta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  needsInput: { color: '#fbbf24', marginTop: 6, fontSize: 14 },
  needsInputSmall: { color: '#fbbf24', fontSize: 12 },
  warn: { color: '#fbbf24', fontSize: 12, marginTop: 6, lineHeight: 17 },
  muted: { color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  sectionLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  verifyBox: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 12,
  },
  pass: { color: '#4ade80', fontSize: 12, marginBottom: 4 },
  fail: { color: '#f87171', fontSize: 12, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#64748b',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnHalf: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#64748b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
});
