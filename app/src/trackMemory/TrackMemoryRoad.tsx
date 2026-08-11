import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Image as SvgImage,
  LinearGradient,
  Path,
  Pattern,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { TrackMemoryLayout } from './types';
import { projectRoad, seamPoly } from './projectRoad';

const BITUMEN_TILE = require('../../assets/track-memory/bitumen_tile.png');
const TILE_PX = 160;

type Props = {
  layout: TrackMemoryLayout;
  s: number;
  lateral: number;
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

function extendEdgeToBottom(
  far: [number, number],
  near: [number, number],
  screenH: number
): [number, number] {
  const targetY = screenH + 6;
  const dy = near[1] - far[1];
  // Near edge already past bottom, or flat — drop straight down
  if (near[1] >= screenH - 1 || Math.abs(dy) < 0.5 || dy < 0) {
    return [near[0], targetY];
  }
  const t = (targetY - far[1]) / dy;
  return [far[0] + (near[0] - far[0]) * t, targetY];
}

export function TrackMemoryRoad({ layout, s, lateral, width, height }: Props) {
  const frame = useMemo(
    () => projectRoad(layout, s, lateral, width, height),
    [layout, s, lateral, width, height]
  );

  // Scroll texture with distance so the asphalt feels like it's moving under the bike
  const scrollY = -((s * 5.5) % TILE_PX);

  /**
   * Bitumen apron: continue the nearest road edges down under the cockpit so
   * transparent bike areas show asphalt instead of grass.
   */
  const underBikeApron = useMemo(() => {
    if (frame.quads.length === 0) return null;
    // Prefer the quad whose near edge sits lowest on screen (closest under the bike)
    let best = frame.quads[0];
    let bestY = -Infinity;
    for (const q of frame.quads) {
      const [, , br, bl] = q.points;
      const y = Math.max(bl[1], br[1]);
      if (y > bestY) {
        bestY = y;
        best = q;
      }
    }
    const [tl, tr, br, bl] = best.points;
    const leftBot = extendEdgeToBottom(tl, bl, height);
    const rightBot = extendEdgeToBottom(tr, br, height);
    // Always span to the screen bottom so cockpit transparency never shows grass
    return [bl, br, rightBot, leftBot] as [number, number][];
  }, [frame.quads, height]);

  if (width < 8 || height < 8) return <View style={styles.fill} />;

  const grassBand = Math.max(10, (height - frame.horizonY) * 0.08);

  return (
    <View style={styles.fill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6fa8d0" />
            <Stop offset="55%" stopColor="#b9d4e4" />
            <Stop offset="100%" stopColor="#cfe0c4" />
          </LinearGradient>
          <Pattern
            id="bitumen"
            patternUnits="userSpaceOnUse"
            width={TILE_PX}
            height={TILE_PX}
            patternTransform={`translate(0 ${scrollY})`}
          >
            <SvgImage
              href={BITUMEN_TILE}
              x={0}
              y={0}
              width={TILE_PX}
              height={TILE_PX}
              preserveAspectRatio="xMidYMid slice"
            />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={frame.horizonY} fill="url(#sky)" />
        {/* Grass / run-off outside the track — no bitumen beyond the white lines */}
        <Rect
          x={0}
          y={frame.horizonY}
          width={width}
          height={height - frame.horizonY}
          fill="#4a6b3a"
        />
        <Rect x={0} y={frame.horizonY} width={width} height={grassBand} fill="#5f7d4a" />
        {[...frame.quads].reverse().map((q, idx) => {
          const curbOn = q.curbLeft || q.curbRight;
          const depthShade = Math.min(0.35, idx / (frame.quads.length * 2.2));
          return (
            <React.Fragment key={`q-${idx}`}>
              <Polygon points={quadToPoints(q.points)} fill="#2c2c30" />
              <Polygon points={quadToPoints(q.points)} fill="url(#bitumen)" />
              <Polygon
                points={quadToPoints(q.points)}
                fill="#0a0a0c"
                opacity={0.08 + depthShade}
              />
              {q.grain ? (
                <Polygon points={seamPoly(q.points, 0.5, 0.2)} fill="#111114" opacity={0.12} />
              ) : null}
              {q.rubber.map((r, ri) => (
                <Polygon
                  key={`rub-${idx}-${ri}`}
                  points={quadToPoints(r.points)}
                  fill="#050507"
                  opacity={r.opacity}
                />
              ))}
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
                    stroke="#f4f4f5"
                    strokeWidth={2.2}
                    opacity={0.8}
                  />
                  <Path
                    d={`M ${q.points[1][0]} ${q.points[1][1]} L ${q.points[2][0]} ${q.points[2][1]}`}
                    stroke="#f4f4f5"
                    strokeWidth={2.2}
                    opacity={0.8}
                  />
                </>
              )}
            </React.Fragment>
          );
        })}

        {/* Continue bitumen under the bike within track edges */}
        {underBikeApron ? (
          <>
            <Polygon points={quadToPoints(underBikeApron)} fill="#2c2c30" />
            <Polygon points={quadToPoints(underBikeApron)} fill="url(#bitumen)" />
            <Path
              d={`M ${underBikeApron[0][0]} ${underBikeApron[0][1]} L ${underBikeApron[3][0]} ${underBikeApron[3][1]}`}
              stroke="#f4f4f5"
              strokeWidth={2}
              opacity={0.55}
            />
            <Path
              d={`M ${underBikeApron[1][0]} ${underBikeApron[1][1]} L ${underBikeApron[2][0]} ${underBikeApron[2][1]}`}
              stroke="#f4f4f5"
              strokeWidth={2}
              opacity={0.55}
            />
          </>
        ) : null}

        {frame.markers.map((m, i) => (
          <React.Fragment key={`mk-${m.metres}-${i}`}>
            <Polygon
              points={quadToPoints(m.points)}
              fill="#f8fafc"
              stroke="#111827"
              strokeWidth={1.2}
            />
            <SvgText
              x={m.labelX}
              y={m.labelY + m.fontSize * 0.35}
              fill="#0f172a"
              fontSize={m.fontSize}
              fontWeight="800"
              textAnchor="middle"
            >
              {String(m.metres)}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#1a1a1d' },
});
