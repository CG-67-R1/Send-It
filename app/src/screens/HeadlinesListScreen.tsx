import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { HEADLINES_URL, HEADLINES_CUSTOM_URL } from '../../constants/api';
import {
  getCustomSources,
  getPriorityOrder,
  getNotifyPriority1,
  getLastSeenPriority1Urls,
  setLastSeenPriority1Urls,
} from '../storage/headlinesSettings';
import { notifyNewPriority1Headlines } from '../notifications/priority1Notifications';
import type { Headline } from '../types';
import { AppLogo } from '../components/AppLogo';

function sortByPriority(headlines: Headline[], priorityOrder: string[]): Headline[] {
  const orderMap = new Map(priorityOrder.map((id, i) => [id, i]));
  return [...headlines].sort((a, b) => {
    const pa = orderMap.get(a.sourceId) ?? 9999;
    const pb = orderMap.get(b.sourceId) ?? 9999;
    if (pa !== pb) return pa - pb;
    return (a.title || '').localeCompare(b.title || '');
  });
}

export function HeadlinesListScreen() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHeadlines = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [priorityOrder, customSources] = await Promise.all([
        getPriorityOrder(),
        getCustomSources(),
      ]);

      const url = isRefresh ? `${HEADLINES_URL}?refresh=1` : HEADLINES_URL;
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      const data = await res.json();
      let list: Headline[] = Array.isArray(data.headlines) ? data.headlines : [];
      list = list.map((h: Headline) => ({ ...h, sourceId: h.sourceId || h.source?.toLowerCase().replace(/\s+/g, '_') || 'unknown' }));

      if (customSources.length > 0) {
        try {
          const customRes = await fetch(HEADLINES_CUSTOM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customSources: customSources.map((s) => ({ url: s.url, name: s.name, id: s.id })),
            }),
            signal: AbortSignal.timeout(15000),
          });
          const customData = await customRes.json();
          if (Array.isArray(customData.headlines)) list = [...list, ...customData.headlines];
        } catch {
          // ignore custom fetch failure
        }
      }

      const sorted = sortByPriority(list, priorityOrder);
      setHeadlines(sorted);

      const notifyEnabled = await getNotifyPriority1();
      if (notifyEnabled && priorityOrder.length > 0) {
        const p1SourceId = priorityOrder[0];
        const p1Headlines = sorted.filter((h) => h.sourceId === p1SourceId);
        const p1Urls = p1Headlines.map((h) => h.url).filter(Boolean);
        const lastSeen = await getLastSeenPriority1Urls();
        const newUrls = p1Urls.filter((u) => !lastSeen.includes(u));
        if (newUrls.length > 0 && lastSeen.length > 0 && p1Headlines[0]) {
          await notifyNewPriority1Headlines(p1Headlines[0].source, newUrls.length);
        }
        if (p1Urls.length > 0) {
          await setLastSeenPriority1Urls(p1Urls);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load headlines';
      setError(message);
      setHeadlines([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHeadlines(false);
    }, [fetchHeadlines])
  );

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const renderItem = ({ item }: { item: Headline }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => openLink(item.url)}
      activeOpacity={0.7}
    >
      <Text style={styles.source}>{item.source}</Text>
      <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
      <Text style={styles.tapHint}>Tap to open link →</Text>
    </TouchableOpacity>
  );

  const keyExtractor = (item: Headline) => item.url;

  if (loading && headlines.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading headlines…</Text>
      </View>
    );
  }

  if (error && headlines.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>Start the API server (in /api run: npm start)</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchHeadlines(false)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={headlines}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchHeadlines(true)}
          tintColor="#f59e0b"
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <AppLogo size={32} />
          <Text style={styles.headerTitle}>Bike News</Text>
          <Text style={styles.headerSubtitle}>Tap to open • Pull down to refresh • Order in Headlines settings</Text>
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
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    gap: 8,
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
  },
  item: {
    marginBottom: 12,
    padding: 16,
    minHeight: 72,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tapHint: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 8,
    fontWeight: '600',
  },
  source: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 22,
  },
});
