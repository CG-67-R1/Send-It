/**
 * Home hero rider badge — **single source of truth** for on-screen size.
 *
 * **Face hole lock:** `AvatarFaceEllipse` receives `badgeSize` and lays out the ellipse with
 * `layout` percentages × `badgeSize`, plus sub-pixel offsets scaled by
 * `badgeSize / HERO_AVATAR_BADGE_BASE_SIZE`. So changing **`HERO_AVATAR_BADGE_SCALE`** scales the
 * leathers art and the face hole **together**; no separate hole size constant.
 *
 * **`DEFAULT_FACE_HOLE_LAYOUT`** (presets) is expressed as fractions of the badge box; it does not
 * need to change when scale changes.
 *
 * **`FACE_IN_HOLE_SCALE`** / **`FACE_HOLE_OFFSET_*`** (AvatarFaceEllipse) are tuning relative to the
 * hole; they stay the same when only the badge scale changes.
 */
export const HERO_AVATAR_BADGE_BASE_SIZE = 160;

/** vs `HERO_AVATAR_BADGE_BASE_SIZE` — `1.21` = 21% larger than base (~10% larger than the prior 1.1×). */
export const HERO_AVATAR_BADGE_SCALE = 1.21;

export const HERO_AVATAR_BADGE_SIZE = Math.round(HERO_AVATAR_BADGE_BASE_SIZE * HERO_AVATAR_BADGE_SCALE);
