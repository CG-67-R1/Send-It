import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { TrackMapView } from './TrackMapView';
import { GRASS } from './trackMapTheme';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.5;

const MAP_HINT =
  'Track map from the circuit GPS trace, drawn to the real width of the road — zoom in to read it.';
const GUIDE_HINT =
  'The coloured line is a suggested line — red braking, blue release, green throttle, yellow full drive — not instruction.';
const NOTES_HINT = 'Tap a turn number on the map, or the same number in the list.';

type Props = {
  map: GpxTrackMap;
  racingLine?: RacingLine;
  corners?: TrackDetailsCorners;
  onCornerPress?: (corner: TrackDetailsCorner) => void;
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 2) / 2));
}

export function TrackFacilityMap({ map, racingLine, corners, onCornerPress }: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  useEffect(() => {
    setZoom(DEFAULT_ZOOM);
  }, [map.trackId]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  }, []);

  const innerW = box.width * zoom;
  const innerH = box.height * zoom;

  return (
    <View>
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
                  corners={corners?.corners}
                  startFinish={corners?.startFinish}
                  showNumbers
                  onCornerPress={onCornerPress}
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
      <Text style={styles.hint}>
        {[MAP_HINT, racingLine ? GUIDE_HINT : null, NOTES_HINT].filter(Boolean).join(' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
