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
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import {
  CAPTURE_PREVIEW_SCALE,
  captureCenterHoleCrop,
  computeCaptureCameraLayout,
  computeCaptureGuide,
} from '../avatar/faceHoleGeometry';
import { DEFAULT_FACE_HOLE_LAYOUT, type FaceHoleLayout } from '../avatar/presets';

/** Solid around the rider badge (matches app chrome). */
const MODAL_SCREEN_BG = '#0f172a';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * Called with a JPEG URI of exactly what was visible in the face hole (un-mirrored),
   * ready for AvatarFaceEllipse — callers should not open Align after camera capture.
   */
  onCapture: (uri: string) => void;
  /** Leathers PNG shown over the camera; face shows through the transparent hole. */
  avatarSource: ImageSourcePropType;
  layout?: FaceHoleLayout;
};

/**
 * True pixel size of a captured URI. On web, expo-camera often reports MediaTrackSettings
 * width/height which can disagree with the actual canvas/data-URI frame (esp. iOS Safari) —
 * cropping with those values shifts the face into a corner of the hole.
 */
function resolveCaptureSize(
  uri: string,
  reportedW: number,
  reportedH: number
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0 && h > 0) {
          resolve({ width: w, height: h });
          return;
        }
        resolve({ width: reportedW, height: reportedH });
      },
      () => resolve({ width: reportedW, height: reportedH })
    );
  });
}

/**
 * Front camera under the rider avatar. The PNG transparent hole is the only aim guide
 * (no separate math-ellipse mask). Camera is hole-centered; capture keeps the center
 * fraction shown through that hole.
 * See `../avatar/FACE_PHOTO.md` before changing crop, mirror, or camera layout.
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
  const { badgeSize, badgeLeft, badgeTop, left, top, ew, eh, cx, cy } = guide;
  const cam = computeCaptureCameraLayout({ cx, cy, ew, eh });
  const holeAspect = ew / Math.max(eh, 1);

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
      });
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'No image was returned from the camera. Try again.');
        return;
      }

      const reportedW = photo.width ?? 0;
      const reportedH = photo.height ?? 0;
      // Prefer decoded image size — web track settings are often wrong for crop math.
      const { width: iw, height: ih } = await resolveCaptureSize(photo.uri, reportedW, reportedH);
      let outputUri = photo.uri;

      try {
        const actions: ImageManipulator.Action[] = [];
        if (iw > 0 && ih > 0) {
          const crop = captureCenterHoleCrop(iw, ih, holeAspect, CAPTURE_PREVIEW_SCALE);
          actions.push({
            crop: {
              originX: crop.originX,
              originY: crop.originY,
              width: crop.width,
              height: crop.height,
            },
          });
        }
        // Native `mirror` bakes a mirrored JPEG — flip back to true left/right.
        // Web only CSS-mirrors the <video>; the captured canvas is already un-mirrored.
        if (Platform.OS !== 'web') {
          actions.push({ flip: ImageManipulator.FlipType.Horizontal });
        }
        if (actions.length > 0) {
          const manipulated = await ImageManipulator.manipulateAsync(photo.uri, actions, {
            compress: 0.88,
            format: ImageManipulator.SaveFormat.JPEG,
          });
          outputUri = manipulated.uri;
        }
      } catch (manipErr) {
        console.warn('[AvatarFaceCamera] crop/flip fallback', manipErr);
      }

      onCapture(outputUri);
      onClose();
    } catch (e) {
      console.warn('[AvatarFaceCamera]', e);
      Alert.alert('Capture failed', e instanceof Error ? e.message : 'Could not take photo. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, holeAspect, onCapture, onClose, ready]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={styles.root}>
        {permission?.granted ? (
          <>
            {/*
              Clip to the face-hole box; CameraView is larger (zoom-out) and centered so the
              PNG hole shows the center fraction — that same center fraction is what we save.
            */}
            <View
              style={{
                position: 'absolute',
                left,
                top,
                width: ew,
                height: eh,
                overflow: 'hidden',
              }}
            >
              <CameraView
                ref={cameraRef}
                style={{
                  position: 'absolute',
                  left: cam.camLeft - left,
                  top: cam.camTop - top,
                  width: cam.camWidth,
                  height: cam.camHeight,
                }}
                facing="front"
                mirror
                mode="picture"
                onCameraReady={() => setReady(true)}
              />
            </View>

            {/* Dim outside the rider badge only — PNG hole is the capture guide. */}
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
              </Defs>
              <Rect width={width} height={height} fill={MODAL_SCREEN_BG} mask={`url(#${maskDomId})`} />
            </Svg>

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
                Put your face in the hole on your rider, then capture.
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
