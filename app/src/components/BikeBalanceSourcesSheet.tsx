import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CalcResult } from '../calc/bikeBalance';

type Props = {
  result: CalcResult | null;
  visible: boolean;
  onClose: () => void;
};

export function BikeBalanceSourcesSheet({ result, visible, onClose }: Props) {
  const inputLines = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.inputsUsed).map(([k, v]) => `${k}: ${v}`);
  }, [result]);

  if (!result) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Why this number</Text>
          <Text style={styles.eqId}>{result.equationId}</Text>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{result.name}</Text>

            <Text style={styles.label}>Formula</Text>
            <Text style={styles.mono}>{result.formula}</Text>

            {result.value != null ? (
              <>
                <Text style={styles.label}>Value</Text>
                <Text style={styles.value}>
                  {result.value.toFixed(3)} {result.unit}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Unavailable</Text>
                <Text style={styles.warn}>{result.unavailableReason}</Text>
              </>
            )}

            {result.warning ? (
              <>
                <Text style={styles.label}>Warning</Text>
                <Text style={styles.warn}>{result.warning}</Text>
              </>
            ) : null}

            <Text style={styles.label}>Inputs used</Text>
            {inputLines.length ? (
              inputLines.map((line) => (
                <Text key={line} style={styles.mono}>
                  {line}
                </Text>
              ))
            ) : (
              <Text style={styles.muted}>None (result not computed)</Text>
            )}

            <Text style={styles.label}>Sources</Text>
            {result.publicRefs.map((ref) => (
              <Text key={ref} style={styles.value}>
                • {ref}
              </Text>
            ))}

            <Text style={styles.disclaimer}>
              Informational setup aid only. Not affiliated with Zero Chassis Software. Prefer
              Ref→proposal deltas over absolute numbers; have safety-critical work checked by a
              qualified technician.
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  eqId: {
    marginTop: 4,
    marginBottom: 12,
    color: '#f59e0b',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  body: {
    marginBottom: 12,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
  },
  mono: {
    color: '#cbd5e1',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  muted: {
    color: '#64748b',
    fontSize: 14,
  },
  warn: {
    color: '#fbbf24',
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    marginTop: 16,
    marginBottom: 8,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  closeBtn: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16,
  },
});
