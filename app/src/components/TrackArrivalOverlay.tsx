import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  checkTrackArrival,
  markRemindedForTrack,
  snoozeTrackFor48Hours,
  type TrackArrivalDetection,
} from '../location/trackGeofence';
import { fetchTrackWeather, type TrackWeatherSummary } from '../location/trackWeather';
import { buildArrivalCoachDraft } from '../utils/arrivalCoachDraft';
import { navigateToCoachWithDraft } from '../navigation/rootNavigation';

export function TrackArrivalOverlay() {
  const insets = useSafeAreaInsets();
  const [arrival, setArrival] = useState<TrackArrivalDetection | null>(null);
  const [weather, setWeather] = useState<TrackWeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [openingCoach, setOpeningCoach] = useState(false);
  const dismissedSessionRef = useRef<string | null>(null);
  const checkingRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (Platform.OS === 'web' || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const result = await checkTrackArrival();
      if (!result) {
        setArrival(null);
        return;
      }
      if (dismissedSessionRef.current === result.match.trackId) return;
      setArrival(result);
      setWeather(null);
      setWeatherLoading(true);
      const weatherSummary = await fetchTrackWeather(result.userLat, result.userLng);
      setWeather(weatherSummary);
    } catch {
      // GPS or permission failure — skip silently
    } finally {
      setWeatherLoading(false);
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const dismiss = useCallback(async () => {
    if (!arrival) return;
    dismissedSessionRef.current = arrival.match.trackId;
    await markRemindedForTrack(arrival.match.trackId);
    setArrival(null);
  }, [arrival]);

  const handleSnooze = useCallback(async () => {
    if (!arrival) return;
    await snoozeTrackFor48Hours(arrival.match.trackId);
    dismissedSessionRef.current = arrival.match.trackId;
    setArrival(null);
  }, [arrival]);

  const handleOpenCoach = useCallback(async () => {
    if (!arrival || openingCoach) return;
    setOpeningCoach(true);
    try {
      let weatherSummary = weather;
      if (!weatherSummary && !weatherLoading) {
        weatherSummary = await fetchTrackWeather(arrival.userLat, arrival.userLng);
        setWeather(weatherSummary);
      }
      const draft = buildArrivalCoachDraft(arrival.match.name, weatherSummary);
      await markRemindedForTrack(arrival.match.trackId);
      dismissedSessionRef.current = arrival.match.trackId;
      setArrival(null);

      navigateToCoachWithDraft(draft);
    } finally {
      setOpeningCoach(false);
    }
  }, [arrival, openingCoach, weather, weatherLoading]);

  if (!arrival) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => void dismiss()} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.message}>
          We see you have arrived at <Text style={styles.trackName}>{arrival.match.name}</Text> track.
          Start thinking about what you want to achieve with your riding today and open a chat with your
          coach to get started.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, openingCoach && styles.btnDisabled]}
            onPress={() => void handleOpenCoach()}
            disabled={openingCoach}
            activeOpacity={0.85}
          >
            {openingCoach ? (
              <ActivityIndicator color="#0f172a" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Open coach</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => void handleSnooze()} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>Snooze 48 hrs</Text>
          </TouchableOpacity>
        </View>
        {weatherLoading ? (
          <Text style={styles.weatherHint}>Loading conditions…</Text>
        ) : weather ? (
          <Text style={styles.weatherHint}>Conditions: {weather.summary}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 16,
    paddingTop: 36,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    padding: 4,
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  trackName: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 14,
  },
  weatherHint: {
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 13,
  },
});
