import React from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

const POSTIE_COCKPIT = require('../../assets/track-memory/postie-cockpit.png');

type Props = {
  width: number;
  height: number;
  /** Driven straight from the game loop so lean stays smooth without React renders. */
  lean: Animated.Value;
  speedMps?: number;
  lap?: number;
  totalLaps?: number;
};

/**
 * Transparent postie-bike POV overlay on the track.
 * Lean rotates the plate for smooth corner feel.
 */
export function TrackMemoryCockpit({
  width,
  height,
  lean,
  speedMps = 0,
  lap = 1,
  totalLaps = 3,
}: Props) {
  // Physics lean sign is opposite screen tip-in; negate so bike tips toward the inside.
  const rotate = lean.interpolate({
    inputRange: [-1, 1],
    outputRange: ['40deg', '-40deg'],
  });
  // Tall enough to show arms + bag; asphalt shows through transparent areas
  const cockpitH = Math.min(Math.round(height * 0.58), Math.round(width * 0.72));
  const top = height - cockpitH;
  const kmh = Math.round(speedMps * 3.6);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width,
          height: cockpitH,
          top,
          transform: [{ rotate }],
        },
      ]}
    >
      <Image source={POSTIE_COCKPIT} style={styles.image} resizeMode="contain" />
      <View style={styles.hud}>
        <Text style={styles.speed}>{kmh}</Text>
        <Text style={styles.meta}>
          km/h · L{Math.min(lap, totalLaps)}/{totalLaps}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(8, 47, 73, 0.72)',
    alignItems: 'center',
  },
  speed: {
    color: '#f0f9ff',
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  meta: {
    color: '#bae6fd',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
});
