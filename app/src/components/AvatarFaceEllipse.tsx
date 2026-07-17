import React, { useId } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage } from 'react-native-svg';
import { computeFaceHole, faceHoleSvgTransform } from '../avatar/faceHoleGeometry';
import { photoDisplayUri } from '../storage/localPhotoStorage';
import type { FaceHoleLayout } from '../avatar/presets';

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
  const hole = computeFaceHole(badgeSize, layout);
  const { left, top, ew, eh, cx, cy, rx, ry } = hole;
  const faceTransform = faceHoleSvgTransform(hole);
  /** Cache-bust query (?rev=) or fragment (#rev=) must not be passed to SvgImage; remount via key when rev changes. */
  const faceFileUri = photoDisplayUri(faceUri);

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
          preserveAspectRatio="xMidYMid slice"
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
