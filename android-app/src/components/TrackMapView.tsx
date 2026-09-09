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
  START_RADIUS,
  START_YELLOW,
  SURFACE_UNITS,
  TRACK_EDGE,
  TRACK_GREY,
} from './trackMapTheme';

export type MapViewBox = { x: number; y: number; width: number; height: number };

type LineSeg = { points: string; color: string };

type Props = {
  map: GpxTrackMap;
  racingLine?: RacingLine;
  width: number;
  height: number;
  viewBox?: MapViewBox;
  corners?: TrackDetailsCorner[];
  startFinish?: [number, number];
  showNumbers?: boolean;
  onCornerPress?: (corner: TrackDetailsCorner) => void;
};

function pointsOf(pts: number[][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

/** One SVG path per contiguous brake/throttle band. Colours come from the bake. */
function racingLineSegments(line: RacingLine): LineSeg[] {
  const { polyline, palette, bands } = line;
  if (polyline.length < 2) return [];
  const solid = [{ points: pointsOf(polyline), color: GUIDE_RED }];
  const banded =
    Array.isArray(palette) &&
    palette.length > 0 &&
    Array.isArray(bands) &&
    bands.length === polyline.length;
  if (!banded) return solid;

  const segs: LineSeg[] = [];
  let start = 0;
  for (let i = 1; i <= polyline.length; i++) {
    if (i < polyline.length && bands[i] === bands[start]) continue;
    const join = i < polyline.length ? i + 1 : polyline.length;
    const pts = polyline.slice(start, join);
    if (pts.length >= 2) {
      segs.push({ points: pointsOf(pts), color: palette[bands[start]] ?? GUIDE_RED });
    }
    start = i;
  }
  return segs.length ? segs : solid;
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
  showNumbers = true,
  onCornerPress,
}: Props) {
  const ribbon = useMemo(
    () => map.polyline.map(([x, y]) => `${x},${y}`).join(' '),
    [map]
  );
  const guideSegs = useMemo(
    () => (racingLine ? racingLineSegments(racingLine) : []),
    [racingLine]
  );

  const box = viewBox ?? { x: 0, y: 0, width: 100, height: 100 };
  const marks = corners ?? [];

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
      {guideSegs.map((seg, i) => (
        <Polyline
          key={`guide-${i}`}
          points={seg.points}
          fill="none"
          stroke={seg.color}
          strokeWidth={GUIDE_UNITS}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
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
