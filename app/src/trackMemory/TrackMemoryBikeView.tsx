import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = {
  lean: number;
  size?: number;
};

/** Rear 3/4 MotoGP bike panel — leans with rider input. */
export function TrackMemoryBikeView({ lean, size = 120 }: Props) {
  const leanDeg = lean * 32;
  const w = size;
  const h = size * 1.15;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width: w,
          height: h,
          transform: [{ rotate: `${leanDeg}deg` }],
        },
      ]}
    >
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="bikeBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1f2937" />
            <Stop offset="100%" stopColor="#030712" />
          </LinearGradient>
          <LinearGradient id="bikeAccent" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ea580c" />
            <Stop offset="100%" stopColor="#fdba74" />
          </LinearGradient>
        </Defs>

        {/* Shadow */}
        <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.28} ry={h * 0.04} fill="#000" opacity={0.35} />

        {/* Rear tyre */}
        <Ellipse
          cx={w * 0.5}
          cy={h * 0.78}
          rx={w * 0.22}
          ry={h * 0.14}
          fill="#111827"
          stroke="#334155"
          strokeWidth={2}
        />
        <Ellipse cx={w * 0.5} cy={h * 0.78} rx={w * 0.1} ry={h * 0.06} fill="#1e293b" />

        {/* Swingarm */}
        <Path
          d={`M ${w * 0.38} ${h * 0.62} L ${w * 0.45} ${h * 0.76} L ${w * 0.55} ${h * 0.76} L ${w * 0.62} ${h * 0.62}`}
          fill="#374151"
        />

        {/* Seat / tail */}
        <Path
          d={`M ${w * 0.35} ${h * 0.42}
              Q ${w * 0.5} ${h * 0.28} ${w * 0.65} ${h * 0.42}
              L ${w * 0.6} ${h * 0.58}
              Q ${w * 0.5} ${h * 0.62} ${w * 0.4} ${h * 0.58}
              Z`}
          fill="url(#bikeBody)"
        />
        <Path
          d={`M ${w * 0.42} ${h * 0.4}
              Q ${w * 0.5} ${h * 0.32} ${w * 0.58} ${h * 0.4}
              L ${w * 0.56} ${h * 0.48}
              Q ${w * 0.5} ${h * 0.5} ${w * 0.44} ${h * 0.48}
              Z`}
          fill="url(#bikeAccent)"
        />

        {/* Rider torso (leather) */}
        <Path
          d={`M ${w * 0.4} ${h * 0.22}
              Q ${w * 0.5} ${h * 0.12} ${w * 0.6} ${h * 0.22}
              L ${w * 0.58} ${h * 0.4}
              Q ${w * 0.5} ${h * 0.44} ${w * 0.42} ${h * 0.4}
              Z`}
          fill="#0f172a"
        />
        <Path
          d={`M ${w * 0.44} ${h * 0.2}
              Q ${w * 0.5} ${h * 0.14} ${w * 0.56} ${h * 0.2}
              L ${w * 0.54} ${h * 0.32}
              Q ${w * 0.5} ${h * 0.34} ${w * 0.46} ${h * 0.32}
              Z`}
          fill="#f97316"
          opacity={0.9}
        />

        {/* Helmet */}
        <Circle cx={w * 0.5} cy={h * 0.14} r={w * 0.09} fill="#e2e8f0" />
        <Path
          d={`M ${w * 0.43} ${h * 0.14}
              Q ${w * 0.5} ${h * 0.08} ${w * 0.57} ${h * 0.14}
              Q ${w * 0.5} ${h * 0.16} ${w * 0.43} ${h * 0.14}`}
          fill="#0ea5e9"
          opacity={0.7}
        />

        {/* Arms to bars */}
        <Path
          d={`M ${w * 0.42} ${h * 0.28} L ${w * 0.28} ${h * 0.36}`}
          stroke="#92400e"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Path
          d={`M ${w * 0.58} ${h * 0.28} L ${w * 0.72} ${h * 0.36}`}
          stroke="#92400e"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Clip-ons */}
        <Path
          d={`M ${w * 0.22} ${h * 0.38} L ${w * 0.78} ${h * 0.38}`}
          stroke="#94a3b8"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Circle cx={w * 0.26} cy={h * 0.38} r={5} fill="#78716c" />
        <Circle cx={w * 0.74} cy={h * 0.38} r={5} fill="#78716c" />

        {/* Exhaust hint */}
        <Rect x={w * 0.62} y={h * 0.55} width={w * 0.12} height={6} rx={2} fill="#64748b" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
