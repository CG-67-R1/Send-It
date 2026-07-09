import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { interleaveAuQuota, LOCAL_SOURCE_IDS } from '../utils/headlinesFeed';

function HeadlineThumbnail({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={styles.thumbnail}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

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
  const [viewMode, setViewMode] = useState<'world' | 'local' | 'custom'>('world');
  const [customSourceIds, setCustomSourceIds] = useState<string[]>([]);

  const fetchHeadlines = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [priorityOrder, customSources] = await Promise.all([
        getPriorityOrder(),
        getCustomSources(),
      ]);

      setCustomSourceIds(customSources.map((s) => s.id));

      const url = isRefresh ? `${HEADLINES_URL}?refresh=1` : HEADLINES_URL;
      const timeoutMs = isRefresh ? 90000 : 45000;
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        throw new Error(`Headlines API returned ${res.status}`);
      }
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
            signal: AbortSignal.timeout(20000),
          });
          if (customRes.ok) {
            const customData = await customRes.json();
            if (Array.isArray(customData.headlines)) list = [...list, ...customData.headlines];
          }
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
      if (!isRefresh) setHeadlines([]);
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
      <View style={styles.itemRow}>
        {item.imageUrl ? (
          <HeadlineThumbnail uri={item.imageUrl} />
        ) : null}
        <View style={styles.itemBody}>
          <Text style={styles.source}>{item.source}</Text>
          <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.tapHint}>Tap to open link →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const keyExtractor = (item: Headline) => item.url;

  const filteredHeadlines = useMemo(() => {
    if (viewMode === 'custom') {
      if (customSourceIds.length === 0) return [];
      return headlines.filter((h) => customSourceIds.includes(h.sourceId));
    }
    if (viewMode === 'local') {
      return headlines.filter((h) => LOCAL_SOURCE_IDS.includes(h.sourceId as (typeof LOCAL_SOURCE_IDS)[number]));
    }
    const pool = headlines.filter((h) => !customSourceIds.includes(h.sourceId));
    return interleaveAuQuota(pool);
  }, [headlines, viewMode, customSourceIds]);

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
      data={filteredHeadlines}
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
          <AppLogo size={80} />
          <Text style={styles.headerTitle}>Bike News</Text>
          <Text style={styles.headerSubtitle}>
            Tap to open • Pull down to refresh • Order in News settings
          </Text>
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                viewMode === 'world' && styles.modeButtonActive,
              ]}
              onPress={() => setViewMode('world')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  viewMode === 'world' && styles.modeButtonTextActive,
                ]}
              >
                World
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                viewMode === 'local' && styles.modeButtonActive,
              ]}
              onPress={() => setViewMode('local')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  viewMode === 'local' && styles.modeButtonTextActive,
                ]}
              >
                Aus
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                viewMode === 'custom' && styles.modeButtonActive,
              ]}
              onPress={() => setViewMode('custom')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  viewMode === 'custom' && styles.modeButtonTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeHint}>
            World: mixed feed (1 in 4 AU) • Aus: Australian only • Custom: your feeds
          </Text>
        </View>
      }
      ListEmptyComponent={
        !loading && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No headlines in this view yet</Text>
            <Text style={styles.emptySubtitle}>
              {viewMode === 'custom'
                ? 'Add up to 4 custom feeds in News settings.'
                : viewMode === 'local'
                ? 'No recent Australian headlines were found. Try World view.'
                : 'No headlines available right now. Pull down to refresh.'}
            </Text>
          </View>
        ) : null
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
  },
  modeSwitcher: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#020617',
    borderRadius: 999,
    padding: 3,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#f59e0b',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  modeButtonTextActive: {
    color: '#0f172a',
  },
  modeHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#94a3b8',
  },
  item: {
    marginBottom: 12,
    padding: 12,
    minHeight: 72,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
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
  emptyState: {
    paddingTop: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
