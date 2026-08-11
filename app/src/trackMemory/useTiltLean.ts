import { useEffect, useRef, type MutableRefObject } from 'react';
import { Platform } from 'react-native';

const DEADZONE_DEG = 8;
const MAX_TILT_DEG = 35;

/**
 * Maps device roll to lean in [-1, 1] (negative = lean left).
 * Native: expo-sensors DeviceMotion. Web: deviceorientation gamma/beta.
 * Writes into a ref so the game loop can read without re-renders.
 */
export function useTiltLean(enabled: boolean, leanRef: MutableRefObject<number>) {
  const subRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!enabled) {
      leanRef.current = 0;
      return;
    }

    const mapRoll = (rollDeg: number) => {
      const abs = Math.abs(rollDeg);
      if (abs < DEADZONE_DEG) {
        leanRef.current = 0;
        return;
      }
      const signed = Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, rollDeg));
      const mag = (Math.abs(signed) - DEADZONE_DEG) / (MAX_TILT_DEG - DEADZONE_DEG);
      leanRef.current = Math.sign(signed) * Math.max(-1, Math.min(1, mag));
    };

    let cancelled = false;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onOrient = (e: DeviceOrientationEvent) => {
        // Landscape: gamma often maps to left/right tilt of the long edge.
        // Fall back to beta if gamma is null.
        const gamma = e.gamma;
        const beta = e.beta;
        let roll = 0;
        if (typeof gamma === 'number' && Number.isFinite(gamma)) {
          roll = gamma;
        } else if (typeof beta === 'number' && Number.isFinite(beta)) {
          roll = beta;
        }
        mapRoll(roll);
      };
      window.addEventListener('deviceorientation', onOrient, true);
      return () => {
        window.removeEventListener('deviceorientation', onOrient, true);
        leanRef.current = 0;
      };
    }

    void (async () => {
      try {
        const Sensors = await import('expo-sensors');
        const { DeviceMotion } = Sensors;
        DeviceMotion.setUpdateInterval(50);
        const sub = DeviceMotion.addListener((data) => {
          if (cancelled) return;
          // rotation.gamma (iOS) / similar — use accelerationIncludingGravity as fallback
          const gamma =
            data.rotation && typeof data.rotation.gamma === 'number'
              ? (data.rotation.gamma * 180) / Math.PI
              : 0;
          mapRoll(gamma);
        });
        subRef.current = sub;
      } catch {
        leanRef.current = 0;
      }
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      leanRef.current = 0;
    };
  }, [enabled, leanRef]);
}
