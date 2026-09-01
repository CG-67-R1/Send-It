import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { TrackInfoCorner, TrackInfoInfra, TrackInfoMap } from '../data/trackInfo/types';
import { getTrackInfoInfrastructure } from '../data/trackInfo';

const HOTSPOT_HIT = 48;
const HOTSPOT_DOT = 22;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 2;
const ZOOM_STEP = 0.5;

const SISTER_STROKES = ['#64748b', '#a78bfa', '#38bdf8'];

type WebHoverTouchProps = React.ComponentProps<typeof TouchableOpacity> & {
  title?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

type Props = {
  map: TrackInfoMap;
  selectedCornerId: string | null;
  onSelectCorner: (corner: TrackInfoCorner) => void;
};

function polylinePath(points: number[][], close = true): string {
  if (points.length === 0) return '';
  const first = points[0];
  return `M ${first[0]} ${first[1]} ${points
    .slice(1)
    .map((p) => `L ${p[0]} ${p[1]}`)
    .join(' ')}${close ? ' Z' : ''}`;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 2) / 2));
}

export function TrackFacilityMap({ map, selectedCornerId, onSelectCorner }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const infra = useMemo(() => getTrackInfoInfrastructure(map.trackId), [map.trackId]);

  useEffect(() => {
    setZoom(DEFAULT_ZOOM);
    setHoveredId(null);
  }, [map.trackId]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  const inner = size.width > 0 ? size.width * zoom : 0;
  const labelCorner = map.corners.find((c) => c.id === (hoveredId ?? selectedCornerId));
  const water = infra.filter((f) => f.kind === 'water');
  const markers = infra.filter((f) => f.kind !== 'water');

  return (
    <View>
      <View style={styles.mapWrap} onLayout={onLayout}>
        <ScrollView
          style={StyleSheet.absoluteFill}
          nestedScrollEnabled
          directionalLockEnabled={false}
          maximumZoomScale={MAX_ZOOM}
          minimumZoomScale={MIN_ZOOM}
          bouncesZoom
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator
          >
            {inner > 0 ? (
              <View style={{ width: inner, height: inner }}>
                <Svg width="100%" height="100%" viewBox="0 0 100 100">
                  <RectFill />
                  {water.map((w) => (
                    <Ellipse
                      key={w.id}
                      cx={w.xPct}
                      cy={w.yPct}
                      rx={w.rxPct ?? 5}
                      ry={w.ryPct ?? 3.5}
                      fill="#4ea3d9"
                      opacity={0.9}
                    />
                  ))}
                  {map.sisters.map((sister, i) => (
                    <Path
                      key={sister.trackId}
                      d={polylinePath(sister.polyline)}
                      fill="none"
                      stroke={SISTER_STROKES[i % SISTER_STROKES.length]}
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={0.45}
                    />
                  ))}
                  <Path
                    d={polylinePath(map.polyline)}
                    fill="none"
                    stroke="#c0392b"
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {markers.map((m) => (
                    <InfraMark key={m.id} feature={m} />
                  ))}
                  <Circle cx={map.startFinish.xPct} cy={map.startFinish.yPct} r={1.15} fill="#0f172a" />
                  <SvgText
                    x={map.startFinish.xPct + 2.2}
                    y={map.startFinish.yPct - 1.4}
                    fill="#0f172a"
                    fontSize={2.6}
                    fontWeight="700"
                  >
                    S/F
                  </SvgText>
                  {water.map((w) => (
                    <SvgText
                      key={`${w.id}-label`}
                      x={w.xPct}
                      y={(w.yPct ?? 0) + 0.4}
                      fill="#0f172a"
                      fontSize={2.2}
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {w.label}
                    </SvgText>
                  ))}
                </Svg>

                {map.corners.map((corner) => {
                  const left = (corner.xPct / 100) * inner - HOTSPOT_HIT / 2;
                  const top = (corner.yPct / 100) * inner - HOTSPOT_HIT / 2;
                  const hotspotProps: WebHoverTouchProps = {
                    style: [styles.hotspot, { left, top }],
                    onPress: () => onSelectCorner(corner),
                    activeOpacity: 0.7,
                    accessibilityLabel: `Turn ${corner.number} ${corner.label}`,
                    accessibilityHint: 'Open corner information and saved notes',
                    accessibilityRole: 'button',
                    hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
                    ...(Platform.OS === 'web'
                      ? {
                          title: corner.label,
                          onMouseEnter: () => setHoveredId(corner.id),
                          onMouseLeave: () => setHoveredId(null),
                        }
                      : {}),
                  };
                  return (
                    <TouchableOpacity key={corner.id} {...hotspotProps}>
                      <View
                        style={[
                          styles.dot,
                          selectedCornerId === corner.id ? styles.dotSelected : null,
                        ]}
                      >
                        <Text style={styles.dotNum}>{corner.number}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {labelCorner ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.floatLabel,
                      {
                        left: Math.max(4, Math.min((labelCorner.xPct / 100) * inner - 80, inner - 164)),
                        top: Math.max(2, (labelCorner.yPct / 100) * inner - 34),
                      },
                    ]}
                  >
                    <Text style={styles.floatLabelText}>
                      T{labelCorner.number} {labelCorner.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </ScrollView>

        <View style={styles.zoomBar} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
          >
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{zoom.toFixed(1)}×</Text>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
          >
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.hint}>Map starts at 2×. Use + / − and pan to pick a numbered corner.</Text>
      <View style={styles.legend}>
        <LegendSwatch color="#c0392b" label="Selected layout" />
        {map.sisters[0] ? <LegendSwatch color="#64748b" label="Other layouts" /> : null}
        <LegendSwatch color="#4ea3d9" label="Water" />
        <LegendSwatch color="#7c3aed" label="Pit entry / lane / exit" />
        <LegendSwatch color="#ef4444" label="Corners" />
      </View>
    </View>
  );
}

function RectFill() {
  return <Path d="M 0 0 H 100 V 100 H 0 Z" fill="#c5e0b4" />;
}

function InfraMark({ feature }: { feature: TrackInfoInfra }) {
  if (feature.kind === 'pit_lane' && feature.polyline && feature.polyline.length > 1) {
    const mid = feature.polyline[Math.floor(feature.polyline.length / 2)];
    return (
      <G>
        <Path
          d={polylinePath(feature.polyline, false)}
          fill="none"
          stroke="#6d28d9"
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
        {mid ? (
          <SvgText
            x={mid[0]}
            y={mid[1] - 1.6}
            fill="#0f172a"
            fontSize={2.1}
            fontWeight="700"
            textAnchor="middle"
          >
            {feature.label}
          </SvgText>
        ) : null}
      </G>
    );
  }
  if (feature.kind === 'bridge') {
    return (
      <G>
        <Line
          x1={(feature.xPct ?? 0) - 2.4}
          y1={feature.yPct}
          x2={(feature.xPct ?? 0) + 2.4}
          y2={feature.yPct}
          stroke="#0f172a"
          strokeWidth={0.9}
        />
        <Line
          x1={(feature.xPct ?? 0) - 2.4}
          y1={(feature.yPct ?? 0) - 1.2}
          x2={(feature.xPct ?? 0) + 2.4}
          y2={(feature.yPct ?? 0) + 1.2}
          stroke="#f8fafc"
          strokeWidth={0.45}
        />
        <SvgText
          x={feature.xPct}
          y={(feature.yPct ?? 0) + 3.2}
          fill="#0f172a"
          fontSize={2.1}
          fontWeight="700"
          textAnchor="middle"
        >
          {feature.label}
        </SvgText>
      </G>
    );
  }
  if (feature.xPct == null || feature.yPct == null) return null;
  const color = feature.kind === 'pit_entry' ? '#7c3aed' : '#0f766e';
  return (
    <G>
      <Circle cx={feature.xPct} cy={feature.yPct} r={1.05} fill={color} />
      <SvgText
        x={feature.xPct}
        y={feature.yPct - 1.6}
        fill="#0f172a"
        fontSize={2.1}
        fontWeight="700"
        textAnchor="middle"
      >
        {feature.label}
      </SvgText>
    </G>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    width: '100%',
    aspectRatio: 0.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#c5e0b4',
    borderWidth: 1,
    borderColor: '#334155',
  },
  hotspot: {
    position: 'absolute',
    width: HOTSPOT_HIT,
    height: HOTSPOT_HIT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dot: {
    width: HOTSPOT_DOT,
    height: HOTSPOT_DOT,
    borderRadius: HOTSPOT_DOT / 2,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: {
    borderColor: '#f8fafc',
    transform: [{ scale: 1.12 }],
  },
  dotNum: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  floatLabel: {
    position: 'absolute',
    width: 160,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: '#ef4444',
    zIndex: 2,
  },
  floatLabelText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  zoomBar: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  zoomBtn: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  zoomLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 20,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
