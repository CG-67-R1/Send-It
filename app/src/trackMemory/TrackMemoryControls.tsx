import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ControlState } from './types';
import { TrackMemoryBikeView } from './TrackMemoryBikeView';

type HoldKey = keyof ControlState;

type Props = {
  lean: number;
  held: ControlState;
  onHold: (key: HoldKey, down: boolean) => void;
  onReset: () => void;
};

function HoldPad({
  label,
  sub,
  holdKey,
  onHold,
  active,
  variant,
  tall,
}: {
  label: string;
  sub?: string;
  holdKey: HoldKey;
  onHold: Props['onHold'];
  active: boolean;
  variant: 'steer' | 'brake' | 'accel';
  tall?: boolean;
}) {
  const tone =
    variant === 'accel'
      ? styles.padAccel
      : variant === 'brake'
        ? styles.padBrake
        : styles.padSteer;

  return (
    <View
      style={[styles.pad, tall && styles.padTall, tone, active && styles.padActive]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={() => onHold(holdKey, true)}
      onResponderRelease={() => onHold(holdKey, false)}
      onResponderTerminate={() => onHold(holdKey, false)}
    >
      {variant === 'steer' ? (
        <Svg width={36} height={36} style={styles.padIcon}>
          {holdKey === 'left' ? (
            <Path
              d="M22 8 L10 18 L22 28"
              stroke="#f8fafc"
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <Path
              d="M14 8 L26 18 L14 28"
              stroke="#f8fafc"
              strokeWidth={3.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      ) : variant === 'brake' ? (
        <Svg width={36} height={36} style={styles.padIcon}>
          <Rect x={10} y={8} width={16} height={20} rx={3} fill="none" stroke="#f8fafc" strokeWidth={2.5} />
          <Path d="M14 14 H22 M14 18 H22 M14 22 H20" stroke="#fca5a5" strokeWidth={2} />
        </Svg>
      ) : (
        <Svg width={36} height={36} style={styles.padIcon}>
          <Circle cx={18} cy={18} r={11} fill="none" stroke="#f8fafc" strokeWidth={2.5} />
          <Path d="M18 12 V24 M13 18 H23" stroke="#86efac" strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      )}
      <Text style={styles.padLabel}>{label}</Text>
      {sub ? <Text style={styles.padSub}>{sub}</Text> : null}
    </View>
  );
}

export function TrackMemoryControls({ lean, held, onHold, onReset }: Props) {
  const leanPct = Math.round(Math.abs(lean) * 100);
  const leanSide = lean < -0.05 ? 'LEFT' : lean > 0.05 ? 'RIGHT' : 'UPRIGHT';

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.bikeRow} pointerEvents="none">
        <TrackMemoryBikeView lean={lean} size={108} />
        <View style={styles.leanMeter}>
          <Text style={styles.leanTitle}>LEAN</Text>
          <Text style={styles.leanValue}>
            {leanSide} {leanPct}%
          </Text>
          <View style={styles.leanBarTrack}>
            <View style={styles.leanBarMid} />
            <View
              style={[
                styles.leanBarFill,
                lean < 0
                  ? { right: '50%', width: `${leanPct / 2}%` }
                  : lean > 0
                    ? { left: '50%', width: `${leanPct / 2}%` }
                    : { width: 0 },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cluster}>
          <HoldPad
            label="LEAN L"
            sub="Tip left"
            holdKey="left"
            onHold={onHold}
            active={held.left}
            variant="steer"
            tall
          />
          <HoldPad
            label="LEAN R"
            sub="Tip right"
            holdKey="right"
            onHold={onHold}
            active={held.right}
            variant="steer"
            tall
          />
        </View>

        <View
          style={styles.reset}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onReset}
        >
          <Text style={styles.resetText}>RESET</Text>
          <Text style={styles.resetSub}>Start / finish</Text>
        </View>

        <View style={styles.cluster}>
          <HoldPad
            label="BRAKE"
            sub="Hold"
            holdKey="brake"
            onHold={onHold}
            active={held.brake}
            variant="brake"
            tall
          />
          <HoldPad
            label="ACCEL"
            sub="Throttle"
            holdKey="accel"
            onHold={onHold}
            active={held.accel}
            variant="accel"
            tall
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  bikeRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  leanMeter: {
    marginTop: -4,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    minWidth: 120,
  },
  leanTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  leanValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  leanBarTrack: {
    marginTop: 6,
    width: 110,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(51,65,85,0.9)',
    overflow: 'hidden',
    position: 'relative',
  },
  leanBarMid: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(248,250,252,0.45)',
  },
  leanBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cluster: {
    flexDirection: 'row',
    gap: 8,
  },
  pad: {
    minWidth: 68,
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  padTall: {
    minHeight: 84,
  },
  padSteer: {
    borderColor: 'rgba(56,189,248,0.65)',
  },
  padBrake: {
    borderColor: 'rgba(248,113,113,0.7)',
  },
  padAccel: {
    borderColor: 'rgba(74,222,128,0.7)',
  },
  padActive: {
    backgroundColor: 'rgba(251,191,36,0.28)',
    borderColor: '#fbbf24',
  },
  padIcon: {
    marginBottom: 2,
  },
  padLabel: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  padSub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2,
  },
  reset: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.55)',
    alignItems: 'center',
    marginBottom: 6,
  },
  resetText: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '800',
  },
  resetSub: {
    color: '#94a3b8',
    fontSize: 9,
    marginTop: 2,
  },
});
