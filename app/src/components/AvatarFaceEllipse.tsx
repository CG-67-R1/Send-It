import React, { useId } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage } from 'react-native-svg';
import { HERO_AVATAR_BADGE_BASE_SIZE } from '../avatar/heroBadgeSizing';
import type { FaceHoleLayout } from '../avatar/presets';

/**
 * Locked hero hole placement: `DEFAULT_FACE_HOLE_LAYOUT` in presets plus these offsets (tuned on device
 * at `HERO_AVATAR_BADGE_BASE_SIZE`, shared with `heroBadgeSizing.ts`). Offsets scale with
 * `badgeSize / HERO_AVATAR_BADGE_BASE_SIZE` so the hole tracks the avatar when the home badge scales.
 */
const FACE_HOLE_OFFSET_X_PX = -2.9;
const FACE_HOLE_OFFSET_Y_PX = -3;

/** Extra hole width (scaled); left edge fixed, extends to the right. */
const FACE_HOLE_EXTRA_WIDTH_RIGHT_PX = 2;

/** Extra hole height (scaled); bottom edge fixed, extends upward. */
const FACE_HOLE_EXTRA_HEIGHT_TOP_PX = 1;

/** Zoom of face photo inside the hole (pivot: top-center). */
const FACE_IN_HOLE_SCALE = 0.66;

type Props = {
  badgeSize: number;
  avatarSource: ImageSourcePropType;
  faceUri: string;
  layout: FaceHoleLayout;
  /**
   * When true: face is drawn first, avatar on top — the PNG must have a transparent hole
   * (alpha) where the face should show. When false: avatar first, face on top (covers a solid
   * white “hole” in the art).
   */
  faceBehindAvatar: boolean;
};

/**
 * Face photo clipped to an ellipse matching the leathers hole, inside the badge box.
 * Avatar uses `contain` in the same box so layout percentages align with the badge.
 */
export function AvatarFaceEllipse({
  badgeSize,
  avatarSource,
  faceUri,
  layout,
  faceBehindAvatar,
}: Props) {
  const clipId = useId().replace(/:/g, '');
  const W = badgeSize;
  const H = badgeSize;
  const offsetScale = badgeSize / HERO_AVATAR_BADGE_BASE_SIZE;
  const left = layout.leftPct * W + FACE_HOLE_OFFSET_X_PX * offsetScale;
  const top =
    layout.topPct * H +
    FACE_HOLE_OFFSET_Y_PX * offsetScale -
    FACE_HOLE_EXTRA_HEIGHT_TOP_PX * offsetScale;
  const ew = layout.widthPct * W + FACE_HOLE_EXTRA_WIDTH_RIGHT_PX * offsetScale;
  const eh = layout.heightPct * H + FACE_HOLE_EXTRA_HEIGHT_TOP_PX * offsetScale;
  const cx = left + ew / 2;
  const cy = top + eh / 2;
  const rx = ew / 2;
  const ry = eh / 2;

  /**
   * Map the square face photo into the **hole bounding rect**, clip to the ellipse, then scale
   * down so the face isn’t oversized. Pivot at top-center `(cx, top)` so the **top of the photo**
   * stays aligned with the top of the hole (helmet / cap line in the art).
   */
  const faceScale = FACE_IN_HOLE_SCALE;
  const faceTransform = `translate(${cx}, ${top}) scale(${faceScale}) translate(${-cx}, ${-top})`;
  /** Cache-bust query (?rev=) must not be passed to SvgImage; remount via key when rev changes. */
  const faceFileUri = faceUri.split('?')[0];

  const faceSvg = (
    <Svg width={W} height={H} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Defs>
        <ClipPath id={clipId}>
          <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`} transform={faceTransform}>
        <SvgImage
          href={{ uri: faceFileUri }}
          x={left}
          y={top}
          width={ew}
          height={eh}
          preserveAspectRatio="xMidYMin slice"
        />
      </G>
    </Svg>
  );

  const avatarImage = (
    <Image source={avatarSource} style={styles.avatarBadgeImage} resizeMode="contain" />
  );

  return (
    <View style={{ width: W, height: H, position: 'relative' }}>
      {faceBehindAvatar ? (
        <>
          {faceSvg}
          {avatarImage}
        </>
      ) : (
        <>
          {avatarImage}
          {faceSvg}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBadgeImage: {
    width: '100%',
    height: '100%',
  },
});
