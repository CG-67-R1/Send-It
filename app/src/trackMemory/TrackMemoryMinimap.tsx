import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TrackMemoryLayout } from './types';
import { samplePath } from './physics';
import { minimapBounds } from './projectRoad';

type Props = {
  layout: TrackMemoryLayout;
  s: number;
  size?: number;
};

export function TrackMemoryMinimap({ layout, s, size = 112 }: Props) {
  const pad = 10;
  // The outline never changes while riding — only the rider dot does.
  const { pathD, map } = useMemo(() => {
    const { minX, maxX, minY, maxY } = minimapBounds(layout.points);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = (size - pad * 2) / Math.max(spanX, spanY);
    const ox = (size - spanX * scale) / 2;
    const oy = (size - spanY * scale) / 2;
    const map = (p: { x: number; y: number }) => ({
      x: ox + (p.x - minX) * scale,
      // flip Y for screen
      y: size - (oy + (p.y - minY) * scale),
    });
    const mapped = layout.points.map(map);
    const stride = Math.max(1, Math.ceil(mapped.length / 180));
    const pts = mapped.filter((_, i) => i % stride === 0 || i === mapped.length - 1);
    const d =
      pts.length > 0
        ? `M ${pts[0].x} ${pts[0].y} ` +
          pts
            .slice(1)
            .map((p) => `L ${p.x} ${p.y}`)
            .join(' ') +
          ' Z'
        : '';
    return { pathD: d, map };
  }, [layout, size]);

  const rider = map(samplePath(layout.points, layout.lengthM, s).pos);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Rect
          x={0}
          y={0}
          width={size}
          height={size}
          rx={10}
          fill="rgba(15,23,42,0.72)"
          stroke="rgba(248,250,252,0.35)"
          strokeWidth={1}
        />
        <Path d={pathD} fill="none" stroke="#94a3b8" strokeWidth={2.5} />
        <Circle cx={rider.x} cy={rider.y} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
});
