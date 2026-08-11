import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  lean: number;
  speedMps?: number;
  lap?: number;
  totalLaps?: number;
};

function gearFromKmh(kmh: number): number {
  if (kmh < 40) return 1;
  if (kmh < 70) return 2;
  if (kmh < 100) return 3;
  if (kmh < 140) return 4;
  if (kmh < 180) return 5;
  return 6;
}

/**
 * Humorous red postie / delivery-bike POV (rack, small LCD, hands, mirrors).
 * No mystery clutter above the instrument panel.
 */
export function TrackMemoryCockpit({
  width,
  height,
  lean,
  speedMps = 0,
  lap = 1,
  totalLaps = 3,
}: Props) {
  const leanDeg = lean * 26;
  const cockpitH = Math.min(Math.round(height * 0.36), 200);
  const top = height - cockpitH;
  const kmh = Math.round(speedMps * 3.6);
  const gear = gearFromKmh(kmh);

  const dash = useMemo(() => {
    const cx = width * 0.5;
    const cy = cockpitH * 0.42;
    const dw = Math.min(88, width * 0.22);
    const dh = Math.min(36, cockpitH * 0.2);
    return { cx, cy, x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh };
  }, [width, cockpitH]);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width,
          height: cockpitH,
          top,
          transform: [{ rotate: `${leanDeg}deg` }],
        },
      ]}
    >
      <Svg width={width} height={cockpitH}>
        <Defs>
          <LinearGradient id="postieRed" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ef4444" />
            <Stop offset="100%" stopColor="#991b1b" />
          </LinearGradient>
          <LinearGradient id="lcd" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0ea5e9" />
            <Stop offset="100%" stopColor="#0c4a6e" />
          </LinearGradient>
        </Defs>

        {/* Front rack (humour) */}
        <Path
          d={`M ${width * 0.32} ${cockpitH * 0.28}
              L ${width * 0.32} ${cockpitH * 0.12}
              L ${width * 0.68} ${cockpitH * 0.12}
              L ${width * 0.68} ${cockpitH * 0.28}`}
          stroke="#94a3b8"
          strokeWidth={3}
          fill="none"
        />
        <Path
          d={`M ${width * 0.34} ${cockpitH * 0.12} L ${width * 0.34} ${cockpitH * 0.05}
              M ${width * 0.5} ${cockpitH * 0.12} L ${width * 0.5} ${cockpitH * 0.05}
              M ${width * 0.66} ${cockpitH * 0.12} L ${width * 0.66} ${cockpitH * 0.05}`}
          stroke="#64748b"
          strokeWidth={2}
        />
        <Path
          d={`M ${width * 0.32} ${cockpitH * 0.05} L ${width * 0.68} ${cockpitH * 0.05}`}
          stroke="#94a3b8"
          strokeWidth={2.5}
        />

        {/* Red nose / body under rack */}
        <Path
          d={`M ${width * 0.28} ${cockpitH * 0.98}
              Q ${width * 0.5} ${cockpitH * 0.22} ${width * 0.72} ${cockpitH * 0.98}
              Z`}
          fill="url(#postieRed)"
        />
        {/* POST bag hint right */}
        <Ellipse
          cx={width * 0.72}
          cy={cockpitH * 0.55}
          rx={width * 0.08}
          ry={cockpitH * 0.16}
          fill="#b91c1c"
          opacity={0.9}
        />
        <SvgText
          x={width * 0.72}
          y={cockpitH * 0.57}
          fill="#fef2f2"
          fontSize={9}
          fontWeight="800"
          textAnchor="middle"
        >
          POST
        </SvgText>

        {/* Clean instrument panel only — no wires above */}
        <Rect
          x={dash.x - 3}
          y={dash.y - 3}
          width={dash.w + 6}
          height={dash.h + 6}
          rx={5}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth={1}
        />
        <Rect x={dash.x} y={dash.y} width={dash.w} height={dash.h} rx={4} fill="url(#lcd)" />
        <SvgText
          x={dash.cx}
          y={dash.y + dash.h * 0.62}
          fill="#f8fafc"
          fontSize={Math.min(22, dash.h * 0.7)}
          fontWeight="800"
          textAnchor="middle"
        >
          {String(kmh)}
        </SvgText>
        <SvgText
          x={dash.x + 6}
          y={dash.y + dash.h - 4}
          fill="#bae6fd"
          fontSize={8}
          fontWeight="700"
        >
          {`G${gear}`}
        </SvgText>
        <SvgText
          x={dash.x + dash.w - 6}
          y={dash.y + dash.h - 4}
          fill="#fde68a"
          fontSize={8}
          fontWeight="700"
          textAnchor="end"
        >
          {`${lap}/${totalLaps}`}
        </SvgText>

        {/* Round mirrors (humour) */}
        <Circle cx={width * 0.18} cy={cockpitH * 0.22} r={16} fill="#cbd5e1" stroke="#64748b" strokeWidth={2} />
        <Circle cx={width * 0.18} cy={cockpitH * 0.22} r={11} fill="#334155" />
        <Circle cx={width * 0.82} cy={cockpitH * 0.22} r={16} fill="#cbd5e1" stroke="#64748b" strokeWidth={2} />
        <Circle cx={width * 0.82} cy={cockpitH * 0.22} r={11} fill="#334155" />
        <Path
          d={`M ${width * 0.22} ${cockpitH * 0.28} L ${width * 0.3} ${cockpitH * 0.4}`}
          stroke="#94a3b8"
          strokeWidth={2}
        />
        <Path
          d={`M ${width * 0.78} ${cockpitH * 0.28} L ${width * 0.7} ${cockpitH * 0.4}`}
          stroke="#94a3b8"
          strokeWidth={2}
        />

        {/* Handlebars */}
        <Path
          d={`M ${width * 0.12} ${cockpitH * 0.55}
              Q ${width * 0.32} ${cockpitH * 0.4} ${width * 0.46} ${cockpitH * 0.48}`}
          stroke="#111827"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.88} ${cockpitH * 0.55}
              Q ${width * 0.68} ${cockpitH * 0.4} ${width * 0.54} ${cockpitH * 0.48}`}
          stroke="#111827"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Grips */}
        <Path
          d={`M ${width * 0.1} ${cockpitH * 0.54} L ${width * 0.16} ${cockpitH * 0.52}`}
          stroke="#0f172a"
          strokeWidth={11}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.9} ${cockpitH * 0.54} L ${width * 0.84} ${cockpitH * 0.52}`}
          stroke="#0f172a"
          strokeWidth={11}
          strokeLinecap="round"
        />

        {/* Left kill switch */}
        <Circle cx={width * 0.26} cy={cockpitH * 0.44} r={6} fill="#dc2626" stroke="#7f1d1d" strokeWidth={1} />

        {/* Gloves / sleeves */}
        <Ellipse cx={width * 0.14} cy={cockpitH * 0.58} rx={18} ry={14} fill="#111827" />
        <Circle cx={width * 0.14} cy={cockpitH * 0.55} r={12} fill="#1f2937" />
        <Ellipse cx={width * 0.86} cy={cockpitH * 0.58} rx={18} ry={14} fill="#111827" />
        <Circle cx={width * 0.86} cy={cockpitH * 0.55} r={12} fill="#1f2937" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
