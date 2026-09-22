import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import {
  TrackCornerSheet,
  formatDetailsCornerHeading,
  type DetailsTurn,
  type TurnFieldPatch,
} from '../components/TrackCornerSheet';
import { TrackFacilityMap } from '../components/TrackFacilityMap';
import { TrackPicker } from '../components/TrackPicker';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import { getGpxTrackMap } from '../data/gpxTrackMaps';
import { getRacingLine } from '../data/racingLines';
import {
  CAMBER_OPTIONS,
  CORNER_ENTRY_OPTIONS,
  CORNER_TYPE_OPTIONS,
  SURFACE_CONDITION_OPTIONS,
  labelForOption,
} from '../data/riderCornerFields';
import { getTrackDetailsCorners } from '../data/trackDetailsCorners';
import type { TrackDetailsCorner } from '../data/trackDetailsCorners/types';
import { isTrustedTrackDetails } from '../data/trackDetailsTrust';
import {
  TRACK_INFO_TRACK_IDS,
  getTrackInfoFacts,
  hasTrackInfoMap,
  listTrackInfoTracks,
} from '../data/trackInfo';
import type { TrackDefinition } from '../data/tracks';
import { getTrackById } from '../data/tracks';
import type { RiderAiSkill } from '../navigation/homeMode';
import {
  getRiderTrackMarks,
  nextRiderCornerNumber,
  removeRiderCorner,
  saveRiderTrackMarks,
  upsertRiderCorner,
  type RiderCircuitDirection,
  type RiderCornerMark,
  type RiderTrackMarks,
} from '../storage/riderTrackMarks';
import { getTrackWalkSessions, type TrackWalkSession } from '../storage/trackWalk';
import {
  getTrackPrepSelectedTrack,
  saveTrackPrepSelectedTrack,
} from '../storage/trackdayPrep';
import { getSavedRiderAiSkill } from '../utils/riderSkillSaved';
import { trackInfoCoachingForSkill } from '../utils/riderSkillCopy';
import { riderBadgeLabel } from '../components/TrackMapView';
import { walkCardLines, walkNoteForTurn, walkNotesForTrack } from '../utils/trackWalkOnDetails';
import type { MapPoint } from '../utils/snapToRibbon';
import type { RiderCoachStackParamList } from './RiderCoachScreen';
import { CORNER_BLUE, CORNER_PAPER, RIDER_AMBER } from '../components/trackMapTheme';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TrackMemoryHub'>;

function emptyMarks(trackId: string): RiderTrackMarks {
  return { trackId, corners: [], updatedAt: 0 };
}

function annotationFor(marks: RiderTrackMarks, id: string): RiderCornerMark | undefined {
  return marks.corners.find((c) => c.id === id);
}

function bakedToTurn(corner: TrackDetailsCorner, marks: RiderTrackMarks, polyline: number[][]): DetailsTurn {
  const extra = annotationFor(marks, corner.id);
  return {
    id: corner.id,
    number: corner.number,
    baked: true,
    point: extra?.point ?? corner.apex,
    label: corner.label,
    entry: corner.entry,
    exit: corner.exit,
    apex: corner.apex,
    direction: corner.direction,
    classification: corner.classification,
    summary: corner.summary,
    approachFrom: corner.approachFrom,
    surfaceCondition: extra?.surfaceCondition,
    cornerType: extra?.cornerType,
    camber: extra?.camber,
    cornerEntry: extra?.cornerEntry,
    note: extra?.note ?? '',
  };
}

function riderToTurn(mark: RiderCornerMark, polyline: number[][]): DetailsTurn {
  return {
    id: mark.id,
    number: mark.number,
    baked: false,
    point: mark.point,
    label: riderBadgeLabel(mark.point, polyline),
    surfaceCondition: mark.surfaceCondition,
    cornerType: mark.cornerType,
    camber: mark.camber,
    cornerEntry: mark.cornerEntry,
    note: mark.note,
  };
}

