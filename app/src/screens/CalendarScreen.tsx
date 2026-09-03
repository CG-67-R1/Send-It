import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import { apiFetch, CALENDAR_URL } from '../../constants/api';
import { safeOpenUrl } from '../utils/safeOpenUrl';
import {
  buildEventIcs,
  eventIcsFilename,
  localEndOfDayFromIso,
  localMidnightFromIso,
  openEventIcsInBrowser,
} from '../utils/eventIcs';
import type { CalendarEvent } from '../types';
import { AppLogo } from '../components/AppLogo';
import { SCREEN_LOGO_SIZE } from '../constants/logoSizing';
import {
  getI18nString,
  getLocalCountryNames,
  getLocalSeriesIds,
  getLocalUiLabel,
  getPrimaryLocale,
} from '../packs/loader';

const SERIES_COLORS: Record<string, string> = {
  motogp: '#e11d48',
  worldsbk: '#0ea5e9',
  asbk: '#f59e0b',
  au_club: '#f59e0b',
  au_track_day: '#f59e0b',
  au_national: '#f59e0b',
  australia: '#f59e0b',
  bsb: '#f59e0b',
  uk_club: '#f59e0b',
  esbk: '#f59e0b',
  civ: '#f59e0b',
};

type CalendarFilter = 'all' | 'local' | 'world';

function isLocalEvent(item: CalendarEvent): boolean {
  const localSeries = getLocalSeriesIds();
  const localCountries = getLocalCountryNames();
  return (
    localSeries.has(item.series) ||
    item.detailTier === 'full' ||
    (!!item.country && localCountries.has(item.country))
  );
}

/** Keep events that have not finished yet (end date is today or later). */
function isUpcomingOrOngoing(item: CalendarEvent): boolean {
  const endDate = item.endDate || item.startDate;
  if (!endDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return end >= today;
}

function filterEvents(events: CalendarEvent[], filter: CalendarFilter): CalendarEvent[] {
  const upcoming = events.filter(isUpcomingOrOngoing);
  if (filter === 'local') return upcoming.filter(isLocalEvent);
  if (filter === 'world') return upcoming.filter((e) => !isLocalEvent(e));
  return upcoming;
}

function formatDateRange(start: string, end: string): string {
  if (!start) return '';
  const locale = getPrimaryLocale();
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (start === end) {
    return startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    return `${startDate.getDate()}–${endDate.getDate()} ${startDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' })}`;
  }
  return `${startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function getSeriesColor(series: string): string {
  return SERIES_COLORS[series.toLowerCase()] ?? '#64748b';
}

function eventTitle(item: CalendarEvent): string {
  return `${item.seriesLabel}: ${item.title}`;
}

function eventLocation(item: CalendarEvent): string {
  return [item.venue, item.country].filter(Boolean).join(', ');
}

function eventNotes(item: CalendarEvent): string {
  return item.url ? `Added from RoadRacer\n${item.url}` : 'Added from RoadRacer';
}

function addEventIcsOnWeb(item: CalendarEvent): void {
  const title = eventTitle(item);
  const ics = buildEventIcs({
    title,
    startDate: item.startDate,
    endDate: item.endDate,
    location: eventLocation(item) || undefined,
    description: eventNotes(item),
    uid: `${item.series}-${item.startDate}-${item.title}@roadracer.app`,
  });
  openEventIcsInBrowser(ics, eventIcsFilename(title));
}

async function getWritableCalendar(): Promise<Calendar.ExpoCalendar | null> {
  if (Platform.OS === 'ios') {
    try {
      return Calendar.getDefaultCalendarSync();
    } catch {
      // Fall through to listing calendars (needed on some devices).
    }
  }
  const calendars = await Calendar.getCalendars(
    Platform.OS === 'ios' ? Calendar.EntityTypes.EVENT : undefined
  );
  return (
    calendars.find((c) => c.allowsModifications && c.isPrimary) ??
    calendars.find((c) => c.allowsModifications) ??
    null
  );
}

export function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState<CalendarFilter>('local');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = isRefresh ? `${CALENDAR_URL}?refresh=1` : CALENDAR_URL;
      const res = await apiFetch(url, {
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : `Calendar API returned ${res.status}`);
      }
      const list = Array.isArray(data.events) ? data.events : [];
      setEvents(list);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Failed to load calendar';
      const message = /network request failed|timed out|timeout/i.test(raw)
        ? 'Could not reach the server. Check your connection and that the API is running.'
        : raw;
      setError(message);
      setEvents((current) => (current.length > 0 ? current : []));
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
    if (url) void safeOpenUrl(url);
  };

  const addReminder = useCallback(async (item: CalendarEvent) => {
    try {
      if (Platform.OS === 'web') {
        addEventIcsOnWeb(item);
        return;
      }
      const { status } = await Calendar.requestCalendarPermissions();
      if (status !== 'granted') {
        Alert.alert(
          'Calendar access',
          'Allow calendar access to add this event and set a reminder.',
          [{ text: 'OK' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
        return;
      }
      const calendar = await getWritableCalendar();
      if (!calendar) {
        Alert.alert('Not available', 'No writable calendar was found on this device.');
        return;
      }
      const result = await calendar.addEventWithForm({
        title: eventTitle(item),
        startDate: localMidnightFromIso(item.startDate),
        endDate: localEndOfDayFromIso(item.endDate),
        allDay: true,
        location: eventLocation(item) || undefined,
        notes: eventNotes(item),
        alarms: [{ relativeOffset: -24 * 60 }],
      });
      if (result.action === Calendar.CalendarDialogResultActions.canceled) {
        return;
      }
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

  const filteredEvents = useMemo(
    () => filterEvents(events, filter),
    [events, filter]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <AppLogo size={SCREEN_LOGO_SIZE} />
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSubtitle}>
          {getLocalUiLabel()} club & state road racing • MotoGP • WorldSBK. Tap to open links.
        </Text>
        <View style={styles.filterRow}>
          {(['local', 'world', 'all'] as CalendarFilter[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filter === key && styles.filterChipActive]}
              onPress={() => setFilter(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === key && styles.filterChipTextActive]}>
                {key === 'all'
                  ? 'All'
                  : key === 'local'
                    ? getI18nString('localCalendar', getLocalUiLabel())
                    : getI18nString('worldFeed', 'World')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    [filter]
  );

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
        <Text style={styles.hint}>
          {Platform.OS === 'web'
            ? 'Could not reach the API. Check your connection and try again.'
            : 'Start the API server (in /api run: npm start)'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchCalendar(false)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      key={filter}
      data={filteredEvents}
      extraData={`${filter}-${events.length}`}
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
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <Text style={styles.emptyFilterText}>No events match this filter.</Text>
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
  emptyFilterText: {
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    fontSize: 14,
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
    gap: 12,
    marginTop: 12,
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  filterChip: {
    flex: 1,
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
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
