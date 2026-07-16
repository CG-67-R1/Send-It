import { HERO_AVATAR_BADGE_BASE_SIZE } from './heroBadgeSizing';
import type { FaceHoleLayout } from './presets';

/**
 * Locked hero hole placement: `DEFAULT_FACE_HOLE_LAYOUT` plus these offsets (tuned on device
 * at `HERO_AVATAR_BADGE_BASE_SIZE`). Offsets scale with `badgeSize / HERO_AVATAR_BADGE_BASE_SIZE`.
 */
export const FACE_HOLE_OFFSET_X_PX = -2.9;
export const FACE_HOLE_OFFSET_Y_PX = -3;

/** Extra hole width (scaled); left edge fixed, extends to the right. */
export const FACE_HOLE_EXTRA_WIDTH_RIGHT_PX = 2;

/** Extra hole height (scaled); bottom edge fixed, extends upward. */
export const FACE_HOLE_EXTRA_HEIGHT_TOP_PX = 1;

/** Zoom of face photo inside the hole (pivot: top-center). */
export const FACE_IN_HOLE_SCALE = 0.66;

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
  const maxBadge = Math.min(screenW - pad * 2, screenH * 0.55, 360);
  const badgeSize = Math.max(200, Math.floor(maxBadge));
  const badgeLeft = (screenW - badgeSize) / 2;
  // Bias badge upward so hole is in upper-mid frame (like the home hero)
  const badgeTop = Math.max(pad + 48, screenH * 0.18 - badgeSize * 0.12);
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

/** SVG transform string matching AvatarFaceEllipse face photo scale (pivot top-center). */
export function faceHoleSvgTransform(hole: FaceHoleGeometry): string {
  const { cx, top, faceScale } = hole;
  return `translate(${cx}, ${top}) scale(${faceScale}) translate(${-cx}, ${-top})`;
}
