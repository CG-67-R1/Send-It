import React, { useCallback, useId, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, G, Mask, Rect, ClipPath } from 'react-native-svg';
import { DEFAULT_FACE_HOLE_LAYOUT } from '../avatar/presets';

/**
 * Capture UI only (does not move the hero badge hole). Tunables:
 *
 * - CAPTURE_CENTER_CROP_FRAC — Center square side = min(w,h) × this (capped at min(w,h)). **Below 1**
 *   = tighter crop / slightly zoomed in on the middle — helps keep **ears out** of the saved file when
 *   the face is centered. **Above 1** still caps at full min side (no extra zoom-out). Try **0.02**
 *   steps; typical band **0.92–0.98** for face-only vs **1.0** for maximum field of view.
 *
 * - FALLBACK_GUIDE_RX_FRAC — Horizontal “radius” of the amber capture guide vs min(screen w,h), before
 *   HOLE_SIZE_MULTIPLIER. **Lower = smaller guide oval.** Try steps of **0.02**.
 *
 * - CAPTURE_GUIDE_RX_NARROW_FRAC — Scales the guide after the base rx/ry math. **Higher = bigger cutout.**
 *   Try steps of **0.05** if you change it. Smaller oval → users frame **full face inside** with **ears
 *   outside** the guide; pair with hint copy if needed.
 *
 * - maxRy / maxRx clamps (in component) — Cap guide size before multiplier. Adjust by **~0.02** on the
 *   height/width fractions (e.g. height * 0.42) if the guide hits the edge of the screen.
 *
 * - CAPTURE_GUIDE_RX_NARROW_FRAC — After layout, horizontal semi-axis only: **1 − 2×(inset per side)**.
 *   e.g. 0.96 = 2% narrower on the left and 2% on the right from center. Does not change ry.
 *
 * - FACE_GUIDE_VERTICAL_OFFSET_FRAC — Shifts the face-guide band **up** from ellipse center **cy**
 *   by this × **window height** (typ. 0.05). Affects eye dots.
 *
 * **Eye placement (vs `guideCy`, in units of oval `ry` / `rx`):**
 * - EYE_GUIDE_Y_FRAC — Eyes sit at `guideCy − EYE_GUIDE_Y_FRAC × ry`. **↑ value = eyes higher** in the oval.
 * - EYE_GUIDE_DX_FRAC — Half-distance between dot centers × **rx**; **↑ = wider** apart.
 * - EYE_GUIDE_OFFSET_X_FRAC — Nudge **both** dots left/right × **rx** (0 = centered on oval).
 */
const FALLBACK_GUIDE_RX_FRAC = 0.3;

/** Solid around the oval cutout (matches app chrome). */
const MODAL_SCREEN_BG = '#0f172a';

/** Tighter than full frame: slight zoom to crop side hair/ears; try 0.02 steps (↓ = more zoom). */
const CAPTURE_CENTER_CROP_FRAC = 0.84;

/** Horizontal only: 2% inset on each side from center → rx × 0.96. See block comment above. */
const CAPTURE_GUIDE_RX_NARROW_FRAC = 0.89;

/** Scales the capture guide ellipse after base rx/ry; see block comment above. */
const HOLE_SIZE_MULTIPLIER = 1.43;

/** Vertical shift for face placement guides (eye dots) vs screen/oval center. */
const FACE_GUIDE_VERTICAL_OFFSET_FRAC = 0.05;

const FACE_GUIDE_DOT_R = 4;

/** Eyes at guideCy − EYE_GUIDE_Y_FRAC × ry (↑ = higher in oval). See tunable block above. */
const EYE_GUIDE_Y_FRAC = 0.14;
/** Half-spacing between eye dot centers × rx (↑ = wider). */
const EYE_GUIDE_DX_FRAC = 0.47;
/** Nudge both eye dots horizontally × rx (+ = right). */
const EYE_GUIDE_OFFSET_X_FRAC = -0.02;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with a JPEG file URI (square crop, ready for elliptical clip on the hero). */
  onCapture: (uri: string) => void;
};

/**
 * Full-screen front camera with an oval guide: solid app-colored overlay with a transparent hole
 * showing the live feed, plus an amber stroke. Capture: center square crop for hero compositing.
 */
