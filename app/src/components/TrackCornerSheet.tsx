import React, { useCallback, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { GpxTrackMap } from '../data/gpxTrackMaps/types';
import type { RacingLine } from '../data/racingLines/types';
import type { TrackDetailsCorner } from '../data/trackDetailsCorners/types';
import { TrackMapView, cornerViewBox } from './TrackMapView';
import { GRASS } from './trackMapTheme';

type Props = {
  corner: TrackDetailsCorner | null;
  map?: GpxTrackMap;
  racingLine?: RacingLine;
  startFinish?: [number, number];
  savedNote: string | null;
  onClose: () => void;
  onAskCoach: () => void;
  onOpenTrackWalk: () => void;
};

export function formatDetailsCornerHeading(corner: TrackDetailsCorner): string {
  const hand = corner.direction ? ` (${corner.direction})` : '';
  return `T${corner.number}${hand}`;
}

export function TrackCornerSheet({
  corner,
  map,
  racingLine,
  startFinish,
  savedNote,
  onClose,
  onAskCoach,
  onOpenTrackWalk,
}: Props) {
  const open = corner != null;
  const viewBox = corner ? cornerViewBox(corner) : null;
  const [zoomSize, setZoomSize] = useState(280);
  const onZoomLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setZoomSize(w);
  }, []);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {corner ? (
            <>
              <View style={styles.sheetHeader}>
                {corner.direction ? (
                  <Text style={styles.kindLabel}>{corner.direction}</Text>
                ) : null}
                <Text style={styles.sheetTitle}>{formatDetailsCornerHeading(corner)}</Text>
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {map && viewBox ? (
                  <View style={styles.zoomWrap} onLayout={onZoomLayout}>
                    <TrackMapView
                      map={map}
                      racingLine={racingLine}
                      width={zoomSize}
                      height={zoomSize}
                      viewBox={viewBox}
                      corners={[corner]}
                      startFinish={startFinish}
                      showNumbers
                    />
                  </View>
                ) : null}

                <Text style={styles.sectionLabel}>This turn</Text>
                <Text style={styles.body}>{corner.summary}</Text>

                <Text style={styles.sectionLabel}>Approach</Text>
                <Text style={styles.body}>{corner.approachFrom}</Text>

                <Text style={styles.sectionLabel}>Saved track note</Text>
                {savedNote ? (
                  <Text style={styles.body}>{savedNote}</Text>
                ) : (
                  <Text style={styles.empty}>
                    No saved note yet for this corner. Add one in Track Walk Notes.
                  </Text>
                )}
              </ScrollView>

              <TouchableOpacity style={styles.aiBtn} onPress={onAskCoach} activeOpacity={0.85}>
                <Text style={styles.aiBtnText}>Ask coach about this corner</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={onOpenTrackWalk} activeOpacity={0.85}>
                <Text style={styles.secondaryText}>
                  {savedNote ? 'Edit note in Track Walk' : 'Add a note in Track Walk'}
                </Text>
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
    maxHeight: '86%',
  },
  sheetHeader: {
    marginBottom: 8,
  },
  kindLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  zoomWrap: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: GRASS,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 4,
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
  empty: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
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
  secondary: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#64748b',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  cancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
