import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Picture, createPicture, useImage } from '@shopify/react-native-skia';
import type { SkPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import type { TrackMemoryLayout } from './types';
import { horizonYFor, NATIVE_QUALITY, projectRoad } from './projectRoad';
import { buildRoadPicture, makeRoadPaintKit, TILE_PX } from './drawRoadSkia';
import type { TrackMemoryRoadHandle } from './roadHandle';

const BITUMEN_TILE = require('../../assets/track-memory/bitumen_tile.png');

type Props = {
  layout: TrackMemoryLayout;
  width: number;
  height: number;
};

/**
 * Native road renderer. One Skia picture per frame, published through a
 * Reanimated shared value so no React render happens while riding.
 * Web uses the SVG renderer in TrackMemoryRoadView.web.tsx.
 */
export const TrackMemoryRoadView = forwardRef<TrackMemoryRoadHandle, Props>(
  function TrackMemoryRoadView({ layout, width, height }, ref) {
    const bitumen = useImage(BITUMEN_TILE);
    const emptyPicture = useMemo(() => createPicture(() => {}), []);
    const picture = useSharedValue<SkPicture>(emptyPicture);
    const pose = useRef({ s: 0, lateral: 0, heading: 0 });

    const kit = useMemo(
      () =>
        width >= 8 && height >= 8
          ? makeRoadPaintKit(width, height, horizonYFor(height))
          : null,
      [width, height]
    );

    const draw = useCallback(
      (s: number, lateral: number, heading: number) => {
        pose.current = { s, lateral, heading };
        if (!kit) return;
        const frame = projectRoad(layout, s, lateral, width, height, heading, NATIVE_QUALITY);
        picture.value = buildRoadPicture(frame, kit, (s * 5.5) % TILE_PX, bitumen);
      },
      [kit, layout, width, height, bitumen, picture]
    );

    useImperativeHandle(ref, () => ({ draw }), [draw]);

    // Repaint on resize / texture load without waiting for the next tick
    useEffect(() => {
      draw(pose.current.s, pose.current.lateral, pose.current.heading);
    }, [draw]);

    return (
      <View style={styles.fill}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#1a1a1d' },
});
