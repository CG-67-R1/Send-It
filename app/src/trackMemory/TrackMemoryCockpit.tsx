import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  lean: number;
  /** Speed in m/s from the game. */
  speedMps?: number;
  lap?: number;
  totalLaps?: number;
};

function gearFromKmh(kmh: number): number {
  if (kmh < 5) return 1;
  if (kmh < 40) return 1;
  if (kmh < 70) return 2;
  if (kmh < 100) return 3;
  if (kmh < 140) return 4;
  if (kmh < 180) return 5;
  return 6;
}

/** RPM fraction 0–1 for dash bar (arcade, not real engine model). */
function rpmFrac(kmh: number, gear: number): number {
  const bands = [0, 40, 70, 100, 140, 180, 230];
  const lo = bands[gear - 1] ?? 0;
  const hi = bands[gear] ?? 230;
  return Math.max(0.08, Math.min(0.98, (kmh - lo) / Math.max(1, hi - lo)));
}

/** MotoGP-style cockpit: detailed dash cluster, bars, no mirrors. */
export function TrackMemoryCockpit({
  width,
  height,
  lean,
  speedMps = 0,
  lap = 1,
  totalLaps = 3,
}: Props) {
  const leanDeg = lean * 12;
  const cockpitH = Math.min(220, height * 0.34);
  const top = height - cockpitH;

  const kmh = Math.round(speedMps * 3.6);
  const gear = gearFromKmh(kmh);
  const rpm = rpmFrac(kmh, gear);

  const dash = useMemo(() => {
    const cx = width * 0.5;
    const cy = cockpitH * 0.58;
    const dw = Math.min(width * 0.42, 190);
    const dh = Math.min(cockpitH * 0.42, 78);
    return {
      cx,
      cy,
      x: cx - dw / 2,
      y: cy - dh / 2,
      w: dw,
      h: dh,
    };
  }, [width, cockpitH]);

  const rpmBarW = dash.w * 0.78;
  const rpmFill = rpmBarW * rpm;
  const rpmColor = rpm > 0.88 ? '#ef4444' : rpm > 0.7 ? '#f59e0b' : '#22c55e';

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
          <LinearGradient id="noseGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1f2937" />
            <Stop offset="100%" stopColor="#030712" />
          </LinearGradient>
          <LinearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ea580c" />
            <Stop offset="50%" stopColor="#fb923c" />
            <Stop offset="100%" stopColor="#ea580c" />
          </LinearGradient>
          <LinearGradient id="dashGlass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0c4a6e" />
            <Stop offset="55%" stopColor="#082f49" />
            <Stop offset="100%" stopColor="#020617" />
          </LinearGradient>
        </Defs>

        {/* Upper fairing / windscreen lip */}
        <Path
          d={`M ${width * 0.22} ${cockpitH * 0.22}
              Q ${width * 0.5} ${cockpitH * -0.02} ${width * 0.78} ${cockpitH * 0.22}
              L ${width * 0.72} ${cockpitH * 0.38}
              Q ${width * 0.5} ${cockpitH * 0.28} ${width * 0.28} ${cockpitH * 0.38}
              Z`}
          fill="#111827"
          opacity={0.92}
        />

        {/* Nose / front fairing */}
        <Path
          d={`M ${width * 0.26} ${cockpitH * 0.98}
              Q ${width * 0.5} ${cockpitH * 0.12} ${width * 0.74} ${cockpitH * 0.98}
              Z`}
          fill="url(#noseGrad)"
        />
        {/* Accent stripe */}
        <Path
          d={`M ${width * 0.34} ${cockpitH * 0.94}
              Q ${width * 0.5} ${cockpitH * 0.3} ${width * 0.66} ${cockpitH * 0.94}
              Z`}
          fill="url(#accentGrad)"
          opacity={0.95}
        />
        {/* Air intake slits */}
        <Path
          d={`M ${width * 0.4} ${cockpitH * 0.72}
              Q ${width * 0.44} ${cockpitH * 0.58} ${width * 0.46} ${cockpitH * 0.72}
              Z`}
          fill="#020617"
        />
        <Path
          d={`M ${width * 0.54} ${cockpitH * 0.72}
              Q ${width * 0.56} ${cockpitH * 0.58} ${width * 0.6} ${cockpitH * 0.72}
              Z`}
          fill="#020617"
        />

        {/* Tank top behind dash */}
        <Path
          d={`M ${width * 0.3} ${cockpitH * 0.98}
              Q ${width * 0.5} ${cockpitH * 0.7} ${width * 0.7} ${cockpitH * 0.98}
              Z`}
          fill="#1e293b"
        />

        {/* Dash bezel */}
        <Rect
          x={dash.x - 4}
          y={dash.y - 4}
          width={dash.w + 8}
          height={dash.h + 8}
          rx={10}
          fill="#0f172a"
          stroke="#64748b"
          strokeWidth={1.5}
        />
        <Rect
          x={dash.x}
          y={dash.y}
          width={dash.w}
          height={dash.h}
          rx={7}
          fill="url(#dashGlass)"
        />
        {/* Screen highlight */}
        <Rect
          x={dash.x + 4}
          y={dash.y + 3}
          width={dash.w - 8}
          height={dash.h * 0.22}
          rx={4}
          fill="#38bdf8"
          opacity={0.12}
        />

        {/* RPM bar track */}
        <Rect
          x={dash.x + dash.w * 0.11}
          y={dash.y + dash.h * 0.14}
          width={rpmBarW}
          height={6}
          rx={3}
          fill="#1e293b"
        />
        <Rect
          x={dash.x + dash.w * 0.11}
          y={dash.y + dash.h * 0.14}
          width={rpmFill}
          height={6}
          rx={3}
          fill={rpmColor}
        />
        {/* RPM tick marks */}
        {[0.25, 0.5, 0.75, 0.9].map((t) => (
          <Rect
            key={`tick-${t}`}
            x={dash.x + dash.w * 0.11 + rpmBarW * t}
            y={dash.y + dash.h * 0.12}
            width={1.2}
            height={10}
            fill="#94a3b8"
            opacity={0.7}
          />
        ))}

        {/* Gear */}
        <SvgText
          x={dash.x + dash.w * 0.14}
          y={dash.y + dash.h * 0.62}
          fill="#94a3b8"
          fontSize={9}
          fontWeight="700"
        >
          GEAR
        </SvgText>
        <SvgText
          x={dash.x + dash.w * 0.14}
          y={dash.y + dash.h * 0.88}
          fill="#f8fafc"
          fontSize={22}
          fontWeight="800"
        >
          {String(gear)}
        </SvgText>

        {/* Speed */}
        <SvgText
          x={dash.cx}
          y={dash.y + dash.h * 0.72}
          fill="#f8fafc"
          fontSize={28}
          fontWeight="800"
          textAnchor="middle"
        >
          {String(kmh)}
        </SvgText>
        <SvgText
          x={dash.cx}
          y={dash.y + dash.h * 0.92}
          fill="#38bdf8"
          fontSize={9}
          fontWeight="700"
          textAnchor="middle"
        >
          KM/H
        </SvgText>

        {/* Lap */}
        <SvgText
          x={dash.x + dash.w * 0.86}
          y={dash.y + dash.h * 0.62}
          fill="#94a3b8"
          fontSize={9}
          fontWeight="700"
          textAnchor="end"
        >
          LAP
        </SvgText>
        <SvgText
          x={dash.x + dash.w * 0.86}
          y={dash.y + dash.h * 0.88}
          fill="#fbbf24"
          fontSize={16}
          fontWeight="800"
          textAnchor="end"
        >
          {`${lap}/${totalLaps}`}
        </SvgText>

        {/* Left switchgear */}
        <Rect
          x={width * 0.14}
          y={cockpitH * 0.48}
          width={36}
          height={28}
          rx={4}
          fill="#111827"
          stroke="#475569"
          strokeWidth={1}
        />
        <Circle cx={width * 0.17} cy={cockpitH * 0.55} r={4} fill="#ef4444" />
        <Circle cx={width * 0.225} cy={cockpitH * 0.52} r={3.5} fill="#22c55e" />
        <Circle cx={width * 0.225} cy={cockpitH * 0.6} r={3.5} fill="#eab308" />

        {/* Right switchgear */}
        <Rect
          x={width * 0.14 + width * 0.72 - 36}
          y={cockpitH * 0.48}
          width={36}
          height={28}
          rx={4}
          fill="#111827"
          stroke="#475569"
          strokeWidth={1}
        />
        <Circle cx={width * 0.82} cy={cockpitH * 0.55} r={4} fill="#ef4444" />
        <Rect
          x={width * 0.845}
          y={cockpitH * 0.5}
          width={10}
          height={6}
          rx={1}
          fill="#38bdf8"
        />
        <Rect
          x={width * 0.845}
          y={cockpitH * 0.58}
          width={10}
          height={6}
          rx={1}
          fill="#64748b"
        />

        {/* Brake fluid reservoir (right) */}
        <Rect
          x={width * 0.62}
          y={cockpitH * 0.4}
          width={14}
          height={16}
          rx={2}
          fill="#e2e8f0"
          opacity={0.85}
        />
        <Rect
          x={width * 0.625}
          y={cockpitH * 0.45}
          width={10}
          height={8}
          rx={1}
          fill="#f97316"
          opacity={0.55}
        />

        {/* Clip-ons / handlebars (no mirrors) */}
        <Path
          d={`M ${width * 0.12} ${cockpitH * 0.58}
              Q ${width * 0.3} ${cockpitH * 0.4} ${width * 0.46} ${cockpitH * 0.5}`}
          stroke="#cbd5e1"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.88} ${cockpitH * 0.58}
              Q ${width * 0.7} ${cockpitH * 0.4} ${width * 0.54} ${cockpitH * 0.5}`}
          stroke="#cbd5e1"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Bar ends / grips under gloves */}
        <Path
          d={`M ${width * 0.1} ${cockpitH * 0.57} L ${width * 0.16} ${cockpitH * 0.55}`}
          stroke="#78716c"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.9} ${cockpitH * 0.57} L ${width * 0.84} ${cockpitH * 0.55}`}
          stroke="#78716c"
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Lever hints */}
        <Path
          d={`M ${width * 0.15} ${cockpitH * 0.5}
              Q ${width * 0.22} ${cockpitH * 0.44} ${width * 0.28} ${cockpitH * 0.48}`}
          stroke="#94a3b8"
          strokeWidth={2.5}
          fill="none"
          opacity={0.7}
        />
        <Path
          d={`M ${width * 0.85} ${cockpitH * 0.5}
              Q ${width * 0.78} ${cockpitH * 0.44} ${width * 0.72} ${cockpitH * 0.48}`}
          stroke="#94a3b8"
          strokeWidth={2.5}
          fill="none"
          opacity={0.7}
        />

        {/* Gloves */}
        <Circle cx={width * 0.155} cy={cockpitH * 0.57} r={15} fill="#92400e" />
        <Circle cx={width * 0.845} cy={cockpitH * 0.57} r={15} fill="#92400e" />
        <Circle cx={width * 0.155} cy={cockpitH * 0.57} r={8} fill="#78350f" />
        <Circle cx={width * 0.845} cy={cockpitH * 0.57} r={8} fill="#78350f" />
        {/* Knuckle highlight */}
        <Circle cx={width * 0.14} cy={cockpitH * 0.545} r={3} fill="#a16207" opacity={0.6} />
        <Circle cx={width * 0.86} cy={cockpitH * 0.545} r={3} fill="#a16207" opacity={0.6} />
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
