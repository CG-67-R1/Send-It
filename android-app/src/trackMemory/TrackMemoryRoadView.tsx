import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
const KIT_SETTLE_MS = 300;
const KIT_DISPOSE_MS = 1000;

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
    const kitRef = useRef<RoadPaintKit | null>(null);
    const [kit, setKit] = useState<RoadPaintKit | null>(null);

    const landscape = width >= 8 && height >= 8 && width > height;
    const [settled, setSettled] = useState(false);

    useEffect(() => {
      if (!landscape) {
        setSettled(false);
        return;
      }
      const t = setTimeout(() => setSettled(true), KIT_SETTLE_MS);
      return () => clearTimeout(t);
    }, [landscape, width, height]);

    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        const dying = kitRef.current;
        kitRef.current = null;
        if (dying) {
          setTimeout(() => disposeRoadPaintKit(dying), KIT_DISPOSE_MS);
        }
      };
    }, []);

    useEffect(() => {
      if (!settled || !landscape) return;
      let created: RoadPaintKit | null = null;
      try {
        created = makeRoadPaintKit(width, height, horizonYFor(height), null);
      } catch (err) {
        console.warn('[TrackMemory] paint kit failed', err);
        return;
      }
      const prev = kitRef.current;
      kitRef.current = created;
      setKit(created);
      if (prev && prev !== created) {
        setTimeout(() => disposeRoadPaintKit(prev), KIT_DISPOSE_MS);
      }
    }, [settled, landscape, width, height]);

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
