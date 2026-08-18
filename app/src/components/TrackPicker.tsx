import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingOverlay } from './KeyboardSafeView';
import { getAllTracks, type TrackDefinition } from '../data/tracks';

type Props = {
  selectedTrackId: string | null;
  onSelect: (track: TrackDefinition) => void;
  /** When set, only these catalog track ids are shown. */
  allowedTrackIds?: string[];
};

export function TrackPicker({ selectedTrackId, onSelect, allowedTrackIds }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const tracks = useMemo(() => {
    const all = getAllTracks();
    if (!allowedTrackIds?.length) return all;
    const allow = new Set(allowedTrackIds);
    return all.filter((t) => allow.has(t.id));
  }, [allowedTrackIds]);
  const selected = tracks.find((t) => t.id === selectedTrackId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((t) => t.name.toLowerCase().includes(q) || t.id.includes(q));
  }, [tracks, query]);

  return (
    <View>
      <Text style={styles.label}>Track</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.triggerText}>{selected?.name ?? 'Select a track…'}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <KeyboardAvoidingOverlay style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select track</Text>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search tracks…"
              placeholderTextColor="#64748b"
              autoFocus
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.map((track) => (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.option, track.id === selectedTrackId && styles.optionSelected]}
                  onPress={() => {
                    onSelect(track);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Text style={styles.optionText}>{track.name}</Text>
                  {track.isOther ? (
                    <Text style={styles.optionMeta}>Unknown circuit — extra details required</Text>
                  ) : (
                    <Text style={styles.optionMeta}>
                      {[track.lengthKm, track.direction !== 'unknown' ? track.direction : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingOverlay>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  triggerText: { fontSize: 16, color: '#f8fafc', flex: 1 },
  chevron: { color: '#94a3b8', fontSize: 12, marginLeft: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  search: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionSelected: { backgroundColor: 'rgba(245,158,11,0.1)' },
  optionText: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
  optionMeta: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  cancel: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  cancelText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
});
