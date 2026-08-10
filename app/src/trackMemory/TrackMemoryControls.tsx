import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type HoldKey = 'left' | 'right' | 'accel' | 'brake';

type Props = {
  onHold: (key: HoldKey, down: boolean) => void;
  onReset: () => void;
};

function HoldButton({
  label,
  onHold,
  holdKey,
  wide,
}: {
  label: string;
  holdKey: HoldKey;
  onHold: Props['onHold'];
  wide?: boolean;
}) {
  return (
    <View
      style={[styles.btn, wide && styles.btnWide]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={() => onHold(holdKey, true)}
      onResponderRelease={() => onHold(holdKey, false)}
      onResponderTerminate={() => onHold(holdKey, false)}
    >
      <Text style={styles.btnText}>{label}</Text>
    </View>
  );
}

export function TrackMemoryControls({ onHold, onReset }: Props) {
  return (
    <View style={styles.row} pointerEvents="box-none">
      <View style={styles.cluster}>
        <HoldButton label="◀" holdKey="left" onHold={onHold} />
        <HoldButton label="▶" holdKey="right" onHold={onHold} />
      </View>
      <View
        style={styles.reset}
        onStartShouldSetResponder={() => true}
        onResponderGrant={onReset}
      >
        <Text style={styles.resetText}>Reset</Text>
      </View>
      <View style={styles.cluster}>
        <HoldButton label="Brake" holdKey="brake" onHold={onHold} />
        <HoldButton label="Accel" holdKey="accel" onHold={onHold} wide />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cluster: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    minWidth: 64,
    minHeight: 64,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(248,250,252,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWide: {
    minWidth: 78,
  },
  btnText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  reset: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.3)',
    marginBottom: 8,
  },
  resetText: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '700',
  },
});
