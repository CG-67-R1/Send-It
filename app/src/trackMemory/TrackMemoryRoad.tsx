import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import type { TrackMemoryLayout } from './types';
import { projectRoad } from './projectRoad';

type Props = {
  layout: TrackMemoryLayout;
  s: number;
  lateral: number;
  lean: number;
  width: number;
  height: number;
};

function quadToPoints(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

function curbStrip(
  road: [number, number][],
  side: 'left' | 'right',
  inset: number
): string {
  const [tl, tr, br, bl] = road;
  if (side === 'left') {
    const outer = [tl, bl];
    const ix0 = tl[0] + (tr[0] - tl[0]) * inset;
    const iy0 = tl[1] + (tr[1] - tl[1]) * inset;
    const ix1 = bl[0] + (br[0] - bl[0]) * inset;
    const iy1 = bl[1] + (br[1] - bl[1]) * inset;
    return `${outer[0][0]},${outer[0][1]} ${ix0},${iy0} ${ix1},${iy1} ${outer[1][0]},${outer[1][1]}`;
  }
  const outer = [tr, br];
  const ix0 = tr[0] + (tl[0] - tr[0]) * inset;
  const iy0 = tr[1] + (tl[1] - tr[1]) * inset;
  const ix1 = br[0] + (bl[0] - br[0]) * inset;
  const iy1 = br[1] + (bl[1] - br[1]) * inset;
  return `${outer[0][0]},${outer[0][1]} ${ix0},${iy0} ${ix1},${iy1} ${outer[1][0]},${outer[1][1]}`;
}

export function TrackMemoryRoad({ layout, s, lateral, lean, width, height }: Props) {
  const frame = useMemo(
    () => projectRoad(layout, s, lateral, lean, width, height),
    [layout, s, lateral, lean, width, height]
  );

  if (width < 8 || height < 8) return <View style={styles.fill} />;

  return (
    <View style={styles.fill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#7eb6d9" />
            <Stop offset="55%" stopColor="#c5dde8" />
            <Stop offset="100%" stopColor="#d9e4c9" />
          </LinearGradient>
          <LinearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6b8f4e" />
            <Stop offset="100%" stopColor="#3f5c32" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={frame.horizonY} fill="url(#sky)" />
        <Rect
          x={0}
          y={frame.horizonY}
          width={width}
          height={height - frame.horizonY}
          fill="url(#grass)"
        />
        {/* Draw far to near */}
        {[...frame.quads].reverse().map((q, idx) => {
          const shade = Math.round(40 + q.shade * 50);
          const fill = `rgb(${shade},${shade},${shade + 4})`;
          const curbOn = q.curbLeft || q.curbRight;
          return (
            <React.Fragment key={`q-${idx}`}>
              <Polygon points={quadToPoints(q.points)} fill={fill} />
              {curbOn ? (
                <>
                  <Polygon
                    points={curbStrip(q.points, 'left', 0.08)}
                    fill={idx % 2 === 0 ? '#dc2626' : '#f8fafc'}
                  />
                  <Polygon
                    points={curbStrip(q.points, 'right', 0.08)}
                    fill={idx % 2 === 0 ? '#f8fafc' : '#dc2626'}
                  />
                </>
              ) : (
                <>
                  <Path
                    d={`M ${q.points[0][0]} ${q.points[0][1]} L ${q.points[3][0]} ${q.points[3][1]}`}
                    stroke="#e2e8f0"
                    strokeWidth={1.2}
                    opacity={0.35}
                  />
                  <Path
                    d={`M ${q.points[1][0]} ${q.points[1][1]} L ${q.points[2][0]} ${q.points[2][1]}`}
                    stroke="#e2e8f0"
                    strokeWidth={1.2}
                    opacity={0.35}
                  />
                </>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#64748b' },
});
