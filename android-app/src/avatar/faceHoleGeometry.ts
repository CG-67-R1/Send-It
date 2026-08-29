/**
 * Face-hole geometry + capture crop helpers.
 * Invariants / regression notes: ./FACE_PHOTO.md
 */
import { HERO_AVATAR_BADGE_BASE_SIZE } from './heroBadgeSizing';
import { AVATAR_ART_HEIGHT, AVATAR_ART_WIDTH, type FaceHoleLayout } from './presets';

/**
 * Sub-pixel offsets (in px at HERO_AVATAR_BADGE_BASE_SIZE) applied on top of the layout
 * percentages. These are intentionally near-zero after the layout was corrected to the
 * actual artwork pixel measurements. Kept for fine-tuning per-device if needed.
 */
export const FACE_HOLE_OFFSET_X_PX = 0;
export const FACE_HOLE_OFFSET_Y_PX = 0;

/** Extra hole width (scaled); left edge fixed, extends to the right. */
export const FACE_HOLE_EXTRA_WIDTH_RIGHT_PX = 0;

/** Extra hole height (scaled); bottom edge fixed, extends upward. */
export const FACE_HOLE_EXTRA_HEIGHT_TOP_PX = 0;

/**
 * Zoom of face photo inside the hole (pivot: hole center).
 * 1.0 = fill the entire ellipse bounding box; < 1 shrinks the photo inside the hole.
 */
export const FACE_IN_HOLE_SCALE = 1.0;

/**
 * Preview zoom-out so an arm's-length face fits the hole.
 * CameraView is sized to (hole / scale) and centered on the hole; capture keeps the
 * center `scale` fraction of that photo (same region visible through the hole).
 */
export const CAPTURE_PREVIEW_SCALE = 0.42;

export type FaceHoleGeometry = {
  left: number;
  top: number;
  ew: number;
  eh: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  faceScale: number;
};

export type CaptureCameraLayout = {
  camLeft: number;
  camTop: number;
  camWidth: number;
  camHeight: number;
};

/**
 * Ellipse + face-photo placement inside a square badge of `badgeSize`.
 * `layout` is in **artwork** space; we map through the same `contain` fit used by
 * `<Image resizeMode="contain" />` so the math hole matches the PNG cut-out.
 */
export function computeFaceHole(badgeSize: number, layout: FaceHoleLayout): FaceHoleGeometry {
  const scale = Math.min(badgeSize / AVATAR_ART_WIDTH, badgeSize / AVATAR_ART_HEIGHT);
  const drawnW = AVATAR_ART_WIDTH * scale;
  const drawnH = AVATAR_ART_HEIGHT * scale;
  const originX = (badgeSize - drawnW) / 2;
  const originY = (badgeSize - drawnH) / 2;
  const offsetScale = badgeSize / HERO_AVATAR_BADGE_BASE_SIZE;

  const left = originX + layout.leftPct * drawnW + FACE_HOLE_OFFSET_X_PX * offsetScale;
  const top =
    originY +
    layout.topPct * drawnH +
    FACE_HOLE_OFFSET_Y_PX * offsetScale -
    FACE_HOLE_EXTRA_HEIGHT_TOP_PX * offsetScale;
  const ew = layout.widthPct * drawnW + FACE_HOLE_EXTRA_WIDTH_RIGHT_PX * offsetScale;
  const eh = layout.heightPct * drawnH + FACE_HOLE_EXTRA_HEIGHT_TOP_PX * offsetScale;
  const cx = left + ew / 2;
  const cy = top + eh / 2;
  const rx = ew / 2;
  const ry = eh / 2;
  return { left, top, ew, eh, cx, cy, rx, ry, faceScale: FACE_IN_HOLE_SCALE };
}

/**
 * Full-screen camera guide: place a virtual badge on screen so the hole sits in the upper
 * half (matching hero layout), scaled to a comfortable framing oval.
 */
export function computeCaptureGuide(
  screenW: number,
  screenH: number,
  layout: FaceHoleLayout
): FaceHoleGeometry & { badgeSize: number; badgeLeft: number; badgeTop: number } {
  const pad = 24;
  const maxBadge = Math.min(screenW - pad * 2, screenH * 0.62);
  const badgeSize = Math.max(240, Math.floor(maxBadge));
  const badgeLeft = (screenW - badgeSize) / 2;
  const badgeTop = Math.max(pad + 48, screenH * 0.16 - badgeSize * 0.08);
  const hole = computeFaceHole(badgeSize, layout);
  return {
    ...hole,
    left: hole.left + badgeLeft,
    top: hole.top + badgeTop,
    cx: hole.cx + badgeLeft,
    cy: hole.cy + badgeTop,
    badgeSize,
    badgeLeft,
    badgeTop,
  };
}

