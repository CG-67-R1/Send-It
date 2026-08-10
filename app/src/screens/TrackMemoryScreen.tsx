import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDefaultTrackMemoryLayout } from '../trackMemory/layouts';
import {
  createInitialState,
  kmhFromSpeed,
  resetGame,
  stepGame,
  TOTAL_LAPS,
} from '../trackMemory/physics';
import type { ControlState, GameState } from '../trackMemory/types';
import { formatLapTime, readBestLapMs, writeBestLapMs } from '../trackMemory/storage';
import { TrackMemoryRoad } from '../trackMemory/TrackMemoryRoad';
import { TrackMemoryMinimap } from '../trackMemory/TrackMemoryMinimap';
import { TrackMemoryCockpit } from '../trackMemory/TrackMemoryCockpit';
import { TrackMemoryControls } from '../trackMemory/TrackMemoryControls';

const layout = getDefaultTrackMemoryLayout();

const EMPTY_CONTROLS: ControlState = {
  left: false,
  right: false,
  accel: false,
  brake: false,
};

export function TrackMemoryScreen() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [state, setState] = useState<GameState>(() => createInitialState(null));
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
  }, []);

  // Persist when session finishes with a new best
  useEffect(() => {
    if (state.phase !== 'finished' || state.sessionBestLapMs == null) return;
    void writeBestLapMs(layout.trackId, state.sessionBestLapMs).then(() => {
      savedBestRef.current = state.bestLapMs;
    });
  }, [state.phase, state.sessionBestLapMs, state.bestLapMs]);

  const tick = useCallback((ts: number) => {
    const last = lastTsRef.current ?? ts;
    lastTsRef.current = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    const next = stepGame(stateRef.current, layout, controlsRef.current, dt, Date.now());
    stateRef.current = next;
    setState(next);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useFocusEffect(
    useCallback(() => {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTsRef.current = null;
        controlsRef.current = { ...EMPTY_CONTROLS };
      };
    }, [tick])
  );

  const onHold = useCallback((key: keyof ControlState, down: boolean) => {
    controlsRef.current = { ...controlsRef.current, [key]: down };
  }, []);

  const onReset = useCallback(() => {
    controlsRef.current = { ...EMPTY_CONTROLS };
    const next = resetGame(savedBestRef.current ?? stateRef.current.bestLapMs);
    stateRef.current = next;
    setState(next);
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.floor(width), h: Math.floor(height) });
  };

  const flashVisible = Boolean(state.flash);

  return (
    <View style={styles.root} onLayout={onLayout}>
      {size.w > 0 && size.h > 0 ? (
        <TrackMemoryRoad
          layout={layout}
          s={state.s}
          lateral={state.lateral}
          lean={state.lean}
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

      <View style={styles.hudTop} pointerEvents="box-none">
        <View style={styles.hudLeft}>
          <Text style={styles.hudLabel}>{layout.name}</Text>
          <Text style={styles.hudMeta}>
            Lap {Math.min(state.lap, TOTAL_LAPS)}/{TOTAL_LAPS}
          </Text>
          <Text style={styles.hudMeta}>Time {formatLapTime(state.lapTimeMs)}</Text>
          <Text style={styles.hudMeta}>Best {formatLapTime(state.bestLapMs)}</Text>
          <Text style={styles.hudSpeed}>{kmhFromSpeed(state.speed)} km/h</Text>
        </View>
        <TrackMemoryMinimap layout={layout} s={state.s} />
      </View>

      {flashVisible && state.flash ? (
        <View style={styles.flashWrap} pointerEvents="none">
          <Text style={styles.flashText}>{state.flash.text}</Text>
        </View>
      ) : null}

      {state.phase === 'ready' ? (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerTitle}>Track Memory</Text>
          <Text style={styles.bannerBody}>Hold Accel to start · 3 laps · memorise the turns</Text>
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
          <Text style={styles.resultHint}>Tap Reset to ride again</Text>
        </View>
      ) : null}

      <TrackMemoryControls onHold={onHold} onReset={onReset} />
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
  hudTop: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hudLeft: {
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '55%',
  },
  hudLabel: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  hudMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  hudSpeed: {
    marginTop: 4,
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  flashWrap: {
    position: 'absolute',
    top: '18%',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  flashText: {
    color: '#fef08a',
    fontSize: 22,
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
  banner: {
    position: 'absolute',
    top: '40%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  bannerBody: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center',
  },
  resultCard: {
    position: 'absolute',
    top: '28%',
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
