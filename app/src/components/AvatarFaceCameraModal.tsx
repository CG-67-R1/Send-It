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
import { computeCaptureGuide } from '../avatar/faceHoleGeometry';
import { DEFAULT_FACE_HOLE_LAYOUT } from '../avatar/presets';

/** Solid around the oval cutout (matches app chrome). */
const MODAL_SCREEN_BG = '#0f172a';

const FACE_GUIDE_DOT_R = 4;

/** Eyes at guideCy − EYE_GUIDE_Y_FRAC × ry (↑ = higher in oval). */
const EYE_GUIDE_Y_FRAC = 0.14;
/** Half-spacing between eye dot centers × rx (↑ = wider). */
const EYE_GUIDE_DX_FRAC = 0.47;
/** Nudge both eye dots horizontally × rx (+ = right). */
const EYE_GUIDE_OFFSET_X_FRAC = -0.02;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with a JPEG URI (guide-region crop) — callers should open the align modal next. */
  onCapture: (uri: string) => void;
};

/**
 * Full-screen front camera with an oval guide matching the hero face-hole geometry.
 * Capture crops to the guide’s bounding square; fine alignment happens in AvatarFaceAlignModal.
 */
export function AvatarFaceCameraModal({ visible, onClose, onCapture }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const maskDomId = useId().replace(/:/g, '');

  const guide = computeCaptureGuide(width, height, DEFAULT_FACE_HOLE_LAYOUT);
  const { cx, cy, rx, ry } = guide;

  const eyeY = cy - EYE_GUIDE_Y_FRAC * ry;
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
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'No image was returned from the camera. Try again.');
        return;
      }

      const iw = photo.width ?? 0;
      const ih = photo.height ?? 0;
      let outputUri = photo.uri;

      if (iw > 0 && ih > 0) {
        // Map on-screen guide ellipse bbox → photo pixels (cover-fit camera preview).
        const scale = Math.max(width / iw, height / ih);
        const dispW = iw * scale;
        const dispH = ih * scale;
        const offsetX = (width - dispW) / 2;
        const offsetY = (height - dispH) / 2;

        const holeLeft = cx - rx;
        const holeTop = cy - ry;
        const holeRight = cx + rx;
        const holeBottom = cy + ry;

        let sx0 = (holeLeft - offsetX) / scale;
        let sy0 = (holeTop - offsetY) / scale;
        let sx1 = (holeRight - offsetX) / scale;
        let sy1 = (holeBottom - offsetY) / scale;

        let cropW = Math.abs(sx1 - sx0);
        let cropH = Math.abs(sy1 - sy0);
        const side = Math.max(cropW, cropH);
        let originX = Math.min(sx0, sx1) - (side - cropW) / 2;
        let originY = Math.min(sy0, sy1) - (side - cropH) / 2;

        originX = Math.max(0, Math.min(iw - 1, originX));
        originY = Math.max(0, Math.min(ih - 1, originY));
        const maxSide = Math.min(iw - originX, ih - originY);
        const finalSide = Math.max(1, Math.floor(Math.min(side, maxSide)));

        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            photo.uri,
            [
              {
                crop: {
                  originX: Math.floor(originX),
                  originY: Math.floor(originY),
                  width: finalSide,
                  height: finalSide,
                },
              },
            ],
            { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
          );
          outputUri = manipulated.uri;
        } catch (manipErr) {
          console.warn('[AvatarFaceCamera] crop fallback', manipErr);
        }
      }

      onCapture(outputUri);
      onClose();
    } catch (e) {
      console.warn('[AvatarFaceCamera]', e);
      Alert.alert('Capture failed', e instanceof Error ? e.message : 'Could not take photo. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, onCapture, onClose, ready, width, height, cx, cy, rx, ry]);

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
                Center your face in the oval (same shape as on your rider). You can fine-tune alignment next.
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
