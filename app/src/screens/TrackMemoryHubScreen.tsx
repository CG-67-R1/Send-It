import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { TrackCornerSheet } from '../components/TrackCornerSheet';
import { TrackFacilityMap } from '../components/TrackFacilityMap';
import { TrackPicker } from '../components/TrackPicker';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import {
  TRACK_INFO_TRACK_IDS,
  elevationSummary,
  getTrackInfoFacts,
  getTrackInfoMap,
  listTrackInfoTracks,
} from '../data/trackInfo';
import type { TrackInfoCorner } from '../data/trackInfo/types';
import type { CornerDefinition, TrackDefinition } from '../data/tracks';
import { formatCornerHeading, getCornerById, getTrackById } from '../data/tracks';
import type { RiderAiSkill } from '../navigation/homeMode';
import { getTrackWalkSessions } from '../storage/trackWalk';
import {
  getTrackPrepSelectedTrack,
  saveTrackPrepSelectedTrack,
} from '../storage/trackdayPrep';
import { getSavedRiderAiSkill } from '../utils/riderSkillSaved';
import { trackInfoCoachingForSkill } from '../utils/riderSkillCopy';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TrackMemoryHub'>;

function latestCornerNote(
  sessions: { trackId: string; createdAt: number; entries: { type: string; cornerId?: string; text: string }[] }[],
  trackId: string,
  cornerId: string
): string | null {
  const forTrack = sessions
    .filter((s) => s.trackId === trackId)
    .sort((a, b) => b.createdAt - a.createdAt);
  for (const session of forTrack) {
    const entry = session.entries.find(
      (e) => e.type === 'corner' && e.cornerId === cornerId && e.text.trim()
    );
    if (entry) return entry.text.trim();
  }
  return null;
}

export function TrackMemoryHubScreen() {
  const navigation = useNavigation<Nav>();
  const infoTracks = useMemo(() => listTrackInfoTracks(), []);
  const [trackId, setTrackId] = useState<string | null>(
    infoTracks.length === 1 ? infoTracks[0].id : null
  );
  const [selectedMapCorner, setSelectedMapCorner] = useState<TrackInfoCorner | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [riderSkill, setRiderSkill] = useState<RiderAiSkill>('novice');
  const coaching = useMemo(() => trackInfoCoachingForSkill(riderSkill), [riderSkill]);

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
        if (!saved) return;
        if (getTrackInfoMap(saved.trackId)) {
          setTrackId(saved.trackId);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const map = trackId ? getTrackInfoMap(trackId) : undefined;
  const catalog = trackId ? getTrackById(trackId) : undefined;
  const facts = trackId ? getTrackInfoFacts(trackId) : undefined;
  const asbk = facts?.asbkRecords?.filter((r) => r.time) ?? [];

  const selectedCatalogCorner: CornerDefinition | null = useMemo(() => {
    if (!trackId || !selectedMapCorner) return null;
    return getCornerById(trackId, selectedMapCorner.id) ?? {
      id: selectedMapCorner.id,
      number: selectedMapCorner.number,
      label: selectedMapCorner.label,
      direction: selectedMapCorner.direction as CornerDefinition['direction'],
    };
  }, [trackId, selectedMapCorner]);

  const handleSelectTrack = useCallback((track: TrackDefinition) => {
    if (!getTrackInfoMap(track.id)) return;
    setTrackId(track.id);
    setSelectedMapCorner(null);
    void saveTrackPrepSelectedTrack({
      trackId: track.id,
      trackName: track.name,
    });
  }, []);

  const openCorner = useCallback(
    async (corner: TrackInfoCorner) => {
      if (!trackId) return;
      setSelectedMapCorner(corner);
      const sessions = await getTrackWalkSessions();
      setSavedNote(latestCornerNote(sessions, trackId, corner.id));
    },
    [trackId]
  );

  const askCoach = useCallback(() => {
    if (!catalog || !selectedCatalogCorner) return;
    const heading = formatCornerHeading(selectedCatalogCorner);
    const draft =
      riderSkill === 'novice'
        ? `I'm studying ${catalog.name}, ${heading}. Give me one or two simple things to look for on the approach — everyday language, no invented lap times.`
        : `I'm studying ${catalog.name}, ${heading}. Help me with reference points and where to look on the approach — no invented lap times.`;
    setSelectedMapCorner(null);
    navigation.navigate('CoachChat', {
      mode: 'coach',
      seedDraftMessage: draft,
    });
  }, [catalog, navigation, riderSkill, selectedCatalogCorner]);

  const openWalk = useCallback(() => {
    if (!trackId || !catalog) return;
    setSelectedMapCorner(null);
    navigation.navigate('TrackWalk', {
      initialTrackId: trackId,
      initialTrackName: catalog.name,
    });
  }, [catalog, navigation, trackId]);

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
        Pick a circuit to open the track map. The picture is the track. Each number on it has a row
        below so you can add notes.
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
          {infoTracks.length} Australian circuits — zoom the map, then tap a corner in the list.
        </Text>
      )}

      {map && catalog ? (
        <>
          <View style={styles.mapBleed}>
            <TrackFacilityMap
              map={map}
              selectedCornerId={selectedMapCorner?.id ?? null}
              onSelectCorner={(c) => void openCorner(c)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{catalog.name}</Text>
            <FactRow label="Distance" value={catalog.lengthKm ?? `${(map.lengthM / 1000).toFixed(2)} km`} />
            <FactRow label="Direction" value={catalog.direction} />
            <FactRow label="Elevation" value={elevationSummary(map)} />
            <FactRow label="Surface" value={facts?.surface ?? 'Asphalt (details not in the catalog).'} />
            <FactRow
              label="Usual weather"
              value={facts?.weatherUsual ?? 'Use Trackday Prep for a live forecast on the day.'}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>ASBK class lap records</Text>
            {asbk.length > 0 ? (
              asbk.map((row) => (
                <View key={`${row.class}-${row.time}`} style={styles.recordRow}>
                  <Text style={styles.recordClass}>{row.class}</Text>
                  <Text style={styles.recordTime}>{row.time}</Text>
                  <Text style={styles.recordMeta}>
                    {row.rider}
                    {row.machine ? ` · ${row.machine}` : ''} · {row.date}
                  </Text>
                  <Text style={styles.recordSource}>{row.source}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.body}>No ASBK class record in the app yet.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{coaching.title}</Text>
            <Text style={styles.body}>{coaching.intro}</Text>
            {coaching.points.map((line) => (
              <Text key={line} style={styles.bullet}>
                {'\u2022'} {line}
              </Text>
            ))}
          </View>

          <Text style={styles.listTitle}>Corners</Text>
          {map.corners.map((corner) => {
            const cat = getCornerById(catalog.id, corner.id);
            return (
              <TouchableOpacity
                key={corner.id}
                style={styles.cornerRow}
                onPress={() => void openCorner(corner)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Turn ${corner.number} ${corner.label}`}
              >
                <View style={styles.cornerDot} />
                <Text style={styles.cornerLabel}>
                  {cat ? formatCornerHeading(cat) : `T${corner.number} — ${corner.label}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </>
      ) : (
        <Text style={styles.hint}>Select a track to open the map.</Text>
      )}

      <TrackCornerSheet
        corner={selectedCatalogCorner}
        savedNote={savedNote}
        onClose={() => setSelectedMapCorner(null)}
        onAskCoach={askCoach}
        onOpenTrackWalk={openWalk}
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
  listTitle: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cornerRow: {
    minHeight: 48,
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
  cornerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  cornerLabel: { flex: 1, color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
});
