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

/** SVG transform string scaling the face photo around the hole center. */
export function faceHoleSvgTransform(hole: FaceHoleGeometry): string {
  const { cx, cy, faceScale } = hole;
  return `translate(${cx}, ${cy}) scale(${faceScale}) translate(${-cx}, ${-cy})`;
}
