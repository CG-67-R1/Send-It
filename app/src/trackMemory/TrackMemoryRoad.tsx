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
const TILE_PX = 64;

type Props = {
  layout: TrackMemoryLayout;
  s: number;
  lateral: number;
  heading: number;
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

/** Continue a screen-space edge line past the near point — never kink vertical. */
function extendEdgeToBottom(
  far: [number, number],
  near: [number, number],
  screenH: number
): [number, number] {
  const targetY = screenH + 6;
  const dy = near[1] - far[1];
  if (Math.abs(dy) < 0.01) return [near[0], targetY];
  const t = (targetY - far[1]) / dy;
  return [far[0] + (near[0] - far[0]) * t, targetY];
}

export function TrackMemoryRoad({ layout, s, lateral, heading, width, height }: Props) {
  const frame = useMemo(
    () => projectRoad(layout, s, lateral, width, height, heading),
    [layout, s, lateral, heading, width, height]
  );

  // Positive Y scroll = texture travels down the screen as the bike moves forward
  const scrollY = (s * 5.5) % TILE_PX;

  /**
   * Bitumen apron: extend the same edge lines under the cockpit (no vertical kink).
   */
  const underBikeApron = useMemo(() => {
    if (frame.quads.length === 0) return null;
    // Prefer a quad with real perspective slope in the lower half
    let best = frame.quads[0];
    let bestScore = Infinity;
    for (const q of frame.quads) {
      const [tl, tr, br, bl] = q.points;
      const nearY = (bl[1] + br[1]) * 0.5;
      const farY = (tl[1] + tr[1]) * 0.5;
      const slope = nearY - farY;
      if (slope < 6) continue;
      const score = Math.abs(nearY - height * 0.72);
      if (score < bestScore) {
        bestScore = score;
        best = q;
      }
    }
    const [tl, tr, br, bl] = best.points;
    const leftBot = extendEdgeToBottom(tl, bl, height);
    const rightBot = extendEdgeToBottom(tr, br, height);
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
          const depthShade = Math.min(0.35, idx / (frame.quads.length * 2.2));
          // Stable red/white along distance (not draw-order idx)
          const stripeA = Math.floor(idx * 0.55) % 2 === 0;
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
              {q.curbLeft ? (
                <Polygon
                  points={curbStrip(q.points, 'left', 0.09)}
                  fill={stripeA ? '#dc2626' : '#f8fafc'}
                />
              ) : (
                <Path
                  d={`M ${q.points[0][0]} ${q.points[0][1]} L ${q.points[3][0]} ${q.points[3][1]}`}
                  stroke="#f4f4f5"
                  strokeWidth={2.2}
                  opacity={0.8}
                />
              )}
              {q.curbRight ? (
                <Polygon
                  points={curbStrip(q.points, 'right', 0.09)}
                  fill={stripeA ? '#f8fafc' : '#dc2626'}
                />
              ) : (
                <Path
                  d={`M ${q.points[1][0]} ${q.points[1][1]} L ${q.points[2][0]} ${q.points[2][1]}`}
                  stroke="#f4f4f5"
                  strokeWidth={2.2}
                  opacity={0.8}
                />
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
