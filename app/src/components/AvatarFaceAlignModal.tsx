import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';
import { computeFaceHole } from '../avatar/faceHoleGeometry';
import type { FaceHoleLayout } from '../avatar/presets';

const MODAL_SCREEN_BG = '#0f172a';
const MIN_SCALE = 0.6;
const MAX_SCALE = 3.5;
const ZOOM_STEP = 0.12;

type Props = {
  visible: boolean;
  imageUri: string;
  avatarSource: ImageSourcePropType;
  layout: FaceHoleLayout;
  faceBehindAvatar: boolean;
  onConfirm: (uri: string) => void;
  onClose: () => void;
};

type NaturalSize = { width: number; height: number };

/**
 * After library pick: pan/zoom the photo under the leathers so the face sits in the hole,
 * then bake a hole-aspect crop for AvatarFaceEllipse. Camera capture crops in-camera and skips this.
 */
export function AvatarFaceAlignModal({
  visible,
  imageUri,
  avatarSource,
  layout,
  faceBehindAvatar,
  onConfirm,
  onClose,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);

  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const scaleRef = useRef(1);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const badgeSize = Math.min(300, Math.floor(Math.min(screenW - 48, screenH * 0.48)));
  const hole = useMemo(() => computeFaceHole(badgeSize, layout), [badgeSize, layout]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    setNatural(null);
    setPanX(0);
    setPanY(0);
    setScale(1);
    panXRef.current = 0;
    panYRef.current = 0;
    scaleRef.current = 1;
    Image.getSize(
      imageUri,
      (w, h) => setNatural({ width: w, height: h }),
      () => setNatural({ width: 1024, height: 1024 })
    );
  }, [visible, imageUri]);

  /** Cover the hole ellipse with the photo at scale=1 (centered on hole). */
  const baseCover = useMemo(() => {
    if (!natural) return { w: badgeSize, h: badgeSize };
    const target = Math.max(hole.ew, hole.eh) * 1.35;
    const aspect = natural.width / Math.max(natural.height, 1);
    if (aspect >= 1) {
      return { w: target * aspect, h: target };
    }
    return { w: target, h: target / aspect };
  }, [natural, hole.ew, hole.eh, badgeSize]);

  const displayW = baseCover.w * scale;
  const displayH = baseCover.h * scale;
  const imgLeft = hole.cx - displayW / 2 + panX;
  const imgTop = hole.cy - displayH / 2 + panY;

  useEffect(() => {
    panXRef.current = panX;
    panYRef.current = panY;
  }, [panX, panY]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = {
            x: 0,
            y: 0,
            panX: panXRef.current,
            panY: panYRef.current,
          };
        },
        onPanResponderMove: (_evt, gesture) => {
          setPanX(dragStart.current.panX + gesture.dx);
          setPanY(dragStart.current.panY + gesture.dy);
        },
      }),
    []
  );

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta));
      scaleRef.current = next;
      return next;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!natural || busy) return;
    setBusy(true);
    try {
      const s = scaleRef.current;
      const px = panXRef.current;
      const py = panYRef.current;
      const dw = baseCover.w * s;
      const dh = baseCover.h * s;
      const left = hole.cx - dw / 2 + px;
      const top = hole.cy - dh / 2 + py;

      // Map hole bounding box → source image pixels (same aspect as the face hole).
      const sx0 = ((hole.left - left) / dw) * natural.width;
      const sy0 = ((hole.top - top) / dh) * natural.height;
      const sx1 = ((hole.left + hole.ew - left) / dw) * natural.width;
      const sy1 = ((hole.top + hole.eh - top) / dh) * natural.height;

      let originX = Math.min(sx0, sx1);
      let originY = Math.min(sy0, sy1);
      let cropW = Math.abs(sx1 - sx0);
      let cropH = Math.abs(sy1 - sy0);

      // Clamp to image bounds while preserving hole aspect.
      if (originX < 0) {
        cropW += originX;
        originX = 0;
      }
      if (originY < 0) {
        cropH += originY;
        originY = 0;
      }
      cropW = Math.min(cropW, natural.width - originX);
      cropH = Math.min(cropH, natural.height - originY);
      const finalW = Math.max(1, Math.floor(cropW));
      const finalH = Math.max(1, Math.floor(cropH));

      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.floor(originX),
              originY: Math.floor(originY),
              width: finalW,
              height: finalH,
            },
          },
        ],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
      );
      onConfirm(manipulated.uri);
      onClose();
    } catch (e) {
      console.warn('[AvatarFaceAlign]', e);
      Alert.alert('Could not crop', e instanceof Error ? e.message : 'Try again with another photo.');
    } finally {
      setBusy(false);
    }
  }, [natural, busy, baseCover.w, baseCover.h, hole, imageUri, onConfirm, onClose]);

  const maskId = 'align-face-mask';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <Text style={[styles.title, { marginTop: 20 + insets.top }]}>Align your face</Text>
        <Text style={styles.hint}>Drag to move · Zoom to fit your face in the hole on your rider.</Text>

        <View style={styles.previewWrap} {...panResponder.panHandlers}>
          <View style={{ width: badgeSize, height: badgeSize }}>
            {faceBehindAvatar ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    position: 'absolute',
                    left: imgLeft,
                    top: imgTop,
                    width: displayW,
                    height: displayH,
                  }}
                  resizeMode="cover"
                />
                <Image
                  source={avatarSource}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                />
              </>
            ) : (
              <>
                <Image
                  source={avatarSource}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                />
                <Svg width={badgeSize} height={badgeSize} style={StyleSheet.absoluteFillObject}>
                  <Defs>
                    <Mask id={maskId}>
                      <Rect width={badgeSize} height={badgeSize} fill="#000" />
                      <Ellipse cx={hole.cx} cy={hole.cy} rx={hole.rx} ry={hole.ry} fill="#fff" />
                    </Mask>
                  </Defs>
                  {/* Masked face via overlay approach: draw face then mask with hole — RN SVG Image masking is limited; use clip via hole-only image layer */}
                </Svg>
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { overflow: 'hidden' },
                  ]}
                  pointerEvents="none"
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      position: 'absolute',
                      left: imgLeft,
                      top: imgTop,
                      width: displayW,
                      height: displayH,
                    }}
                    resizeMode="cover"
                  />
                </View>
              </>
            )}
            {/* Guide stroke */}
            <Svg
              width={badgeSize}
              height={badgeSize}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            >
              <Ellipse
                cx={hole.cx}
                cy={hole.cy}
                rx={hole.rx}
                ry={hole.ry}
                fill="none"
                stroke="rgba(245,158,11,0.85)"
                strokeWidth={2}
              />
            </Svg>
          </View>
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(-ZOOM_STEP)} disabled={busy}>
            <Text style={styles.zoomBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.zoomLabel}>{Math.round(scale * 100)}%</Text>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(ZOOM_STEP)} disabled={busy}>
            <Text style={styles.zoomBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.controls, { paddingBottom: 16 + insets.bottom }]}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, (!natural || busy) && styles.primaryBtnDisabled]}
            onPress={handleConfirm}
            disabled={!natural || busy}
          >
            {busy ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.primaryBtnText}>Use photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MODAL_SCREEN_BG,
    alignItems: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
    lineHeight: 20,
  },
  previewWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  zoomBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  zoomBtnText: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 32,
  },
  zoomLabel: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'center',
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
    backgroundColor: MODAL_SCREEN_BG,
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
});
