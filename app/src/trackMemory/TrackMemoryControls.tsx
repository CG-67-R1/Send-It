import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { ControlState } from './types';

type HoldKey = 'accel' | 'brake';

type Props = {
  held: Pick<ControlState, 'accel' | 'brake'>;
  onHold: (key: HoldKey, down: boolean) => void;
};

function ArrowPad({
  direction,
  holdKey,
  onHold,
  active,
}: {
  direction: 'up' | 'down';
  holdKey: HoldKey;
  onHold: Props['onHold'];
  active: boolean;
}) {
  return (
    <View
      style={[styles.pad, active && styles.padActive, direction === 'up' ? styles.padAccel : styles.padBrake]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={() => onHold(holdKey, true)}
      onResponderRelease={() => onHold(holdKey, false)}
      onResponderTerminate={() => onHold(holdKey, false)}
    >
      <Svg width={28} height={28}>
        {direction === 'up' ? (
          <Path
            d="M14 6 L22 18 L6 18 Z"
            fill="#f8fafc"
            stroke="#86efac"
            strokeWidth={1.5}
          />
        ) : (
          <Path
            d="M6 10 L22 10 L14 22 Z"
            fill="#f8fafc"
            stroke="#fca5a5"
            strokeWidth={1.5}
          />
        )}
      </Svg>
      <Text style={styles.padLabel}>{direction === 'up' ? 'GO' : 'BRK'}</Text>
    </View>
  );
}

/** Compact landscape accel/brake only — lean via device tilt. */
export function TrackMemoryControls({ held, onHold }: Props) {
  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.stack}>
        <ArrowPad direction="up" holdKey="accel" onHold={onHold} active={held.accel} />
        <ArrowPad direction="down" holdKey="brake" onHold={onHold} active={held.brake} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    zIndex: 20,
  },
  stack: {
    gap: 10,
    alignItems: 'center',
  },
  pad: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  padAccel: {
    borderColor: 'rgba(74,222,128,0.75)',
  },
  padBrake: {
    borderColor: 'rgba(248,113,113,0.75)',
  },
  padActive: {
    backgroundColor: 'rgba(251,191,36,0.35)',
    borderColor: '#fbbf24',
  },
  padLabel: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
});
