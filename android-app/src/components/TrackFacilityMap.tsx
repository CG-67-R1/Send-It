import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TrackInfoCorner, TrackInfoMap } from '../data/trackInfo/types';
import { getTrackBoardMap } from '../data/trackInfo/boardMaps';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1.5;
const ZOOM_STEP = 0.5;
const GRASS = '#6d9a46';

type Props = {
  map: TrackInfoMap;
  selectedCornerId: string | null;
  onSelectCorner: (corner: TrackInfoCorner) => void;
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 2) / 2));
}

export function TrackFacilityMap({ map }: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 16, height: 9 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const board = getTrackBoardMap(map.trackId);

  useEffect(() => {
    setZoom(DEFAULT_ZOOM);
  }, [map.trackId]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  }, []);

  const aspect = natural.height / Math.max(natural.width, 1);
  const baseW = box.width;
  const baseH = baseW > 0 ? baseW * aspect : 0;
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
            {board && innerW > 0 ? (
              <Image
                source={board}
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  if (width > 0 && height > 0) setNatural({ width, height });
                }}
                style={{ width: innerW, height: innerH }}
                resizeMode="contain"
                accessibilityLabel={`${map.name} circuit map`}
              />
            ) : (
              <View style={styles.missing}>
                <Text style={styles.missingText}>No board map image for this layout yet.</Text>
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
        Track map — the line and corner numbers are in the picture. Pinch or use + / −. Use the list
        below to add notes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    width: '100%',
    aspectRatio: 1.55,
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
