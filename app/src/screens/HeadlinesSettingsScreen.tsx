import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getCustomSources,
  getPriorityOrder,
  setPriorityOrder,
  getNotifyPriority1,
  setNotifyPriority1,
  addCustomSource,
  removeCustomSource,
} from '../storage/headlinesSettings';
import { requestNotificationPermissions } from '../notifications/priority1Notifications';
import { SOURCES_URL } from '../../constants/api';
import type { CustomSource, PriorityOrder, Source } from '../types';
import { AppLogo } from '../components/AppLogo';

export function HeadlinesSettingsScreen() {
  const [builtinSources, setBuiltinSources] = useState<Source[]>([]);
  const [customSources, setCustomSourcesState] = useState<CustomSource[]>([]);
  const [priority, setPriorityState] = useState<PriorityOrder>([]);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [notifyPriority1, setNotifyPriority1State] = useState(false);

  const allSources: Source[] = [
    ...builtinSources,
    ...customSources.map((s) => ({ id: s.id, name: s.name })),
  ];

  const load = useCallback(async () => {
    const [order, custom, notify] = await Promise.all([
      getPriorityOrder(),
      getCustomSources(),
      getNotifyPriority1(),
    ]);
    setPriorityState(order);
    setCustomSourcesState(custom);
    setNotifyPriority1State(notify);
    try {
      const res = await fetch(SOURCES_URL, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.sources) setBuiltinSources(data.sources);
    } catch {
      setBuiltinSources([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // When built-in sources first load, if priority is empty init from built-in order
  useEffect(() => {
    if (builtinSources.length > 0 && priority.length === 0) {
      const ids = builtinSources.map((s) => s.id);
      setPriorityState(ids);
      setPriorityOrder(ids);
    }
  }, [builtinSources.length]);

  const handleSelectSource = useCallback(
    async (slotIndex: number, sourceId: string) => {
      const current = priority[slotIndex];
      if (current === sourceId) {
        setPickerSlot(null);
        return;
      }
      const next = [...priority];
      const swapIdx = next.indexOf(sourceId);
      if (swapIdx >= 0) next[swapIdx] = current;
      next[slotIndex] = sourceId;
      setPriorityState(next);
      await setPriorityOrder(next);
      setPickerSlot(null);
    },
    [priority]
  );

  const handleAddCustom = useCallback(async () => {
    const url = addUrl.trim();
    const name = addName.trim();
    if (!url || !name) return;
    setAdding(true);
    try {
      const newSource = await addCustomSource(url, name);
      setCustomSourcesState((prev) => [...prev, newSource]);
      setPriorityState((prev) => [...prev, newSource.id]);
      await setPriorityOrder([...priority, newSource.id]);
      setAddUrl('');
      setAddName('');
    } finally {
      setAdding(false);
    }
  }, [addUrl, addName, priority]);

  const handleRemoveCustom = useCallback(
    (id: string) => {
      Alert.alert('Remove source', 'Remove this custom source?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCustomSource(id);
            setCustomSourcesState((prev) => prev.filter((s) => s.id !== id));
            setPriorityState((prev) => prev.filter((sid) => sid !== id));
            await setPriorityOrder(priority.filter((sid) => sid !== id));
          },
        },
      ]);
    },
    [priority]
  );

  const handleNotifyPriority1Toggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications',
          'Permission was denied. Enable notifications in your device settings to get alerts for Priority 1 news.'
        );
        return;
      }
    }
    setNotifyPriority1State(value);
    await setNotifyPriority1(value);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoRow}>
        <AppLogo size={28} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionSubtitle}>
          When new headlines appear from your Priority 1 source (e.g. when you open the app or refresh), show a notification.
        </Text>
        <View style={styles.notifyRow}>
          <Text style={styles.notifyLabel}>Notify for Priority 1 news</Text>
          <Switch
            value={notifyPriority1}
            onValueChange={handleNotifyPriority1Toggle}
            trackColor={{ false: '#334155', true: '#f59e0b' }}
            thumbColor="#f8fafc"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source priority</Text>
        <Text style={styles.sectionSubtitle}>1 = first on the Headlines page. Tap to change.</Text>
        {priority.map((sourceId, index) => {
          const source = allSources.find((s) => s.id === sourceId);
          return (
            <View key={`${sourceId}-${index}`} style={styles.priorityRow}>
              <Text style={styles.priorityNum}>{index + 1}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setPickerSlot(index)}
              >
                <Text style={styles.pickerButtonText} numberOfLines={1}>
                  {source?.name ?? sourceId}
                </Text>
                <Text style={styles.pickerChevron}>▼</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom sources</Text>
        <Text style={styles.sectionSubtitle}>Add an RSS feed URL. It will appear in the priority list above.</Text>
        <TextInput
          style={styles.input}
          placeholder="Feed URL (e.g. https://example.com/feed.xml)"
          placeholderTextColor="#64748b"
          value={addUrl}
          onChangeText={setAddUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor="#64748b"
          value={addName}
          onChangeText={setAddName}
        />
        <TouchableOpacity
          style={[styles.addButton, adding && styles.addButtonDisabled]}
          onPress={handleAddCustom}
          disabled={adding || !addUrl.trim() || !addName.trim()}
        >
          <Text style={styles.addButtonText}>Add source</Text>
        </TouchableOpacity>

        {customSources.length > 0 && (
          <View style={styles.customList}>
            <Text style={styles.customListTitle}>Your custom sources</Text>
            {customSources.map((s) => (
              <View key={s.id} style={styles.customRow}>
                <View style={styles.customRowText}>
                  <Text style={styles.customName}>{s.name}</Text>
                  <Text style={styles.customUrl} numberOfLines={1}>{s.url}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveCustom(s.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={pickerSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerSlot(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerSlot(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select source for position {(pickerSlot ?? 0) + 1}</Text>
            <ScrollView style={styles.modalList}>
              {allSources.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.modalOption}
                  onPress={() => pickerSlot !== null && handleSelectSource(pickerSlot, s.id)}
                >
                  <Text style={styles.modalOptionText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerSlot(null)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  logoRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  notifyLabel: { fontSize: 16, color: '#e2e8f0', flex: 1 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priorityNum: { width: 28, fontSize: 16, fontWeight: '600', color: '#f59e0b' },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  pickerButtonText: { fontSize: 16, color: '#e2e8f0', flex: 1 },
  pickerChevron: { fontSize: 10, color: '#64748b', marginLeft: 8 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 16 },
  customList: { marginTop: 16 },
  customListTitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
  },
  customRowText: { flex: 1 },
  customName: { fontSize: 16, color: '#e2e8f0', fontWeight: '500' },
  customUrl: { fontSize: 12, color: '#64748b', marginTop: 2 },
  removeButton: { paddingVertical: 8, paddingHorizontal: 12 },
  removeButtonText: { color: '#f87171', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '70%',
  },
  modalTitle: { padding: 16, fontSize: 18, fontWeight: '600', color: '#f8fafc' },
  modalList: { maxHeight: 320 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  modalOptionText: { fontSize: 16, color: '#e2e8f0' },
  modalClose: { padding: 16, alignItems: 'center' },
  modalCloseText: { color: '#94a3b8', fontSize: 16 },
});
