import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getDefaultTrackMemoryLayout, getTrackMemoryLayout } from '../trackMemory/layouts';
import {
  createInitialState,
  resetGame,
  samplePath,
  stepGame,
  TOTAL_LAPS,
} from '../trackMemory/physics';
import type { ControlState, GameState } from '../trackMemory/types';
import { formatLapTime, readBestLapMs, writeBestLapMs } from '../trackMemory/storage';
import { TrackMemoryRoad } from '../trackMemory/TrackMemoryRoad';
import { TrackMemoryMinimap } from '../trackMemory/TrackMemoryMinimap';
import { TrackMemoryCockpit } from '../trackMemory/TrackMemoryCockpit';
import { TrackMemoryControls } from '../trackMemory/TrackMemoryControls';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

const EMPTY_CONTROLS: ControlState = {
  left: false,
  right: false,
  accel: false,
  brake: false,
};

function keyToControl(code: string): 'accel' | 'brake' | 'reset' | null {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      return 'accel';
    case 'ArrowDown':
    case 'KeyS':
      return 'brake';
    case 'KeyR':
      return 'reset';
    default:
      return null;
  }
}

export function TrackMemoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RiderCoachStackParamList>>();
  const route = useRoute<RouteProp<RiderCoachStackParamList, 'TrackMemory'>>();
  const layout =
    (route.params?.initialTrackId
      ? getTrackMemoryLayout(route.params.initialTrackId)
      : undefined) ?? getDefaultTrackMemoryLayout();
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [state, setState] = useState<GameState>(() => {
    const init = createInitialState(null);
    init.heading = samplePath(layout.points, layout.lengthM, 0).heading;
    return init;
  });
  const [held, setHeld] = useState<ControlState>({ ...EMPTY_CONTROLS });
  const stateRef = useRef(state);
  const controlsRef = useRef<ControlState>({ ...EMPTY_CONTROLS });
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const savedBestRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    void readBestLapMs(layout.trackId).then((best) => {
      if (cancelled) return;
      savedBestRef.current = best;
      setState((s) => ({ ...s, bestLapMs: best }));
    });
    return () => {
      cancelled = true;
    };
  }, [layout.trackId]);

  useEffect(() => {
    if (state.phase !== 'finished' || state.sessionBestLapMs == null) return;
    void writeBestLapMs(layout.trackId, state.sessionBestLapMs).then(() => {
      savedBestRef.current = state.bestLapMs;
    });
  }, [state.phase, state.sessionBestLapMs, state.bestLapMs, layout.trackId]);

  const tick = useCallback((ts: number) => {
    const last = lastTsRef.current ?? ts;
    lastTsRef.current = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    const next = stepGame(stateRef.current, layoutRef.current, controlsRef.current, dt, Date.now());
    stateRef.current = next;
    setState(next);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const applyControl = useCallback((key: keyof ControlState, down: boolean) => {
    controlsRef.current = { ...controlsRef.current, [key]: down };
    setHeld((prev) => (prev[key] === down ? prev : { ...prev, [key]: down }));
  }, []);

  const onReset = useCallback(() => {
    controlsRef.current = { ...EMPTY_CONTROLS };
    setHeld({ ...EMPTY_CONTROLS });
    const next = resetGame(savedBestRef.current ?? stateRef.current.bestLapMs);
    next.heading = samplePath(layoutRef.current.points, layoutRef.current.lengthM, 0).heading;
    stateRef.current = next;
    setState(next);
  }, []);

  const onStop = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);

      // Immersive: hide stack header + parent tab bar while in-game
      navigation.setOptions({ headerShown: false });
      const parent = navigation.getParent();
      parent?.setOptions({
        tabBarStyle: { display: 'none' },
      });

      void (async () => {
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } catch {
          // Web / unsupported — user rotates manually
        }
      })();

      const onKey = (e: KeyboardEvent, down: boolean) => {
        const mapped = keyToControl(e.code);
        if (!mapped) return;
        e.preventDefault();
        if (mapped === 'reset') {
          if (down && !e.repeat) onReset();
          return;
        }
        if (e.repeat && down) return;
        applyControl(mapped, down);
      };

      const onDown = (e: Event) => onKey(e as KeyboardEvent, true);
      const onUp = (e: Event) => onKey(e as KeyboardEvent, false);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
      }

      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTsRef.current = null;
        controlsRef.current = { ...EMPTY_CONTROLS };
        setHeld({ ...EMPTY_CONTROLS });
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.removeEventListener('keydown', onDown);
          window.removeEventListener('keyup', onUp);
        }
        parent?.setOptions({
          tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        });
        void (async () => {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          } catch {
            // ignore
          }
        })();
      };
    }, [tick, applyControl, onReset, navigation])
  );

  const onHold = useCallback(
    (key: 'accel' | 'brake', down: boolean) => {
      applyControl(key, down);
    },
    [applyControl]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.floor(width), h: Math.floor(height) });
  };

  const flashVisible = Boolean(state.flash);
  const flashDanger = state.flash?.tone === 'danger';
  const flashCoach = state.flash?.tone === 'coach';

  return (
    <View style={styles.root} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <TrackMemoryRoad
          layout={layout}
          s={state.s}
          lateral={state.lateral}
          heading={state.heading}
          width={size.w}
          height={size.h}
        />
      ) : (
        <View style={styles.placeholder} />
      )}

      <TrackMemoryCockpit
        width={size.w || 320}
        height={size.h || 640}
        lean={state.lean}
        speedMps={state.speed}
        lap={Math.min(state.lap, TOTAL_LAPS)}
        totalLaps={TOTAL_LAPS}
      />

      <View style={styles.chrome} pointerEvents="box-none">
        <Pressable
          style={styles.stopBtn}
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Stop and exit Track Memory"
        >
          <View style={styles.stopInner}>
            <View style={styles.stopSquare} />
          </View>
        </Pressable>

        <View style={styles.hudCenter} pointerEvents="none">
          <Text style={styles.hudLine}>
            Lap {Math.min(state.lap, TOTAL_LAPS)}/{TOTAL_LAPS} · {formatLapTime(state.lapTimeMs)}
          </Text>
          <Text style={styles.hudBest}>Best {formatLapTime(state.bestLapMs)}</Text>
        </View>

        <TrackMemoryMinimap layout={layout} s={state.s} size={88} />
      </View>

      {flashVisible && state.flash ? (
        <View style={styles.flashWrap} pointerEvents="none">
          <Text
            style={[
              styles.flashText,
              flashDanger && styles.flashDanger,
              flashCoach && styles.flashCoach,
            ]}
          >
            {state.flash.text}
          </Text>
        </View>
      ) : null}

      {state.phase === 'ready' ? (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerTitle}>Track Memory Game</Text>
        </View>
      ) : null}

      {state.phase === 'finished' ? (
        <View style={styles.resultCard} pointerEvents="none">
          <Text style={styles.resultTitle}>Session complete</Text>
          {state.lapTimesMs.map((t, i) => (
            <Text key={`lap-${i}`} style={styles.resultLine}>
              Lap {i + 1}: {formatLapTime(t)}
            </Text>
          ))}
          <Text style={styles.resultBest}>Best: {formatLapTime(state.sessionBestLapMs)}</Text>
          <Text style={styles.resultHint}>Press R to ride again · Stop to exit</Text>
        </View>
      ) : null}

      <TrackMemoryControls held={held} onHold={onHold} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#64748b',
  },
  chrome: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 30,
  },
  stopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(220,38,38,0.92)',
    borderWidth: 2,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 12,
    height: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 2,
  },
  hudCenter: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: 'rgba(15,23,42,0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  hudLine: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hudBest: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  flashWrap: {
    position: 'absolute',
    top: '16%',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  flashText: {
    color: '#fef08a',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
    borderRadius: 8,
  },
  flashDanger: {
    color: '#ef4444',
    fontSize: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  flashCoach: {
    color: '#a5f3fc',
    fontSize: 18,
    backgroundColor: 'rgba(8, 47, 73, 0.72)',
  },
  banner: {
    position: 'absolute',
    top: '36%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultCard: {
    position: 'absolute',
    top: '24%',
    left: 28,
    right: 28,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 18,
    alignItems: 'center',
  },
  resultTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  resultLine: {
    color: '#cbd5e1',
    fontSize: 15,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  resultBest: {
    marginTop: 8,
    color: '#fbbf24',
    fontSize: 17,
    fontWeight: '700',
  },
  resultHint: {
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 13,
  },
});
