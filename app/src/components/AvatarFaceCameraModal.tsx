import React, { useCallback, useId, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, G, Mask, Rect, ClipPath } from 'react-native-svg';
import { computeCaptureGuide } from '../avatar/faceHoleGeometry';
import { DEFAULT_FACE_HOLE_LAYOUT, type FaceHoleLayout } from '../avatar/presets';

/** Solid around the rider badge (matches app chrome). */
const MODAL_SCREEN_BG = '#0f172a';

/** Mild center square crop so Align modal gets a face-forward starting point (not guide-mapped). */
const CAPTURE_CENTER_CROP_FRAC = 0.92;

const FACE_GUIDE_DOT_R = 4;
const EYE_GUIDE_Y_FRAC = 0.14;
const EYE_GUIDE_DX_FRAC = 0.47;
const EYE_GUIDE_OFFSET_X_FRAC = -0.02;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with a JPEG URI — callers open AvatarFaceAlignModal next (same as library). */
  onCapture: (uri: string) => void;
  /** Leathers PNG shown over the camera; face shows through the transparent hole. */
  avatarSource: ImageSourcePropType;
  layout?: FaceHoleLayout;
};

/**
 * Front camera with the rider avatar overlaid so the user puts their face in the real hole.
 * Capture does a mild center square crop only; fine alignment uses AvatarFaceAlignModal.
 */
export function AvatarFaceCameraModal({
  visible,
  onClose,
  onCapture,
  avatarSource,
  layout = DEFAULT_FACE_HOLE_LAYOUT,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const maskDomId = useId().replace(/:/g, '');

  const guide = computeCaptureGuide(width, height, layout);
  const { cx, cy, rx, ry, badgeSize, badgeLeft, badgeTop } = guide;

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

      // Mild center square only — do NOT map the on-screen hole to photo pixels
      // (CameraView cover/mirror makes that mapping unreliable). Align modal does the rest.
      if (iw > 0 && ih > 0) {
        const minDim = Math.min(iw, ih);
        const side = Math.min(
          Math.max(1, Math.floor(minDim * CAPTURE_CENTER_CROP_FRAC)),
          minDim
        );
        const originX = Math.max(0, Math.floor((iw - side) / 2));
        const originY = Math.max(0, Math.floor((ih - side) / 2));
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ crop: { originX, originY, width: side, height: side } }],
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
  }, [busy, onCapture, onClose, ready]);

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

            {/* Dim outside the rider badge */}
            <Svg
              width={width}
              height={height}
              style={[StyleSheet.absoluteFill, styles.overlaySvg]}
              pointerEvents="none"
            >
              <Defs>
                <Mask id={maskDomId}>
                  <Rect width={width} height={height} fill="#ffffff" />
                  <Rect
                    x={badgeLeft}
                    y={badgeTop}
                    width={badgeSize}
                    height={badgeSize}
                    fill="#000000"
                  />
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
                strokeWidth={2.5}
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

            {/* Real leathers — camera shows through the transparent face hole */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: badgeLeft,
                top: badgeTop,
                width: badgeSize,
                height: badgeSize,
                zIndex: 2,
              }}
            >
              <Image
                source={avatarSource}
                style={{ width: badgeSize, height: badgeSize }}
                resizeMode="contain"
              />
            </View>

            <View style={styles.hintWrap} pointerEvents="none">
              <Text style={styles.hint}>
                Put your face in the hole on your rider. You can fine-tune alignment on the next screen.
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
    zIndex: 3,
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
