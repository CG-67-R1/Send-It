import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BikeSetupHotspot } from '../data/bikeSetupBasics';

type Props = {
  hotspot: BikeSetupHotspot | null;
  onClose: () => void;
  onAskAi: (hotspot: BikeSetupHotspot) => void;
};

export function BikeSetupHotspotSheet({ hotspot, onClose, onAskAi }: Props) {
  const open = hotspot != null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {hotspot ? (
            <>
              <View style={styles.sheetHeader}>
                <View style={styles.kindRow}>
                  <View
                    style={[
                      styles.kindDot,
                      hotspot.kind === 'measure' ? styles.kindDotMeasure : styles.kindDotAdjust,
                    ]}
                  />
                  <Text style={styles.kindLabel}>
                    {hotspot.kind === 'measure' ? 'Measurement' : 'Adjustment'}
                  </Text>
                </View>
                <Text style={styles.sheetTitle}>{hotspot.title}</Text>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.body}>{hotspot.summary}</Text>

                <Text style={styles.sectionLabel}>Road riding base</Text>
                <Text style={styles.body}>{hotspot.roadBase}</Text>

                <Text style={styles.sectionLabel}>Race track base</Text>
                <Text style={styles.body}>{hotspot.trackBase}</Text>

                <Text style={styles.note}>{hotspot.capabilityNote}</Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() => onAskAi(hotspot)}
                activeOpacity={0.85}
              >
                <Text style={styles.aiBtnText}>Learn more with Bike Setup AI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '78%',
  },
  sheetHeader: {
    marginBottom: 8,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  kindDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  kindDotMeasure: {
    backgroundColor: '#ef4444',
  },
  kindDotAdjust: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  kindLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  sectionLabel: {
    marginTop: 14,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  body: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  note: {
    marginTop: 14,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  aiBtn: {
    marginTop: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  aiBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cancel: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
