import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { OtherTrackContextForm } from '../components/OtherTrackContextForm';
import { PrivateSetupBanner } from '../components/PrivateSetupBanner';
import { TrackPicker } from '../components/TrackPicker';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import type { OtherTrackContext, TrackDefinition } from '../data/tracks';
import { getTrackById, isOtherTrackComplete } from '../data/tracks';
import { getTrackMemoryLayout } from '../trackMemory/layouts';
import {
  getTrackPrepSelectedTrack,
  saveTrackPrepSelectedTrack,
  type TrackPrepSelectedTrack,
} from '../storage/trackdayPrep';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

const DEFAULT_OTHER: OtherTrackContext = {
  customName: '',
  direction: 'unknown',
};

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'TrackPrep'>;

export function TrackPrepHubScreen() {
  const navigation = useNavigation<Nav>();
  const [trackId, setTrackId] = useState<string | null>(null);
  const [otherContext, setOtherContext] = useState<OtherTrackContext>(DEFAULT_OTHER);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const saved = await getTrackPrepSelectedTrack();
        if (cancelled || !saved) return;
        setTrackId(saved.trackId);
        if (saved.otherContext) setOtherContext(saved.otherContext);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const selectedTrack = useMemo(() => {
    if (!trackId) return null;
    if (trackId === 'other') {
      return {
        id: 'other',
        name: otherContext.customName.trim() || 'Other track',
      };
    }
    return getTrackById(trackId) ?? null;
  }, [trackId, otherContext.customName]);

  const trackReady = Boolean(
    trackId &&
      selectedTrack &&
      (trackId !== 'other' || isOtherTrackComplete(otherContext))
  );

  const persistSelection = useCallback(
    async (id: string, name: string, other?: OtherTrackContext) => {
      const payload: TrackPrepSelectedTrack = {
        trackId: id,
        trackName: name,
        otherContext: id === 'other' ? other : undefined,
      };
      await saveTrackPrepSelectedTrack(payload);
    },
    []
  );

  const handleSelectTrack = useCallback(
    (track: TrackDefinition) => {
      setTrackId(track.id);
      if (track.id !== 'other') {
        setOtherContext(DEFAULT_OTHER);
        void persistSelection(track.id, track.name);
      }
    },
    [persistSelection]
  );

  useEffect(() => {
    if (trackId !== 'other') return;
    if (!isOtherTrackComplete(otherContext)) return;
    void persistSelection('other', otherContext.customName.trim(), otherContext);
  }, [trackId, otherContext, persistSelection]);

  const trackParams = useMemo(() => {
    if (!trackId || !selectedTrack) return null;
    const name =
      trackId === 'other'
        ? otherContext.customName.trim() || 'Other track'
        : selectedTrack.name;
    return {
      trackId,
      trackName: name,
      otherContext: trackId === 'other' ? otherContext : undefined,
    };
  }, [trackId, selectedTrack, otherContext]);

  const memoryAvailable = trackId ? Boolean(getTrackMemoryLayout(trackId)) : false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoRow}>
        <AppLogo size={COMPACT_LOGO_SIZE} />
      </View>

      <PrivateSetupBanner detail="Pick a track once — Trackday Prep, Track Walk Notes, and Track Memory all use it." />

      <TrackPicker selectedTrackId={trackId} onSelect={handleSelectTrack} />
      {trackId === 'other' ? (
        <View style={styles.otherWrap}>
          <OtherTrackContextForm value={otherContext} onChange={setOtherContext} />
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Prep tools</Text>
      {!trackReady ? (
        <Text style={styles.hint}>Select a track to unlock the tools below.</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.navButton, !trackReady && styles.navButtonDisabled]}
        disabled={!trackReady || !trackParams}
        onPress={() => {
          if (!trackParams) return;
          navigation.navigate('TrackdayPrep', trackParams);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Trackday Prep</Text>
        <Text style={styles.navSub}>Mindset brief, weather, tyres — then Let&apos;s Go!</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !trackReady && styles.navButtonDisabled]}
        disabled={!trackReady || !trackParams}
        onPress={() => {
          if (!trackParams) return;
          navigation.navigate('TrackWalk', {
            initialTrackId: trackParams.trackId,
            initialTrackName: trackParams.trackName,
            otherContext: trackParams.otherContext,
          });
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Track Walk Notes</Text>
        <Text style={styles.navSub}>Corner notes and photos for this circuit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, (!trackReady || !memoryAvailable) && styles.navButtonDisabled]}
        disabled={!trackReady || !trackParams || !memoryAvailable}
        onPress={() => {
          if (!trackParams) return;
          navigation.navigate('TrackMemory', { initialTrackId: trackParams.trackId });
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Track Memory</Text>
        <Text style={styles.navSub}>
          {memoryAvailable
            ? 'Learn the layout before you ride'
            : 'Layout game not available for this track yet'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  logoRow: { alignItems: 'center', marginBottom: 12 },
  otherWrap: { marginTop: 12 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 20,
  },
  hint: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
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
