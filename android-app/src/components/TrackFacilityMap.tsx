import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import type { GpxTrackMap } from '../data/gpxTrackMaps/types';
import type { RacingLine } from '../data/racingLines/types';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const DEFAULT_ZOOM = 2;
const ZOOM_STEP = 0.5;
const GRASS = '#6d9a46';
const TRACK_GREY = '#9ca3af';
const TRACK_EDGE = '#ffffff';
const GUIDE_RED = '#dc2626';

// Stroke widths are in map units, not device pixels, so the asphalt is the same
// width of road on every screen. The racing line is solved against this exact
// width, so a device-derived stroke would put the line on a road it never saw.
// Values match scripts/lib/gpx_track_preview.py at its 2000 px canvas.
const EDGE_UNITS = 2;
const SURFACE_UNITS = 1.2;
const GUIDE_UNITS = 0.15;

const MAP_HINT =
  'Track map from the circuit GPS trace, drawn to the real width of the road — zoom in to read it.';
// The line is a suggestion, never instruction, so the wording must stay hedged.
const GUIDE_HINT = 'The red line is a suggested line, not instruction.';
const NOTES_HINT = 'Use the list below to add notes.';

type Props = {
  map: GpxTrackMap;
  racingLine?: RacingLine;
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 2) / 2));
}

export function TrackFacilityMap({ map, racingLine }: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const ribbon = useMemo(
    () => map.polyline.map(([x, y]) => `${x},${y}`).join(' '),
    [map]
  );
  const guide = useMemo(
    () => racingLine?.polyline.map(([x, y]) => `${x},${y}`).join(' '),
    [racingLine]
  );

  useEffect(() => {
    setZoom(DEFAULT_ZOOM);
  }, [map.trackId]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  }, []);

  const baseW = box.width;
  const baseH = box.height;
  const innerW = baseW * zoom;
  const innerH = baseH * zoom;

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
                <Svg
                  width={innerW}
                  height={innerH}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid meet"
                  accessibilityLabel={`${map.name} circuit map`}
                >
                  <Polyline
                    points={ribbon}
                    fill="none"
                    stroke={TRACK_EDGE}
                    strokeWidth={EDGE_UNITS}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <Polyline
                    points={ribbon}
                    fill="none"
                    stroke={TRACK_GREY}
                    strokeWidth={SURFACE_UNITS}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {guide ? (
                    <Polyline
                      points={guide}
                      fill="none"
                      stroke={GUIDE_RED}
                      strokeWidth={GUIDE_UNITS}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ) : null}
                </Svg>
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
        {[MAP_HINT, guide ? GUIDE_HINT : null, NOTES_HINT].filter(Boolean).join(' ')}
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
