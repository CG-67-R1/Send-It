import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  GestureResponderEvent,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { GpxTrackMap } from '../data/gpxTrackMaps/types';
import type { RacingLine } from '../data/racingLines/types';
import type { TrackDetailsCorner, TrackDetailsCorners } from '../data/trackDetailsCorners/types';
import type { RiderCircuitDirection, RiderTrackMarks } from '../storage/riderTrackMarks';
import {
  directionArrowOnRibbon,
  hitBadge,
  snapToRibbon,
  viewToMapPoint,
  type MapPoint,
} from '../utils/snapToRibbon';
import { riderBadgeLabel, TrackMapView } from './TrackMapView';
import { GRASS, RIDER_AMBER } from './trackMapTheme';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.5;

const MAP_HINT =
  'Track map from the circuit GPS trace, drawn to the real width of the road — zoom in to read it.';
const GUIDE_HINT =
  'The coloured line is a suggested line — red braking, blue release, green throttle, yellow full drive — not instruction.';
const NOTES_HINT = 'Tap a turn number on the map, or the same number in the list.';
const PLACE_HINT = 'Tap the road to place the mark. It snaps to the GPS line.';

export type MapEditTool = 'idle' | 'placeCorner' | 'markStart' | 'markDirection';

type Props = {
  map: GpxTrackMap;
  racingLine?: RacingLine;
  baked?: TrackDetailsCorners;
  riderMarks: RiderTrackMarks;
  catalogDirection?: 'clockwise' | 'anticlockwise' | 'unknown';
  onBakedPress?: (corner: TrackDetailsCorner) => void;
  onRiderPress?: (id: string) => void;
  onPlaceCorner: (point: MapPoint) => void;
  onPlaceStartFinish: (point: MapPoint) => void;
  onDirectionChange: (direction: RiderCircuitDirection) => void;
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 2) / 2));
}