export function AvatarFaceCameraModal({ visible, onClose, onCapture }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const maskDomId = useId().replace(/:/g, '');

  const cx = width / 2;
  const cy = height / 2;
  const base = Math.min(width, height);
  /** Same oval *proportions* as the hero hole, scaled for full-screen framing. */
  const holeAspect = DEFAULT_FACE_HOLE_LAYOUT.heightPct / DEFAULT_FACE_HOLE_LAYOUT.widthPct;
  let rx = base * FALLBACK_GUIDE_RX_FRAC;
  let ry = rx * holeAspect;
  const maxRy = height * 0.42;
  if (ry > maxRy) {
    const s = maxRy / ry;
    ry *= s;
    rx *= s;
  }
  const maxRx = width * 0.44;
  if (rx > maxRx) {
    const s = maxRx / rx;
    rx *= s;
    ry *= s;
  }

  rx *= HOLE_SIZE_MULTIPLIER;
  ry *= HOLE_SIZE_MULTIPLIER;

  const padX = 12;
  const padY = 12;
  const maxRxFit = width / 2 - padX;
  const maxRyFit = height / 2 - padY;
  const fitS = Math.min(1, maxRxFit / Math.max(rx, 1), maxRyFit / Math.max(ry, 1));
  rx *= fitS;
  ry *= fitS;
  rx *= CAPTURE_GUIDE_RX_NARROW_FRAC;

  /** Face-guide anchor: above ellipse center — see FACE_GUIDE_VERTICAL_OFFSET_FRAC. */
  const guideCy = cy - height * FACE_GUIDE_VERTICAL_OFFSET_FRAC;
  const eyeY = guideCy - EYE_GUIDE_Y_FRAC * ry;
  const eyeDx = EYE_GUIDE_DX_FRAC * rx;
  const eyeCenterX = cx + EYE_GUIDE_OFFSET_X_FRAC * rx;
  const guideClipId = `${maskDomId}-guideclip`;

  React.useEffect(() => {
    if (!visible) return;
    setReady(false);
    if (!permission?.granted) {
      void requestPermission();
    }
  }, [visible, permission?.granted, requestPermission]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: Platform.OS === 'android',
      });
      if (!photo?.uri) return;

      const iw = photo.width;
      const ih = photo.height;
      const minDim = Math.min(iw, ih);
      const side = Math.min(
        Math.max(1, Math.floor(minDim * CAPTURE_CENTER_CROP_FRAC)),
        minDim
      );
      const originX = Math.max(0, Math.floor((iw - side) / 2));
      const originY = Math.max(0, Math.floor((ih - side) / 2));

      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: { originX, originY, width: side, height: side } }],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
      );
      onCapture(manipulated.uri);
      onClose();
    } catch (e) {
      Alert.alert(
        'Could not save photo',
        e instanceof Error ? e.message : 'Something went wrong capturing your photo.'
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onCapture, onClose, ready]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={styles.root}>
        {permission?.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              mirror
              mode="picture"
              onCameraReady={() => setReady(true)}
            />
            <Svg
              width={width}
              height={height}
              style={[StyleSheet.absoluteFill, styles.overlaySvg]}
              pointerEvents="none"
            >
              <Defs>
                <Mask id={maskDomId}>
                  <Rect width={width} height={height} fill="#ffffff" />
                  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000000" />
                </Mask>
                <ClipPath id={guideClipId}>
                  <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
                </ClipPath>
              </Defs>
              <Rect width={width} height={height} fill={MODAL_SCREEN_BG} mask={`url(#${maskDomId})`} />
              <Ellipse
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={3}
              />
              <G clipPath={`url(#${guideClipId})`}>
                <Circle
                  cx={eyeCenterX - eyeDx}
                  cy={eyeY}
                  r={FACE_GUIDE_DOT_R}
                  fill="rgba(255,255,255,0.88)"
                  stroke="#f59e0b"
                  strokeWidth={1.25}
                />
                <Circle
                  cx={eyeCenterX + eyeDx}
                  cy={eyeY}
                  r={FACE_GUIDE_DOT_R}
                  fill="rgba(255,255,255,0.88)"
                  stroke="#f59e0b"
                  strokeWidth={1.25}
                />
              </G>
            </Svg>

            <View style={styles.hintWrap} pointerEvents="none">
              <Text style={styles.hint}>
                Center your full face in the oval with your ears outside the guide — same shape as on your rider badge.
              </Text>
            </View>

            <View style={[styles.controls, { paddingBottom: 16 + insets.bottom, backgroundColor: MODAL_SCREEN_BG }]}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={busy}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, (!ready || busy) && styles.primaryBtnDisabled]}
                onPress={takePhoto}
                disabled={!ready || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.primaryBtnText}>Capture</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.permFallback}>
            <Text style={styles.permText}>Camera access is needed to take your rider photo.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
              <Text style={styles.primaryBtnText}>Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MODAL_SCREEN_BG,
  },
  overlaySvg: {
    zIndex: 1,
  },
  hintWrap: {
    position: 'absolute',
    top: 56,
    left: 24,
    right: 24,
    zIndex: 2,
  },
  hint: {
    color: '#e2e8f0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.35)',
  },
  primaryBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 17,
  },
  permFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  permText: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
});
