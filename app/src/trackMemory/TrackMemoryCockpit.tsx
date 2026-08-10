import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  lean: number;
};

/** Simple MotoGP-style bars / fairing (no mirrors), rolls with lean. */
export function TrackMemoryCockpit({ width, height, lean }: Props) {
  const leanDeg = lean * 12;
  const cockpitH = Math.min(220, height * 0.34);
  const top = height - cockpitH;

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
        {/* Fairing nose */}
        <Path
          d={`M ${width * 0.28} ${cockpitH * 0.95}
              Q ${width * 0.5} ${cockpitH * 0.15} ${width * 0.72} ${cockpitH * 0.95}
              Z`}
          fill="#111827"
        />
        <Path
          d={`M ${width * 0.34} ${cockpitH * 0.92}
              Q ${width * 0.5} ${cockpitH * 0.32} ${width * 0.66} ${cockpitH * 0.92}
              Z`}
          fill="#f97316"
          opacity={0.9}
        />
        {/* Tank / dash */}
        <Ellipse
          cx={width * 0.5}
          cy={cockpitH * 0.78}
          rx={width * 0.16}
          ry={cockpitH * 0.18}
          fill="#1f2937"
        />
        <Rect
          x={width * 0.42}
          y={cockpitH * 0.62}
          width={width * 0.16}
          height={cockpitH * 0.14}
          rx={6}
          fill="#0ea5e9"
          opacity={0.85}
        />
        {/* Handlebars */}
        <Path
          d={`M ${width * 0.18} ${cockpitH * 0.55}
              Q ${width * 0.35} ${cockpitH * 0.42} ${width * 0.48} ${cockpitH * 0.48}`}
          stroke="#9ca3af"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${width * 0.82} ${cockpitH * 0.55}
              Q ${width * 0.65} ${cockpitH * 0.42} ${width * 0.52} ${cockpitH * 0.48}`}
          stroke="#9ca3af"
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
        />
        {/* Gloves */}
        <Circle cx={width * 0.2} cy={cockpitH * 0.56} r={14} fill="#92400e" />
        <Circle cx={width * 0.8} cy={cockpitH * 0.56} r={14} fill="#92400e" />
        <Circle cx={width * 0.2} cy={cockpitH * 0.56} r={7} fill="#78350f" />
        <Circle cx={width * 0.8} cy={cockpitH * 0.56} r={7} fill="#78350f" />
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
