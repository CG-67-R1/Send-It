import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import type { ControlState, FlashState, GamePhase, GameState } from '../trackMemory/types';
import { formatLapTime, readBestLapMs, writeBestLapMs } from '../trackMemory/storage';
import { TrackMemoryRoadView } from '../trackMemory/TrackMemoryRoadView';
import type { TrackMemoryRoadHandle } from '../trackMemory/roadHandle';
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

/**
 * The simulation runs every frame in refs; React only re-renders the chrome at
 * this cadence (plus immediately on phase / coaching changes). Rendering the
 * whole screen per frame is what made the native build lag and crash.
 */
const HUD_INTERVAL_MS = 90;

type Hud = {
  phase: GamePhase;
  lap: number;
  lapTimeMs: number;
  bestLapMs: number | null;
  sessionBestLapMs: number | null;
  lapTimesMs: number[];
  flash: FlashState;
  speed: number;
  s: number;
};

function toHud(state: GameState): Hud {
  return {
    phase: state.phase,
    lap: state.lap,
    lapTimeMs: state.lapTimeMs,
    bestLapMs: state.bestLapMs,
    sessionBestLapMs: state.sessionBestLapMs,
    lapTimesMs: state.lapTimesMs,
    flash: state.flash,
    speed: state.speed,
    s: state.s,
  };
}

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
  // Native locks to landscape on focus. Mounting Skia at the portrait size and
  // then disposing that kit on rotate is what crashed every track before the
  // ride opened. Wait until the lock settles, then create the canvas once.
  const [oriented, setOriented] = useState(Platform.OS === 'web');
  const [forceSurface, setForceSurface] = useState(false);
  const initialState = useMemo(() => {
    const init = createInitialState(null);
    try {
      if (layout.points.length > 1 && layout.lengthM > 0) {
        init.heading = samplePath(layout.points, layout.lengthM, 0).heading;
      }
    } catch {
      init.heading = 0;
    }
    return init;
  }, [layout]);

  const [held, setHeld] = useState<ControlState>({ ...EMPTY_CONTROLS });
  const [hud, setHud] = useState<Hud>(() => toHud(initialState));
  const hudRef = useRef(hud);
  const hudAtRef = useRef(0);
  const stateRef = useRef(initialState);
  const controlsRef = useRef<ControlState>({ ...EMPTY_CONTROLS });
  const roadRef = useRef<TrackMemoryRoadHandle>(null);
  const leanAnim = useRef(new Animated.Value(initialState.lean)).current;
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const savedBestRef = useRef<number | null>(null);

  const publishHud = useCallback((next: GameState) => {
    const snap = toHud(next);
    hudRef.current = snap;
    setHud(snap);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readBestLapMs(layout.trackId).then((best) => {
      if (cancelled) return;
      savedBestRef.current = best;
      stateRef.current = { ...stateRef.current, bestLapMs: best };
      publishHud(stateRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, [layout.trackId, publishHud]);

  useEffect(() => {
    if (hud.phase !== 'finished' || hud.sessionBestLapMs == null) return;
    void writeBestLapMs(layout.trackId, hud.sessionBestLapMs).then(() => {
      savedBestRef.current = stateRef.current.bestLapMs;
    });
  }, [hud.phase, hud.sessionBestLapMs, layout.trackId]);

  // Paint the first frame (and any resize) with the real rider pose
  useEffect(() => {
    const s = stateRef.current;
    roadRef.current?.draw(s.s, s.lateral, s.heading);
  }, [size.w, size.h]);

  const tick = useCallback(
    (ts: number) => {
      const last = lastTsRef.current ?? ts;
      lastTsRef.current = ts;
      const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
      const next = stepGame(
        stateRef.current,
        layoutRef.current,
        controlsRef.current,
        dt,
        Date.now()
      );
      stateRef.current = next;
      roadRef.current?.draw(next.s, next.lateral, next.heading);
      leanAnim.setValue(next.lean);

      const prev = hudRef.current;
      const changedNow =
        prev.phase !== next.phase || (prev.flash?.text ?? null) !== (next.flash?.text ?? null);
      if (changedNow || ts - hudAtRef.current >= HUD_INTERVAL_MS) {
        hudAtRef.current = ts;
        publishHud(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [leanAnim, publishHud]
  );

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
    leanAnim.setValue(next.lean);
    roadRef.current?.draw(next.s, next.lateral, next.heading);
    hudAtRef.current = 0;
    publishHud(next);
  }, [leanAnim, publishHud]);

  const onStop = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
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
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
        if (!cancelled) setOriented(true);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 700);
        });
        if (!cancelled) setForceSurface(true);
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
        cancelled = true;
        setOriented(false);
        setForceSurface(false);
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

  const flashDanger = hud.flash?.tone === 'danger';
  const flashCoach = hud.flash?.tone === 'coach';
  const landscape = Platform.OS === 'web' || forceSurface || size.w >= size.h;
  const surfaceReady = oriented && landscape && size.w >= 8 && size.h >= 8;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {surfaceReady ? (
        <TrackMemoryRoadView ref={roadRef} layout={layout} width={size.w} height={size.h} />
      ) : (
        <View style={styles.placeholder} />
      )}

      <TrackMemoryCockpit
        width={size.w || 320}
        height={size.h || 640}
        lean={leanAnim}
        speedMps={hud.speed}
        lap={Math.min(hud.lap, TOTAL_LAPS)}
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
            Lap {Math.min(hud.lap, TOTAL_LAPS)}/{TOTAL_LAPS} · {formatLapTime(hud.lapTimeMs)}
          </Text>
          <Text style={styles.hudBest}>Best {formatLapTime(hud.bestLapMs)}</Text>
        </View>

        <TrackMemoryMinimap layout={layout} s={hud.s} size={88} />
      </View>

      {hud.flash ? (
        <View style={styles.flashWrap} pointerEvents="none">
          <Text
            style={[
              styles.flashText,
              flashDanger && styles.flashDanger,
              flashCoach && styles.flashCoach,
            ]}
          >
            {hud.flash.text}
          </Text>
        </View>
      ) : null}

      {hud.phase === 'ready' ? (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerTitle}>Track Memory Game</Text>
        </View>
      ) : null}

      {hud.phase === 'finished' ? (
        <View style={styles.resultCard} pointerEvents="none">
          <Text style={styles.resultTitle}>Session complete</Text>
          {hud.lapTimesMs.map((t, i) => (
            <Text key={`lap-${i}`} style={styles.resultLine}>
              Lap {i + 1}: {formatLapTime(t)}
            </Text>
          ))}
          <Text style={styles.resultBest}>Best: {formatLapTime(hud.sessionBestLapMs)}</Text>
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