/**
 * CameraView larger than the hole and centered on it. The hole shows the center
 * `previewScale` fraction of this view (zoom-out for arm's-length framing).
 */
export function computeCaptureCameraLayout(
  hole: Pick<FaceHoleGeometry, 'cx' | 'cy' | 'ew' | 'eh'>,
  previewScale: number = CAPTURE_PREVIEW_SCALE
): CaptureCameraLayout {
  const scale = Math.max(0.05, Math.min(1, previewScale));
  const camWidth = hole.ew / scale;
  const camHeight = hole.eh / scale;
  return {
    camWidth,
    camHeight,
    camLeft: hole.cx - camWidth / 2,
    camTop: hole.cy - camHeight / 2,
  };
}

/**
 * Crop the face-hole region from a captured camera frame.
 *
 * Assumes the preview shows the frame with object-fit:cover inside CameraView (camW×camH),
 * and the hole (holeW×holeH) is centered in that view — matching expo-camera web (`objectFit:
 * 'cover'`) and typical native preview fill.
 *
 * Critical: on web, takePicture draws the *entire* `<video>` frame, not the CSS-clipped
 * preview. Center-fraction crops of that frame do not match the hole. This mapping does.
 */
export function captureHoleFromCoverPreview(
  imageW: number,
  imageH: number,
  camW: number,
  camH: number,
  holeW: number,
  holeH: number
): { originX: number; originY: number; width: number; height: number } {
  const coverScale = Math.max(camW / Math.max(imageW, 1), camH / Math.max(imageH, 1));
  const dispW = imageW * coverScale;
  const dispH = imageH * coverScale;
  const offX = (camW - dispW) / 2;
  const offY = (camH - dispH) / 2;
  const holeLeft = (camW - holeW) / 2;
  const holeTop = (camH - holeH) / 2;

  const map = (screenX: number, screenY: number) => ({
    x: (screenX - offX) / coverScale,
    y: (screenY - offY) / coverScale,
  });

  const topLeft = map(holeLeft, holeTop);
  const bottomRight = map(holeLeft + holeW, holeTop + holeH);
  let minX = Math.min(topLeft.x, bottomRight.x);
  let minY = Math.min(topLeft.y, bottomRight.y);
  let maxX = Math.max(topLeft.x, bottomRight.x);
  let maxY = Math.max(topLeft.y, bottomRight.y);

  minX = Math.max(0, Math.min(imageW, minX));
  minY = Math.max(0, Math.min(imageH, minY));
  maxX = Math.max(0, Math.min(imageW, maxX));
  maxY = Math.max(0, Math.min(imageH, maxY));

  const originX = Math.floor(minX);
  const originY = Math.floor(minY);
  const width = Math.max(1, Math.min(Math.floor(maxX - minX), imageW - originX));
  const height = Math.max(1, Math.min(Math.floor(maxY - minY), imageH - originY));
  return { originX, originY, width, height };
}

/**
 * @deprecated Prefer `captureHoleFromCoverPreview` — center-fraction crops assume the
 * JPEG equals the CameraView contents, which is false on web (full video frame).
 */
export function captureCenterHoleCrop(
  imageW: number,
  imageH: number,
  holeAspect: number,
  previewScale: number = CAPTURE_PREVIEW_SCALE
): { originX: number; originY: number; width: number; height: number } {
  const scale = Math.max(0.05, Math.min(1, previewScale));
  const aspect = Math.max(0.05, holeAspect);

  let minX = 0;
  let minY = 0;
  let cropWidth = imageW;
  let cropHeight = imageH;
  const imgAspect = imageW / Math.max(imageH, 1);
  if (imgAspect > aspect) {
    cropWidth = Math.max(1, Math.floor(imageH * aspect));
    minX = Math.max(0, Math.floor((imageW - cropWidth) / 2));
  } else if (imgAspect < aspect) {
    cropHeight = Math.max(1, Math.floor(imageW / aspect));
    minY = Math.max(0, Math.floor((imageH - cropHeight) / 2));
  }

  const width = Math.max(1, Math.floor(cropWidth * scale));
  const height = Math.max(1, Math.floor(cropHeight * scale));
  return {
    originX: minX + Math.max(0, Math.floor((cropWidth - width) / 2)),
    originY: minY + Math.max(0, Math.floor((cropHeight - height) / 2)),
    width: Math.min(width, imageW - minX),
    height: Math.min(height, imageH - minY),
  };
}

/** SVG transform string scaling the face photo around the hole center. */
export function faceHoleSvgTransform(hole: FaceHoleGeometry): string {
  const { cx, cy, faceScale } = hole;
  return `translate(${cx}, ${cy}) scale(${faceScale}) translate(${-cx}, ${-cy})`;
}