function buildTurns(
  baked: TrackDetailsCorner[] | undefined,
  marks: RiderTrackMarks,
  polyline: number[][]
): DetailsTurn[] {
  const trusted = (baked ?? []).map((c) => bakedToTurn(c, marks, polyline));
  const extras = marks.corners.filter((c) => !c.baked).map((c) => riderToTurn(c, polyline));
  return [...trusted, ...extras].sort((a, b) => a.number - b.number || (a.baked === b.baked ? 0 : a.baked ? -1 : 1));
}

function chipsLine(turn: DetailsTurn): string | null {
  const parts = [
    labelForOption(SURFACE_CONDITION_OPTIONS, turn.surfaceCondition),
    labelForOption(CORNER_TYPE_OPTIONS, turn.cornerType),
    labelForOption(CAMBER_OPTIONS, turn.camber),
    labelForOption(CORNER_ENTRY_OPTIONS, turn.cornerEntry),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function shapeLabel(classification: string): string {
  return classification.replaceAll('_', ' ');
}

export function TrackMemoryHubScreen() {
  const navigation = useNavigation<Nav>();
  const infoTracks = useMemo(() => listTrackInfoTracks(), []);
  const initialTrackId = infoTracks.length === 1 ? infoTracks[0].id : null;
  const [trackId, setTrackId] = useState<string | null>(initialTrackId);
  const [selectedTurn, setSelectedTurn] = useState<DetailsTurn | null>(null);
  const [riderSkill, setRiderSkill] = useState<RiderAiSkill>('novice');
  const [marks, setMarks] = useState<RiderTrackMarks>(emptyMarks(''));
  const [walkSessions, setWalkSessions] = useState<TrackWalkSession[]>([]);
  const activeTrackIdRef = useRef<string | null>(initialTrackId);
  const trackLoadGenerationRef = useRef(0);
  const coaching = useMemo(() => trackInfoCoachingForSkill(riderSkill), [riderSkill]);

  const setActiveTrackId = useCallback((id: string | null) => {
    activeTrackIdRef.current = id;
    setTrackId(id);
  }, []);

  const loadTrackState = useCallback(async (id: string) => {
    const generation = (trackLoadGenerationRef.current += 1);
    const [savedMarks, sessions] = await Promise.all([getRiderTrackMarks(id), getTrackWalkSessions()]);
    if (generation !== trackLoadGenerationRef.current || activeTrackIdRef.current !== id) return;
    setMarks(savedMarks);
    setWalkSessions(sessions);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [saved, skill] = await Promise.all([
          getTrackPrepSelectedTrack(),
          getSavedRiderAiSkill(),
        ]);
        if (cancelled) return;
        setRiderSkill(skill);
        const nextId = saved && hasTrackInfoMap(saved.trackId) ? saved.trackId : activeTrackIdRef.current;
        if (nextId && hasTrackInfoMap(nextId)) {
          setActiveTrackId(nextId);
          await loadTrackState(nextId);
        }
      })();
      return () => {
        cancelled = true;
        trackLoadGenerationRef.current += 1;
      };
    }, [loadTrackState, setActiveTrackId])
  );

  const map = trackId ? getGpxTrackMap(trackId) : undefined;
  const racingLine = trackId ? getRacingLine(trackId) : undefined;
  const trusted = trackId ? isTrustedTrackDetails(trackId) : false;
  const layout = trusted && trackId ? getTrackDetailsCorners(trackId) : undefined;
  const catalog = trackId ? getTrackById(trackId) : undefined;
  const facts = trackId ? getTrackInfoFacts(trackId) : undefined;
  const asbk = facts?.asbkRecords?.filter((r) => r.time) ?? [];
  const polyline = map?.polyline ?? [];
  const currentMarks = useMemo(
    () => (trackId && marks.trackId === trackId ? marks : emptyMarks(trackId ?? '')),
    [trackId, marks]
  );
  const turns = useMemo(
    () => buildTurns(layout?.corners, currentMarks, polyline),
    [layout?.corners, currentMarks, polyline]
  );
  const walkNotes = useMemo(
    () => (trackId ? walkNotesForTrack(walkSessions, trackId, turns) : walkNotesForTrack([], '', [])),
    [trackId, walkSessions, turns]
  );
  const walkCard = walkCardLines(walkNotes);
  const lengthLabel = layout
    ? `${(layout.lengthM / 1000).toFixed(2)} km`
    : catalog?.lengthKm ?? 'Length not available.';
  const directionLabel =
    currentMarks.direction ??
    (catalog?.direction && catalog.direction !== 'unknown' ? catalog.direction : null) ??
    'Not marked yet.';
  const extraCount = currentMarks.corners.filter((c) => !c.baked).length;

  const persistMarks = useCallback(async (next: RiderTrackMarks) => {
    if (activeTrackIdRef.current !== next.trackId) return;
    trackLoadGenerationRef.current += 1;
    setMarks(next);
    await saveRiderTrackMarks(next);
  }, []);

  const handleSelectTrack = useCallback(
    (track: TrackDefinition) => {
      if (!hasTrackInfoMap(track.id)) return;
      setActiveTrackId(track.id);
      setSelectedTurn(null);
      void saveTrackPrepSelectedTrack({
        trackId: track.id,
        trackName: track.name,
      });
      void loadTrackState(track.id);
    },
    [loadTrackState, setActiveTrackId]
  );

  const openTurn = useCallback((turn: DetailsTurn) => {
    setSelectedTurn(turn);
  }, []);

  const openBaked = useCallback(
    (corner: TrackDetailsCorner) => {
      const turn = turns.find((t) => t.id === corner.id);
      if (turn) openTurn(turn);
    },
    [turns, openTurn]
  );

  const openRider = useCallback(
    (id: string) => {
      const turn = turns.find((t) => t.id === id);
      if (turn) openTurn(turn);
    },
    [turns, openTurn]
  );

  const placeCorner = useCallback(
    (point: MapPoint) => {
      if (!trackId) return;
      const number = nextRiderCornerNumber(currentMarks, layout?.corners.length ?? 0);
      const created: RiderCornerMark = {
        id: `rider_${trackId}_${Date.now()}`,
        number,
        point,
        baked: false,
        note: '',
      };
      const next = upsertRiderCorner(currentMarks, created);
      void persistMarks(next);
      setSelectedTurn(riderToTurn(created, polyline));
    },
    [trackId, currentMarks, layout?.corners.length, persistMarks, polyline]
  );

  const placeStart = useCallback(
    (point: MapPoint) => {
      if (!trackId) return;
      void persistMarks({ ...currentMarks, startFinish: point });
    },
    [trackId, currentMarks, persistMarks]
  );

  const setDirection = useCallback(
    (direction: RiderCircuitDirection) => {
      if (!trackId) return;
      void persistMarks({ ...currentMarks, direction });
    },
    [trackId, currentMarks, persistMarks]
  );

  const patchTurn = useCallback(
    (patch: TurnFieldPatch) => {
      if (!selectedTurn || !trackId) return;
      const existing = annotationFor(currentMarks, selectedTurn.id);
      const updated: RiderCornerMark = {
        id: selectedTurn.id,
        number: selectedTurn.number,
        point: existing?.point ?? selectedTurn.point,
        baked: selectedTurn.baked,
        surfaceCondition: patch.surfaceCondition ?? existing?.surfaceCondition ?? selectedTurn.surfaceCondition,
        cornerType: patch.cornerType ?? existing?.cornerType ?? selectedTurn.cornerType,
        camber: patch.camber ?? existing?.camber ?? selectedTurn.camber,
        cornerEntry: patch.cornerEntry ?? existing?.cornerEntry ?? selectedTurn.cornerEntry,
        note: patch.note ?? existing?.note ?? selectedTurn.note,
      };
      const next = upsertRiderCorner(currentMarks, updated);
      void persistMarks(next);
      setSelectedTurn({ ...selectedTurn, ...patch });
    },
    [selectedTurn, trackId, currentMarks, persistMarks]
  );

  const deleteTurn = useCallback(() => {
    if (!selectedTurn || selectedTurn.baked) return;
    void persistMarks(removeRiderCorner(currentMarks, selectedTurn.id));
    setSelectedTurn(null);
  }, [selectedTurn, currentMarks, persistMarks]);

  const askCoach = useCallback(() => {
    if (!catalog || !selectedTurn) return;
    const heading = formatDetailsCornerHeading(selectedTurn);
    const chips = chipsLine(selectedTurn);
    const personal = selectedTurn.note.trim();
    const walk = walkNoteForTurn(walkNotes, selectedTurn);
    const factsBits = [
      selectedTurn.summary,
      chips ? `My notes: ${chips}.` : null,
      personal ? `Personal note: ${personal}` : null,
      walk ? `Track Walk: ${walk}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    const draft =
      riderSkill === 'novice'
        ? `I'm studying ${catalog.name}, ${heading}. ${factsBits} Give me one or two simple things to look for on the approach — everyday language, no invented lap times.`
        : `I'm studying ${catalog.name}, ${heading}. ${factsBits} Help me with reference points and where to look on the approach — no invented lap times.`;
    setSelectedTurn(null);
    navigation.navigate('CoachChat', {
      mode: 'coach',
      seedDraftMessage: draft,
    });
  }, [catalog, navigation, riderSkill, selectedTurn, walkNotes]);

  const openWalk = useCallback(() => {
    if (!trackId || !catalog) return;
    setSelectedTurn(null);
    navigation.navigate('TrackWalk', {
      initialTrackId: trackId,
      initialTrackName: catalog.name,
    });
  }, [catalog, navigation, trackId]);

  const selectedWalkNote = selectedTurn ? walkNoteForTurn(walkNotes, selectedTurn) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoRow}>
        <AppLogo size={COMPACT_LOGO_SIZE} />
      </View>

      <Text style={styles.lead}>
        Pick a circuit. The map is the GPS layout. On Australian maps the numbered turns are
        confirmed. On other maps, place your own numbers, start/finish, and direction.
      </Text>

      <TrackPicker
        selectedTrackId={trackId}
        onSelect={handleSelectTrack}
        allowedTrackIds={TRACK_INFO_TRACK_IDS}
      />

      {infoTracks.length === 0 ? (
        <Text style={styles.hint}>No track maps are available yet.</Text>
      ) : (
        <Text style={styles.hint}>
          {infoTracks.length} circuits with a GPS map — zoom, tap a number, or place your own mark.
        </Text>
      )}

      {map && catalog ? (
        <>
          <View style={styles.mapBleed}>
            <TrackFacilityMap
              map={map}
              racingLine={racingLine}
              baked={layout}
              riderMarks={currentMarks}
              catalogDirection={catalog.direction}
              onBakedPress={openBaked}
              onRiderPress={openRider}
              onPlaceCorner={placeCorner}
              onPlaceStartFinish={placeStart}
              onDirectionChange={setDirection}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{layout?.name ?? catalog.name}</Text>
            <FactRow label="Distance" value={lengthLabel} />
            <FactRow label="Direction" value={directionLabel} />
            <FactRow
              label="Turns"
              value={
                trusted && layout
                  ? extraCount
                    ? `${layout.corners.length} confirmed from the GPS trace · ${extraCount} you placed`
                    : `${layout.corners.length} numbered from the GPS trace`
                  : extraCount
                    ? `${extraCount} you placed — tap Place corner to add more`
                    : 'No corners yet — place a number on the map.'
              }
            />
            <FactRow label="Surface" value={facts?.surface ?? 'Asphalt (details not in the catalog).'} />
            <FactRow
              label="Usual weather"
              value={facts?.weatherUsual ?? 'Use Trackday Prep for a live forecast on the day.'}
            />
          </View>

          {asbk.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ASBK class lap records</Text>
              {asbk.map((row) => (
                <View key={`${row.class}-${row.time}`} style={styles.recordRow}>
                  <Text style={styles.recordClass}>{row.class}</Text>
                  <Text style={styles.recordTime}>{row.time}</Text>
                  <Text style={styles.recordMeta}>
                    {row.rider}
                    {row.machine ? ` · ${row.machine}` : ''} · {row.date}
                  </Text>
                  <Text style={styles.recordSource}>{row.source}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{coaching.title}</Text>
            <Text style={styles.body}>{coaching.intro}</Text>
            {coaching.points.map((line) => (
              <Text key={line} style={styles.bullet}>
                {'\u2022'} {line}
              </Text>
            ))}
          </View>

          {walkCard.length > 0 && walkNotes.session ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Track Walk notes</Text>
              <Text style={styles.walkDate}>{walkNotes.session.dateIso}</Text>
              {walkCard.map((line, i) => (
                <View key={`${line.heading}-${i}`} style={styles.walkLine}>
                  <Text style={styles.walkHeading}>{line.heading}</Text>
                  <Text style={styles.body}>{line.text}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.listTitle}>Turns</Text>
          {turns.length === 0 ? (
            <Text style={styles.hint}>Place a corner number on the map to start the list.</Text>
          ) : (
            turns.map((turn) => {
              const walk = walkNoteForTurn(walkNotes, turn);
              const chips = chipsLine(turn);
              const subtitle = walk ?? (turn.note.trim() || chips || turn.summary || 'No note yet.');
              return (
                <TouchableOpacity
                  key={turn.id}
                  style={styles.cornerRow}
                  onPress={() => openTurn(turn)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Turn ${turn.number}`}
                >
                  <View style={[styles.cornerBadge, !turn.baked && styles.cornerBadgeRider]}>
                    <Text style={[styles.cornerBadgeText, !turn.baked && styles.cornerBadgeTextRider]}>
                      {turn.number}
                    </Text>
                  </View>
                  <View style={styles.cornerCopy}>
                    <Text style={styles.cornerLabel}>
                      {formatDetailsCornerHeading(turn)}
                      {turn.classification ? ` · ${shapeLabel(turn.classification)}` : ''}
                      {!turn.baked ? ' · yours' : ''}
                    </Text>
                    {walk ? <Text style={styles.walkCue}>Walk</Text> : null}
                    <Text style={styles.cornerSummary} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
      ) : (
        <Text style={styles.hint}>Select a track to open the map.</Text>
      )}

      <TrackCornerSheet
        turn={selectedTurn}
        map={map}
        racingLine={racingLine}
        startFinish={marks.startFinish ?? layout?.startFinish}
        walkNote={selectedWalkNote}
        onChange={patchTurn}
        onClose={() => setSelectedTurn(null)}
        onAskCoach={askCoach}
        onOpenTrackWalk={openWalk}
        onDelete={selectedTurn && !selectedTurn.baked ? deleteTurn : undefined}
      />
    </ScrollView>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  logoRow: { alignItems: 'center', marginBottom: 12 },
  lead: {
    fontSize: 14,
    color: '#93c5fd',
    lineHeight: 20,
    marginBottom: 16,
  },
  hint: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 18 },
  mapBleed: { marginHorizontal: -20 },
  card: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  factRow: { marginBottom: 10 },
  factLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  body: { fontSize: 14, color: '#e2e8f0', lineHeight: 20 },
  bullet: { fontSize: 14, color: '#e2e8f0', lineHeight: 20, marginTop: 8 },
  recordRow: { marginBottom: 12 },
  recordClass: { fontSize: 13, fontWeight: '700', color: '#cbd5e1' },
  recordTime: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginTop: 2 },
  recordMeta: { fontSize: 13, color: '#e2e8f0', marginTop: 2 },
  recordSource: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  walkDate: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  walkLine: { marginBottom: 10 },
  walkHeading: { fontSize: 12, fontWeight: '700', color: '#fbbf24', marginBottom: 2 },
  listTitle: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cornerRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cornerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CORNER_BLUE,
    borderWidth: 2,
    borderColor: CORNER_PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerBadgeRider: { backgroundColor: RIDER_AMBER },
  cornerBadgeText: {
    color: CORNER_PAPER,
    fontSize: 14,
    fontWeight: '700',
  },
  cornerBadgeTextRider: { color: '#0f172a' },
  cornerCopy: { flex: 1 },
  cornerLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  walkCue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  cornerSummary: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginTop: 2 },
});