export function TrackFacilityMap({
  map,
  racingLine,
  baked,
  riderMarks,
  catalogDirection,
  onBakedPress,
  onRiderPress,
  onPlaceCorner,
  onPlaceStartFinish,
  onDirectionChange,
}: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [tool, setTool] = useState<MapEditTool>('idle');

  useEffect(() => {
    setZoom(DEFAULT_ZOOM);
    setTool('idle');
  }, [map.trackId]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  }, []);

  const innerW = box.width * zoom;
  const innerH = box.height * zoom;

  const riderBadges = useMemo(
    () =>
      riderMarks.corners
        .filter((c) => !c.baked)
        .map((c) => ({
          id: c.id,
          number: c.number,
          label: riderBadgeLabel(c.point, map.polyline),
        })),
    [riderMarks.corners, map.polyline]
  );

  const activeStart = riderMarks.startFinish ?? baked?.startFinish;
  const direction =
    riderMarks.direction ??
    (catalogDirection === 'clockwise' || catalogDirection === 'anticlockwise'
      ? catalogDirection
      : undefined);
  const arrow = useMemo(() => {
    if (!activeStart || !direction) return null;
    return directionArrowOnRibbon(map.polyline, activeStart, direction);
  }, [activeStart, direction, map.polyline]);

  const placing = tool === 'placeCorner' || tool === 'markStart';

  const handleMapTap = useCallback(
    (e: GestureResponderEvent) => {
      const mapped = viewToMapPoint(e.nativeEvent.locationX, e.nativeEvent.locationY, innerW, innerH);
      if (!mapped) return;
      const snapped = snapToRibbon(mapped, map.polyline);
      const badges = [
        ...(baked?.corners ?? []).map((c) => ({ id: c.id, at: c.label })),
        ...riderBadges.map((c) => ({ id: c.id, at: c.label })),
      ];
      const hit = hitBadge(snapped, badges, 7) ?? hitBadge(mapped, badges, 7);
      if (hit && tool === 'idle') {
        const bakedHit = baked?.corners.find((c) => c.id === hit);
        if (bakedHit) onBakedPress?.(bakedHit);
        else onRiderPress?.(hit);
        return;
      }
      if (tool === 'placeCorner') {
        onPlaceCorner(snapped);
        setTool('idle');
        return;
      }
      if (tool === 'markStart') {
        onPlaceStartFinish(snapped);
        setTool('idle');
      }
    },
    [
      innerW,
      innerH,
      map.polyline,
      baked,
      riderBadges,
      tool,
      onBakedPress,
      onRiderPress,
      onPlaceCorner,
      onPlaceStartFinish,
    ]
  );

  const startDirection = useCallback(() => {
    if (!activeStart) {
      Alert.alert('Start / finish', 'Mark start/finish on the map first, then set direction.');
      return;
    }
    setTool('markDirection');
    if (!riderMarks.direction && direction) onDirectionChange(direction);
  }, [activeStart, riderMarks.direction, direction, onDirectionChange]);

  const hint = placing
    ? PLACE_HINT
    : [MAP_HINT, racingLine ? GUIDE_HINT : null, NOTES_HINT].filter(Boolean).join(' ');

  return (
    <View>
      <View style={styles.toolRow}>
        <ToolBtn
          label="Place corner"
          active={tool === 'placeCorner'}
          onPress={() => setTool((t) => (t === 'placeCorner' ? 'idle' : 'placeCorner'))}
        />
        <ToolBtn
          label="Mark S/F"
          active={tool === 'markStart'}
          onPress={() => setTool((t) => (t === 'markStart' ? 'idle' : 'markStart'))}
        />
        <ToolBtn
          label="Direction"
          active={tool === 'markDirection'}
          onPress={startDirection}
        />
        {tool !== 'idle' ? (
          <ToolBtn label="Done" active={false} onPress={() => setTool('idle')} />
        ) : null}
      </View>
      {tool === 'markDirection' ? (
        <View style={styles.dirRow}>
          <ToolBtn
            label="Clockwise"
            active={direction === 'clockwise'}
            onPress={() => onDirectionChange('clockwise')}
          />
          <ToolBtn
            label="Anticlockwise"
            active={direction === 'anticlockwise'}
            onPress={() => onDirectionChange('anticlockwise')}
          />
        </View>
      ) : null}

      <View style={styles.mapWrap} onLayout={onLayout}>
        <ScrollView
          style={StyleSheet.absoluteFill}
          nestedScrollEnabled
          directionalLockEnabled={false}
          maximumZoomScale={MAX_ZOOM}
          minimumZoomScale={MIN_ZOOM}
          bouncesZoom
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator
          >
            {innerW > 0 ? (
              <View style={{ width: innerW, height: innerH, backgroundColor: GRASS }}>
                <TrackMapView
                  map={map}
                  racingLine={racingLine}
                  width={innerW}
                  height={innerH}
                  corners={baked?.corners}
                  riderCorners={riderBadges}
                  startFinish={baked?.startFinish}
                  riderStartFinish={riderMarks.startFinish}
                  directionArrow={arrow}
                  showNumbers
                  onBakedPress={tool === 'idle' ? onBakedPress : undefined}
                  onRiderPress={tool === 'idle' ? onRiderPress : undefined}
                />
                <View
                  style={StyleSheet.absoluteFill}
                  onStartShouldSetResponder={() => placing}
                  onResponderRelease={placing ? handleMapTap : undefined}
                />
              </View>
            ) : (
              <View style={styles.missing}>
                <Text style={styles.missingText}>Loading layout…</Text>
              </View>
            )}
          </ScrollView>
        </ScrollView>

        <View style={styles.zoomBar} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
          >
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{zoom.toFixed(1)}×</Text>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
          >
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

function ToolBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.toolBtn, active && styles.toolBtnActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.toolBtnText, active && styles.toolBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  dirRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toolBtnActive: { borderColor: RIDER_AMBER, backgroundColor: 'rgba(245,158,11,0.18)' },
  toolBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  toolBtnTextActive: { color: '#fbbf24' },
  mapWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: GRASS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  missing: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  missingText: { color: '#f8fafc', fontSize: 14, textAlign: 'center' },
  zoomBar: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  zoomBtn: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  zoomLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 20,
  },
});
