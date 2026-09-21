import React, { useMemo } from 'react';
import { Circle, G, Polygon, Polyline, Svg, Text } from 'react-native-svg';
import type { GpxTrackMap } from '../data/gpxTrackMaps/types';
import type { RacingLine } from '../data/racingLines/types';
import type { TrackDetailsCorner } from '../data/trackDetailsCorners/types';
import type { DirectionArrow } from '../utils/snapToRibbon';
import {
  BADGE_FONT,
  BADGE_HIT_RADIUS,
  BADGE_RADIUS,
  CORNER_BLUE,
  CORNER_INK,
  CORNER_PAPER,
  DIRECTION_INK,
  EDGE_UNITS,
  GUIDE_RED,
  GUIDE_UNITS,
  RIDER_AMBER,
  START_RADIUS,
  START_YELLOW,
  SURFACE_UNITS,
  TRACK_EDGE,
  TRACK_GREY,
} from './trackMapTheme';

export type MapViewBox = { x: number; y: number; width: number; height: number };

export type RiderMapBadge = {
  id: string;
  number: number;
  label: [number, number];
};

type LineSeg = { points: string; color: string };

type Props = {
  map: GpxTrackMap;
  racingLine?: RacingLine;
  width: number;
  height: number;
  viewBox?: MapViewBox;
  corners?: TrackDetailsCorner[];
  riderCorners?: RiderMapBadge[];
  startFinish?: [number, number];
  riderStartFinish?: [number, number];
  directionArrow?: DirectionArrow | null;
  showNumbers?: boolean;
  onBakedPress?: (corner: TrackDetailsCorner) => void;
  onRiderPress?: (id: string) => void;
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

export function pointViewBox(point: [number, number], pad = 10): MapViewBox {
  const span = 14 + pad * 2;
  return {
    x: point[0] - span / 2,
    y: point[1] - span / 2,
    width: span,
    height: span,
  };
}

function outwardLabel(point: [number, number], polyline: number[][], offset = 5.2): [number, number] {
  if (polyline.length < 1) return point;
  let cx = 0;
  let cy = 0;
  for (const p of polyline) {
    cx += p[0];
    cy += p[1];
  }
  cx /= polyline.length;
  cy /= polyline.length;
  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const len = Math.hypot(dx, dy) || 1;
  const x = Math.min(98, Math.max(2, point[0] + (dx / len) * offset));
  const y = Math.min(98, Math.max(2, point[1] + (dy / len) * offset));
  return [x, y];
}

export function riderBadgeLabel(point: [number, number], polyline: number[][]): [number, number] {
  return outwardLabel(point, polyline);
}

export function TrackMapView({
  map,
  racingLine,
  width,
  height,
  viewBox,
  corners,
  riderCorners,
  startFinish,
  riderStartFinish,
  directionArrow,
  showNumbers = true,
  onBakedPress,
  onRiderPress,
}: Props) {
  const ribbon = useMemo(() => map.polyline.map(([x, y]) => `${x},${y}`).join(' '), [map]);
  const guideSegs = useMemo(() => (racingLine ? racingLineSegments(racingLine) : []), [racingLine]);

  const box = viewBox ?? { x: 0, y: 0, width: 100, height: 100 };
  const baked = corners ?? [];
  const extras = riderCorners ?? [];

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
      {directionArrow ? (
        <Polygon
          points={`${directionArrow.tip[0]},${directionArrow.tip[1]} ${directionArrow.left[0]},${directionArrow.left[1]} ${directionArrow.right[0]},${directionArrow.right[1]}`}
          fill={RIDER_AMBER}
          stroke={DIRECTION_INK}
          strokeWidth={0.35}
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
      {riderStartFinish ? (
        <G>
          <Circle
            cx={riderStartFinish[0]}
            cy={riderStartFinish[1]}
            r={START_RADIUS + 0.85}
            fill="none"
            stroke={RIDER_AMBER}
            strokeWidth={0.7}
          />
          <Text
            x={riderStartFinish[0]}
            y={riderStartFinish[1]}
            fill={RIDER_AMBER}
            fontSize={2.4}
            fontWeight="700"
            fontFamily="Arial"
            textAnchor="middle"
            alignmentBaseline="middle"
            dy={3.8}
          >
            S/F
          </Text>
        </G>
      ) : null}
      {showNumbers
        ? baked.map((corner) => (
            <G
              key={corner.id}
              onPress={onBakedPress ? () => onBakedPress(corner) : undefined}
              accessibilityLabel={`Turn ${corner.number}`}
            >
              {onBakedPress ? (
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
      {showNumbers
        ? extras.map((corner) => (
            <G
              key={corner.id}
              onPress={onRiderPress ? () => onRiderPress(corner.id) : undefined}
              accessibilityLabel={`Your turn ${corner.number}`}
            >
              {onRiderPress ? (
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
                fill={RIDER_AMBER}
                stroke={CORNER_PAPER}
                strokeWidth={0.45}
              />
              <Text
                x={corner.label[0]}
                y={corner.label[1]}
                fill={DIRECTION_INK}
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
