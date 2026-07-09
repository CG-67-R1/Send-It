import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { OtherTrackContext, OtherTrackDirection } from '../data/tracks';

const DIRECTIONS: { id: OtherTrackDirection; label: string }[] = [
  { id: 'clockwise', label: 'Clockwise' },
  { id: 'anticlockwise', label: 'Anticlockwise' },
  { id: 'unknown', label: 'Unknown' },
];

type Props = {
  value: OtherTrackContext;
  onChange: (ctx: OtherTrackContext) => void;
};

export function OtherTrackContextForm({ value, onChange }: Props) {
  const set = (patch: Partial<OtherTrackContext>) => onChange({ ...value, ...patch });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Other track details</Text>
      <Text style={styles.subtitle}>
        Help your coach with context — this track is not in our knowledge base.
      </Text>

      <Text style={styles.label}>Track name *</Text>
      <TextInput
        style={styles.input}
        value={value.customName}
        onChangeText={(customName) => set({ customName })}
        placeholder="e.g. Suzuka, local club circuit"
        placeholderTextColor="#64748b"
        maxLength={80}
      />

      <Text style={styles.label}>Direction *</Text>
      <View style={styles.row}>
        {DIRECTIONS.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.chip, value.direction === d.id && styles.chipActive]}
            onPress={() => set({ direction: d.id })}
          >
            <Text style={[styles.chipText, value.direction === d.id && styles.chipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Country / region</Text>
      <TextInput
        style={styles.input}
        value={value.country ?? ''}
        onChangeText={(country) => set({ country })}
        placeholder="e.g. Japan, NSW"
        placeholderTextColor="#64748b"
        maxLength={60}
      />

      <Text style={styles.label}>Layout</Text>
      <TextInput
        style={styles.input}
        value={value.layout ?? ''}
        onChangeText={(layout) => set({ layout })}
        placeholder="e.g. full GP, short circuit"
        placeholderTextColor="#64748b"
        maxLength={80}
      />

      <Text style={styles.label}>Length</Text>
      <TextInput
        style={styles.input}
        value={value.length ?? ''}
        onChangeText={(length) => set({ length })}
        placeholder="e.g. 4.5 km"
        placeholderTextColor="#64748b"
        maxLength={30}
      />

      <Text style={styles.label}>Surface / grip</Text>
      <TextInput
        style={styles.input}
        value={value.surfaceNotes ?? ''}
        onChangeText={(surfaceNotes) => set({ surfaceNotes })}
        placeholder="e.g. newly resurfaced, dusty"
        placeholderTextColor="#64748b"
        maxLength={120}
      />

      <Text style={styles.label}>Anything else</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={value.additionalNotes ?? ''}
        onChangeText={(additionalNotes) => set({ additionalNotes })}
        placeholder="Elevation, wind, unique features…"
        placeholderTextColor="#64748b"
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#94a3b8', lineHeight: 18, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#f8fafc',
    marginBottom: 8,
  },
  multiline: { minHeight: 72 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
  },
  chipActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  chipTextActive: { color: '#f59e0b' },
});
