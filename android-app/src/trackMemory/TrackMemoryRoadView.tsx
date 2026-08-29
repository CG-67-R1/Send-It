import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Picture, createPicture, useImage } from '@shopify/react-native-skia';
import type { SkPicture } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import type { TrackMemoryLayout } from './types';
import { horizonYFor, NATIVE_QUALITY, projectRoad } from './projectRoad';
import {
  attachBitumenTile,
  buildRoadPicture,
  disposeRoadPaintKit,
  makeRoadPaintKit,
  PictureRecycler,
  TILE_PX,
  type RoadPaintKit,
} from './drawRoadSkia';
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
    const alive = useRef(true);
    const drawing = useRef(false);
    const recycler = useMemo(() => new PictureRecycler(), []);
    const kitsRef = useRef<RoadPaintKit[]>([]);

    // Size only — attaching the tile later must not rebuild the kit.
    // Kits are never disposed while this view is mounted: the landscape lock
    // resizes the surface on first open, and disposing the portrait kit while
    // its picture is still on the GPU is what crashed every track before the
    // ride UI appeared.
    const kit = useMemo(() => {
      if (width < 8 || height < 8) return null;
      try {
        const next = makeRoadPaintKit(width, height, horizonYFor(height), null);
        kitsRef.current.push(next);
        return next;
      } catch (err) {
        console.warn('[TrackMemory] paint kit failed', err);
        return null;
      }
    }, [width, height]);

    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        const dying = kitsRef.current.splice(0);
        setTimeout(() => {
          for (const k of dying) disposeRoadPaintKit(k);
        }, 1000);
      };
    }, []);

    useEffect(() => {
      if (kit && bitumen) attachBitumenTile(kit, bitumen);
    }, [kit, bitumen]);

    const draw = useCallback(
      (s: number, lateral: number, heading: number) => {
        pose.current = { s, lateral, heading };
        if (!kit || !alive.current || drawing.current) return;
        drawing.current = true;
        try {
          const frame = projectRoad(layout, s, lateral, width, height, heading, NATIVE_QUALITY);
          const next = buildRoadPicture(frame, kit, (s * 5.5) % TILE_PX);
          picture.value = next;
          recycler.track(next);
        } catch (err) {
          console.warn('[TrackMemory] draw skipped', err);
        } finally {
          drawing.current = false;
        }
      },
      [kit, layout, width, height, picture, recycler]
    );

    useImperativeHandle(ref, () => ({ draw }), [draw]);

    useEffect(() => {
      draw(pose.current.s, pose.current.lateral, pose.current.heading);
    }, [draw, bitumen]);

    if (!kit) {
      return <View style={styles.fill} />;
    }

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
