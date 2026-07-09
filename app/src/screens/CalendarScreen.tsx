import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import { CALENDAR_URL } from '../../constants/api';
import type { CalendarEvent } from '../types';
import { AppLogo } from '../components/AppLogo';

const SERIES_COLORS: Record<string, string> = {
  motogp: '#e11d48',
  worldsbk: '#0ea5e9',
  asbk: '#f59e0b',
  au_club: '#f59e0b',
  au_national: '#f59e0b',
  australia: '#f59e0b',
  ASBK: '#f59e0b',
};

type CalendarFilter = 'all' | 'australia' | 'world';

const AU_SERIES = new Set(['asbk', 'au_club', 'au_national', 'australia']);

function isAustraliaEvent(item: CalendarEvent): boolean {
  return AU_SERIES.has(item.series) || item.detailTier === 'full' || item.country === 'Australia';
}

function filterEvents(events: CalendarEvent[], filter: CalendarFilter): CalendarEvent[] {
  if (filter === 'australia') return events.filter(isAustraliaEvent);
  if (filter === 'world') return events.filter((e) => !isAustraliaEvent(e));
  return events;
}

function formatDateRange(start: string, end: string): string {
  if (!start) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (start === end) {
    return s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function getSeriesColor(series: string): string {
  return SERIES_COLORS[series] ?? '#64748b';
}

/** Build start/end Date for an all-day event (local midnight). */
function eventDates(startDate: string, endDate: string): { start: Date; end: Date } {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = isRefresh ? `${CALENDAR_URL}?refresh=1` : CALENDAR_URL;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      const list = Array.isArray(data.events) ? data.events : [];
      setEvents(list);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load calendar';
      setError(message);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCalendar(false);
    }, [fetchCalendar])
  );

  const openLink = (url: string | null) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const addReminder = useCallback(async (item: CalendarEvent) => {
    try {
      const available = await Calendar.isAvailableAsync();
      if (!available) {
        Alert.alert('Not available', 'Calendar is not available on this device.');
        return;
      }
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Calendar access',
          'Allow calendar access to add this event and set a reminder.',
          [{ text: 'OK' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
        return;
      }
      const { start, end } = eventDates(item.startDate, item.endDate);
      const location = [item.venue, item.country].filter(Boolean).join(', ');
      const notes = item.url ? `Added from RoadRacer\n${item.url}` : 'Added from RoadRacer';
      await Calendar.createEventInCalendarAsync({
        title: `${item.seriesLabel}: ${item.title}`,
        startDate: start,
        endDate: end,
        allDay: true,
        location: location || undefined,
        notes,
        alarms: [{ relativeOffset: -24 * 60 }], // 1 day before
      });
      Alert.alert('Added', 'Event added to your calendar. You can set or change the reminder there.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not add to calendar';
      Alert.alert('Error', message);
    }
  }, []);

  const renderItem = ({ item }: { item: CalendarEvent }) => (
    <View style={[styles.item, { borderLeftColor: getSeriesColor(item.series) }]}>
      <TouchableOpacity
        onPress={() => openLink(item.url)}
        activeOpacity={0.7}
        disabled={!item.url}
        style={styles.itemContent}
      >
        <View style={styles.itemHeader}>
          <Text style={[styles.series, { color: getSeriesColor(item.series) }]}>{item.seriesLabel}</Text>
          <Text style={styles.date}>{formatDateRange(item.startDate, item.endDate)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {(item.venue || item.country) && (
          <Text style={styles.venue} numberOfLines={1}>
            {[item.venue, item.country].filter(Boolean).join(', ')}
          </Text>
        )}
        {item.detailTier === 'full' && (item.state || item.organiser) && (
          <Text style={styles.auDetail} numberOfLines={1}>
            {[item.state, item.organiser].filter(Boolean).join(' • ')}
          </Text>
        )}
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
        ) : null}
        {item.url ? <Text style={styles.tapHint}>Tap to open link →</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.reminderButton}
        onPress={() => addReminder(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.reminderButtonText}>+ Add reminder</Text>
      </TouchableOpacity>
    </View>
  );

  const keyExtractor = (item: CalendarEvent) => `${item.series}-${item.startDate}-${item.title}`;

  if (loading && events.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading calendar…</Text>
      </View>
    );
  }

  if (error && events.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>Start the API server (in /api run: npm start)</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchCalendar(false)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredEvents = filterEvents(events, filter);

  return (
    <FlatList
      data={filteredEvents}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchCalendar(true)}
          tintColor="#f59e0b"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <AppLogo size={80} />
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSubtitle}>
            Australian club & state road racing • MotoGP • WorldSBK. Tap to open links.
          </Text>
          <View style={styles.filterRow}>
            {(['all', 'australia', 'world'] as CalendarFilter[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, filter === key && styles.filterChipActive]}
                onPress={() => setFilter(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>
                  {key === 'all' ? 'All' : key === 'australia' ? 'Australia' : 'World'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    textAlign: 'center',
  },
  hint: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 48,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    minHeight: 36,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterChipTextActive: {
    color: '#0f172a',
  },
  item: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  itemContent: {
    padding: 16,
    paddingBottom: 8,
    minHeight: 60,
  },
  tapHint: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 6,
    fontWeight: '600',
  },
  reminderButton: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    minHeight: 44,
  },
  reminderButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  series: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
  },
  title: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 22,
    fontWeight: '600',
  },
  venue: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  auDetail: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '500',
  },
  notes: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
