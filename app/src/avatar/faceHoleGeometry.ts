import { HERO_AVATAR_BADGE_BASE_SIZE } from './heroBadgeSizing';
import type { FaceHoleLayout } from './presets';

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
 * Zoom of face photo inside the hole (pivot: top-center).
 * 1.0 = fill the entire ellipse bounding box; < 1 shrinks the photo inside the hole.
 * Was 0.66 which made faces appear very small — corrected to 1.0.
 */
export const FACE_IN_HOLE_SCALE = 1.0;

/**
 * Shrink the live camera feed around the face-hole pivot so an arm's-length selfie
 * fits the oval. 1 = full-screen cover (face much larger than the hole); ~0.4 matches
 * a typical head width to the artwork hole.
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

/** Ellipse + face-photo placement inside a square badge of `badgeSize`. */
export function computeFaceHole(badgeSize: number, layout: FaceHoleLayout): FaceHoleGeometry {
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
  // Prefer a large on-screen badge so the hole is easy to aim at (no 360px cap).
  const maxBadge = Math.min(screenW - pad * 2, screenH * 0.62);
  const badgeSize = Math.max(240, Math.floor(maxBadge));
  const badgeLeft = (screenW - badgeSize) / 2;
  // Bias badge upward so hole is in upper-mid frame (like the home hero)
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

/** Map a point in the CameraView layout (cover-fit) to source image pixels. */
export function mapCoverPointToImage(
  viewX: number,
  viewY: number,
  viewW: number,
  viewH: number,
  imageW: number,
  imageH: number
): { x: number; y: number } {
  const scale = Math.max(viewW / Math.max(imageW, 1), viewH / Math.max(imageH, 1));
  const dispW = imageW * scale;
  const dispH = imageH * scale;
  const offX = (viewW - dispW) / 2;
  const offY = (viewH - dispH) / 2;
  return {
    x: (viewX - offX) / scale,
    y: (viewY - offY) / scale,
  };
}

/**
 * Square crop in image pixels for the on-screen face hole, accounting for the live
 * preview scale around the hole center (see CAPTURE_PREVIEW_SCALE).
 */
export function captureHoleImageCrop(
  screenW: number,
  screenH: number,
  imageW: number,
  imageH: number,
  hole: Pick<FaceHoleGeometry, 'left' | 'top' | 'ew' | 'eh' | 'cx' | 'cy'>,
  previewScale: number = CAPTURE_PREVIEW_SCALE
): { originX: number; originY: number; width: number; height: number } {
  const scale = Math.max(0.05, previewScale);
  const mapScreen = (sx: number, sy: number) => {
    const viewX = hole.cx + (sx - hole.cx) / scale;
    const viewY = hole.cy + (sy - hole.cy) / scale;
    return mapCoverPointToImage(viewX, viewY, screenW, screenH, imageW, imageH);
  };

  const tl = mapScreen(hole.left, hole.top);
  const br = mapScreen(hole.left + hole.ew, hole.top + hole.eh);
  let x0 = Math.min(tl.x, br.x);
  let y0 = Math.min(tl.y, br.y);
  let x1 = Math.max(tl.x, br.x);
  let y1 = Math.max(tl.y, br.y);

  let cropW = x1 - x0;
  let cropH = y1 - y0;
  const side = Math.max(cropW, cropH);
  let originX = x0 - (side - cropW) / 2;
  let originY = y0 - (side - cropH) / 2;

  originX = Math.max(0, Math.min(imageW - 1, originX));
  originY = Math.max(0, Math.min(imageH - 1, originY));
  const maxSide = Math.min(imageW - originX, imageH - originY);
  const finalSide = Math.max(1, Math.floor(Math.min(side, maxSide)));

  return {
    originX: Math.floor(originX),
    originY: Math.floor(originY),
    width: finalSide,
    height: finalSide,
  };
}

/** SVG transform string scaling the face photo around the hole center. */
export function faceHoleSvgTransform(hole: FaceHoleGeometry): string {
  const { cx, cy, faceScale } = hole;
  return `translate(${cx}, ${cy}) scale(${faceScale}) translate(${-cx}, ${-cy})`;
}
