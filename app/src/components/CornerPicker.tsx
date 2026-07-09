import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CornerDefinition, CornerDirection } from '../data/tracks';
import { formatCornerHeading } from '../data/tracks';

const DIRECTIONS: { id: CornerDirection; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'straight', label: 'Straight' },
  { id: 'complex', label: 'Complex' },
];

type Props = {
  corners: CornerDefinition[];
  selectedCornerId: string | null;
  isOtherTrack: boolean;
  direction: CornerDirection | null;
  onSelectCorner: (corner: CornerDefinition) => void;
  onSelectDirection: (direction: CornerDirection) => void;
};

export function CornerPicker({
  corners,
  selectedCornerId,
  isOtherTrack,
  direction,
  onSelectCorner,
  onSelectDirection,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = corners.find((c) => c.id === selectedCornerId);

  const label = useMemo(() => {
    if (!selected) return 'Select corner…';
    return formatCornerHeading(selected);
  }, [selected]);

  return (
    <View>
      <Text style={styles.label}>Corner</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.triggerText}>{label}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      {isOtherTrack && selected && !selected.isFinish && (
        <View style={styles.directionRow}>
          <Text style={styles.directionLabel}>Turn direction</Text>
          <View style={styles.directionButtons}>
            {DIRECTIONS.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.dirBtn, direction === d.id && styles.dirBtnActive]}
                onPress={() => onSelectDirection(d.id)}
              >
                <Text style={[styles.dirBtnText, direction === d.id && styles.dirBtnTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select corner</Text>
            <ScrollView>
              {corners.map((corner) => (
                <TouchableOpacity
                  key={corner.id}
                  style={[styles.option, corner.id === selectedCornerId && styles.optionSelected]}
                  onPress={() => {
                    onSelectCorner(corner);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{formatCornerHeading(corner)}</Text>
                  {corner.approachFrom ? (
                    <Text style={styles.optionMeta}>Approach: {corner.approachFrom}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  triggerText: { fontSize: 15, color: '#f8fafc', flex: 1 },
  chevron: { color: '#94a3b8', fontSize: 12, marginLeft: 8 },
  directionRow: { marginBottom: 12 },
  directionLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  directionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dirBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
  },
  dirBtnActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)' },
  dirBtnText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  dirBtnTextActive: { color: '#f59e0b' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    padding: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
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
