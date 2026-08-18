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

    // Size only — attaching the tile later must not rebuild/dispose the kit.
    // Rebuilding when useImage resolves is what crashed Bathurst / Phillip
    // Island on the first attempt (image still loading) and worked on the second
    // (cached).
    const kit = useMemo(
      () => (width >= 8 && height >= 8 ? makeRoadPaintKit(width, height, horizonYFor(height), null) : null),
      [width, height]
    );

    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
      };
    }, []);

    useEffect(() => {
      if (!kit) return undefined;
      return () => {
        const dying = kit;
        setTimeout(() => disposeRoadPaintKit(dying), 250);
      };
    }, [kit]);

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
