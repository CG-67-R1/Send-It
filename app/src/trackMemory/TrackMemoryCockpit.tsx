import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const POSTIE_COCKPIT = require('../../assets/track-memory/postie-cockpit.png');

type Props = {
  width: number;
  height: number;
  lean: number;
  speedMps?: number;
  lap?: number;
  totalLaps?: number;
};

/**
 * Static postie-bike POV photo with live speed / lap overlay.
 * Lean rotates the whole plate for smooth corner feel.
 */
export function TrackMemoryCockpit({
  width,
  height,
  lean,
  speedMps = 0,
  lap = 1,
  totalLaps = 3,
}: Props) {
  const leanDeg = lean * 28;
  const cockpitH = Math.min(Math.round(height * 0.52), Math.round(width * 0.62));
  const top = height - cockpitH;
  const kmh = Math.round(speedMps * 3.6);

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
      <Image source={POSTIE_COCKPIT} style={styles.image} resizeMode="cover" />
      {/* Live readouts over the photo's LCD / dash area */}
      <View style={styles.hud}>
        <Text style={styles.speed}>{kmh}</Text>
        <Text style={styles.meta}>
          km/h · L{Math.min(lap, totalLaps)}/{totalLaps}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  hud: {
    position: 'absolute',
    alignSelf: 'center',
    top: '38%',
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
