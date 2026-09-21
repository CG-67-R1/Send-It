import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import {
  CAMBER_OPTIONS,
  CORNER_ENTRY_OPTIONS,
  CORNER_TYPE_OPTIONS,
  SURFACE_CONDITION_OPTIONS,
} from '../data/riderCornerFields';
import { ChipRow } from './ChipRow';
import { VoiceNoteField } from './VoiceNoteField';
import { TrackMapView, cornerViewBox, pointViewBox } from './TrackMapView';
import { GRASS } from './trackMapTheme';

export type DetailsTurn = {
  id: string;
  number: number;
  baked: boolean;
  point: [number, number];
  label: [number, number];
  entry?: [number, number];
  exit?: [number, number];
  apex?: [number, number];
  direction?: 'left' | 'right' | null;
  classification?: string;
  summary?: string;
  approachFrom?: string;
  surfaceCondition?: string;
  cornerType?: string;
  camber?: string;
  cornerEntry?: string;
  note: string;
};

export type TurnFieldPatch = Partial<
  Pick<DetailsTurn, 'surfaceCondition' | 'cornerType' | 'camber' | 'cornerEntry' | 'note'>
>;

type Props = {
  turn: DetailsTurn | null;
  map?: GpxTrackMap;
  racingLine?: RacingLine;
  startFinish?: [number, number];
  walkNote: string | null;
  onChange: (patch: TurnFieldPatch) => void;
  onClose: () => void;
  onAskCoach: () => void;
  onOpenTrackWalk: () => void;
  onDelete?: () => void;
};

export function formatDetailsCornerHeading(corner: {
  number: number;
  direction?: 'left' | 'right' | null;
}): string {
  const hand = corner.direction ? ` (${corner.direction})` : '';
  return `T${corner.number}${hand}`;
}

function asBakedCorner(turn: DetailsTurn): TrackDetailsCorner {
  const apex = turn.apex ?? turn.point;
  return {
    id: turn.id,
    number: turn.number,
    apex,
    label: turn.label,
    entry: turn.entry ?? turn.point,
    exit: turn.exit ?? turn.point,
    classification: turn.classification ?? '',
    headingChangeDeg: 0,
    minimumRadiusM: 0,
    lengthM: 0,
    previousStraightM: 0,
    direction: turn.direction ?? null,
    summary: turn.summary ?? '',
    approachFrom: turn.approachFrom ?? '',
  };
}

export function TrackCornerSheet({
  turn,
  map,
  racingLine,
  startFinish,
  walkNote,
  onChange,
  onClose,
  onAskCoach,
  onOpenTrackWalk,
  onDelete,
}: Props) {
  const open = turn != null;
  const viewBox = turn
    ? turn.baked && turn.entry && turn.exit && turn.apex
      ? cornerViewBox(asBakedCorner(turn))
      : pointViewBox(turn.point)
    : null;
  const [zoomSize, setZoomSize] = useState(280);
  const [draftNote, setDraftNote] = useState(turn?.note ?? '');

  useEffect(() => {
    setDraftNote(turn?.note ?? '');
  }, [turn?.id, turn?.note]);

  const onZoomLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setZoomSize(w);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!onDelete) return;
    Alert.alert('Remove corner', 'Remove this mark you placed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);
  }, [onDelete]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {turn ? (
            <>
              <View style={styles.sheetHeader}>
                {turn.direction ? <Text style={styles.kindLabel}>{turn.direction}</Text> : null}
                <Text style={styles.sheetTitle}>{formatDetailsCornerHeading(turn)}</Text>
                {!turn.baked ? <Text style={styles.riderCue}>You placed this number</Text> : null}
              </View>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {map && viewBox ? (
                  <View style={styles.zoomWrap} onLayout={onZoomLayout}>
                    <TrackMapView
                      map={map}
                      racingLine={racingLine}
                      width={zoomSize}
                      height={zoomSize}
                      viewBox={viewBox}
                      corners={turn.baked ? [asBakedCorner(turn)] : undefined}
                      riderCorners={
                        turn.baked ? undefined : [{ id: turn.id, number: turn.number, label: turn.label }]
                      }
                      startFinish={startFinish}
                      showNumbers
                    />
                  </View>
                ) : null}

                {turn.summary ? (
                  <>
                    <Text style={styles.sectionLabel}>This turn</Text>
                    <Text style={styles.body}>{turn.summary}</Text>
                  </>
                ) : null}

                {turn.approachFrom ? (
                  <>
                    <Text style={styles.sectionLabel}>Approach</Text>
                    <Text style={styles.body}>{turn.approachFrom}</Text>
                  </>
                ) : null}

                {walkNote ? (
                  <>
                    <Text style={styles.sectionLabel}>Track Walk note</Text>
                    <Text style={styles.body}>{walkNote}</Text>
                  </>
                ) : null}

                <Text style={styles.sectionLabel}>Surface condition</Text>
                <ChipRow
                  options={[...SURFACE_CONDITION_OPTIONS]}
                  value={turn.surfaceCondition ?? null}
                  onChange={(id) => onChange({ surfaceCondition: id })}
                />
                <Text style={styles.sectionLabel}>Type of corner</Text>
                <ChipRow
                  options={[...CORNER_TYPE_OPTIONS]}
                  value={turn.cornerType ?? null}
                  onChange={(id) => onChange({ cornerType: id })}
                />
                <Text style={styles.sectionLabel}>Camber</Text>
                <ChipRow
                  options={[...CAMBER_OPTIONS]}
                  value={turn.camber ?? null}
                  onChange={(id) => onChange({ camber: id })}
                />
                <Text style={styles.sectionLabel}>Corner entry</Text>
                <ChipRow
                  options={[...CORNER_ENTRY_OPTIONS]}
                  value={turn.cornerEntry ?? null}
                  onChange={(id) => onChange({ cornerEntry: id })}
                />

                <Text style={styles.sectionLabel}>Personal note</Text>
                <VoiceNoteField
                  value={draftNote}
                  onChange={(text) => {
                    setDraftNote(text);
                    onChange({ note: text });
                  }}
                  placeholder="Type or use mic"
                />
              </ScrollView>

              <TouchableOpacity style={styles.aiBtn} onPress={onAskCoach} activeOpacity={0.85}>
                <Text style={styles.aiBtnText}>Ask coach about this corner</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondary} onPress={onOpenTrackWalk} activeOpacity={0.85}>
                <Text style={styles.secondaryText}>
                  {walkNote ? 'Edit note in Track Walk' : 'Add a note in Track Walk'}
                </Text>
              </TouchableOpacity>
              {onDelete ? (
                <TouchableOpacity style={styles.danger} onPress={confirmDelete} activeOpacity={0.85}>
                  <Text style={styles.dangerText}>Remove this mark</Text>
                </TouchableOpacity>
              ) : null}
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
    maxHeight: '90%',
  },
  sheetHeader: { marginBottom: 8 },
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
  riderCue: { fontSize: 12, color: '#fbbf24', marginTop: 4 },
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
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 12 },
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
  danger: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  dangerText: { fontSize: 15, fontWeight: '600', color: '#f87171' },
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
