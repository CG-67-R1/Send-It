import React, { useMemo } from 'react';
import { Circle, G, Polyline, Svg, Text } from 'react-native-svg';
import type { GpxTrackMap } from '../data/gpxTrackMaps/types';
import type { RacingLine } from '../data/racingLines/types';
import type { TrackDetailsCorner } from '../data/trackDetailsCorners/types';
import {
  BADGE_FONT,
  BADGE_HIT_RADIUS,
  BADGE_RADIUS,
  CORNER_BLUE,
  CORNER_INK,
  CORNER_PAPER,
  EDGE_UNITS,
  GUIDE_RED,
  GUIDE_UNITS,
  HIGHLIGHT_UNITS,
  START_RADIUS,
  START_YELLOW,
  SURFACE_UNITS,
  TRACK_EDGE,
  TRACK_GREY,
} from './trackMapTheme';

export type MapViewBox = { x: number; y: number; width: number; height: number };

type Props = {
  map: GpxTrackMap;
  racingLine?: RacingLine;
  width: number;
  height: number;
  viewBox?: MapViewBox;
  corners?: TrackDetailsCorner[];
  startFinish?: [number, number];
  highlight?: TrackDetailsCorner | null;
  showNumbers?: boolean;
  onCornerPress?: (corner: TrackDetailsCorner) => void;
};

function nearestIndex(polyline: number[][], point: [number, number]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < polyline.length; i++) {
    const d = Math.hypot(polyline[i][0] - point[0], polyline[i][1] - point[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function spanPoints(polyline: number[][], start: number, end: number): string {
  const n = polyline.length;
  if (n < 2) return '';
  const out = [polyline[start % n]];
  let i = start % n;
  let guard = 0;
  while (i !== end % n && guard <= n) {
    i = (i + 1) % n;
    out.push(polyline[i]);
    guard += 1;
  }
  return out.map(([x, y]) => `${x},${y}`).join(' ');
}

export function cornerViewBox(corner: TrackDetailsCorner, pad = 7): MapViewBox {
  const xs = [corner.entry[0], corner.apex[0], corner.exit[0], corner.label[0]];
  const ys = [corner.entry[1], corner.apex[1], corner.exit[1], corner.label[1]];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 14) + pad * 2;
  return {
    x: (minX + maxX) / 2 - span / 2,
    y: (minY + maxY) / 2 - span / 2,
    width: span,
    height: span,
  };
}

export function TrackMapView({
  map,
  racingLine,
  width,
  height,
  viewBox,
  corners,
  startFinish,
  highlight,
  showNumbers = true,
  onCornerPress,
}: Props) {
  const ribbon = useMemo(
    () => map.polyline.map(([x, y]) => `${x},${y}`).join(' '),
    [map]
  );
  const guide = useMemo(
    () => racingLine?.polyline.map(([x, y]) => `${x},${y}`).join(' '),
    [racingLine]
  );
  const highlightPts = useMemo(() => {
    if (!highlight) return '';
    const start = nearestIndex(map.polyline, highlight.entry);
    const end = nearestIndex(map.polyline, highlight.exit);
    return spanPoints(map.polyline, start, end);
  }, [highlight, map.polyline]);

  const box = viewBox ?? { x: 0, y: 0, width: 100, height: 100 };
  const marks = highlight && !corners?.length ? [highlight] : corners ?? [];

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
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
      {highlightPts ? (
        <Polyline
          points={highlightPts}
          fill="none"
          stroke={CORNER_BLUE}
          strokeWidth={HIGHLIGHT_UNITS}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {startFinish ? (
        <Circle
          cx={startFinish[0]}
          cy={startFinish[1]}
          r={START_RADIUS}
          fill={START_YELLOW}
          stroke={CORNER_INK}
          strokeWidth={0.45}
        />
      ) : null}
      {showNumbers
        ? marks.map((corner) => (
            <G
              key={corner.id}
              onPress={onCornerPress ? () => onCornerPress(corner) : undefined}
              accessibilityLabel={`Turn ${corner.number}`}
            >
              {onCornerPress ? (
                <Circle
                  cx={corner.label[0]}
                  cy={corner.label[1]}
                  r={BADGE_HIT_RADIUS}
                  fill="transparent"
                />
              ) : null}
              <Circle
                cx={corner.label[0]}
                cy={corner.label[1]}
                r={BADGE_RADIUS}
                fill={CORNER_BLUE}
                stroke={CORNER_PAPER}
                strokeWidth={0.45}
              />
              <Text
                x={corner.label[0]}
                y={corner.label[1]}
                fill={CORNER_PAPER}
                fontSize={BADGE_FONT}
                fontWeight="700"
                fontFamily="Arial"
                textAnchor="middle"
                alignmentBaseline="middle"
                dy={1.15}
              >
                {String(corner.number)}
              </Text>
            </G>
          ))
        : null}
    </Svg>
  );
}
