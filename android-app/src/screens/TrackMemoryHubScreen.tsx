import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { TrackPicker } from '../components/TrackPicker';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import type { TrackDefinition } from '../data/tracks';
import { getTrackById } from '../data/tracks';
import {
  TRACK_MEMORY_TRACK_IDS,
  getTrackMemoryLayout,
  listTrackMemoryTracks,
} from '../trackMemory/layouts';
import {
  getTrackPrepSelectedTrack,
  saveTrackPrepSelectedTrack,
} from '../storage/trackdayPrep';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TrackMemoryHub'>;

export function TrackMemoryHubScreen() {
  const navigation = useNavigation<Nav>();
  const memoryTracks = useMemo(() => listTrackMemoryTracks(), []);
  const [trackId, setTrackId] = useState<string | null>(
    memoryTracks.length === 1 ? memoryTracks[0].id : null
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const saved = await getTrackPrepSelectedTrack();
        if (cancelled || !saved) return;
        if (getTrackMemoryLayout(saved.trackId)) {
          setTrackId(saved.trackId);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const selectedName = useMemo(() => {
    if (!trackId) return null;
    return getTrackMemoryLayout(trackId)?.name ?? getTrackById(trackId)?.name ?? trackId;
  }, [trackId]);

  const handleSelectTrack = useCallback((track: TrackDefinition) => {
    if (!getTrackMemoryLayout(track.id)) return;
    setTrackId(track.id);
    void saveTrackPrepSelectedTrack({
      trackId: track.id,
      trackName: track.name,
    });
  }, []);

  const canPlay = Boolean(trackId && getTrackMemoryLayout(trackId));

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
        Pick a circuit with a baked layout, then ride the memory game — accel and brake only;
        the bike auto-steers the line.
      </Text>

      <TrackPicker
        selectedTrackId={trackId}
        onSelect={handleSelectTrack}
        allowedTrackIds={TRACK_MEMORY_TRACK_IDS}
      />

      {memoryTracks.length === 0 ? (
        <Text style={styles.hint}>No Track Memory layouts are available yet.</Text>
      ) : (
        <Text style={styles.hint}>
          {memoryTracks.length} Australian circuits ready — pick one and hit Play.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.navButton, !canPlay && styles.navButtonDisabled]}
        disabled={!canPlay}
        onPress={() => {
          if (!trackId) return;
          navigation.navigate('TrackMemory', { initialTrackId: trackId });
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Play Track Memory</Text>
        <Text style={styles.navSub}>
          {canPlay && selectedName
            ? `Start on ${selectedName}`
            : 'Select a track to play'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  navButton: {
    width: '100%',
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    minHeight: 56,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  navButtonDisabled: { opacity: 0.45, borderColor: '#64748b' },
  navButtonText: {
    fontFamily: 'RaceSport',
    fontSize: 17,
    color: '#f8fafc',
    marginBottom: 4,
  },
  navSub: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
});
