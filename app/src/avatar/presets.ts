import type { ImageSourcePropType } from 'react-native';

export interface AvatarPreset {
  id: string;
  label: string;
  /** When true, this art is a "face hole" frame — user photo can be composited later. */
  hasFaceHole: boolean;
  /**
   * When true, the face photo is drawn *under* the avatar PNG. The PNG must have a **transparent**
   * hole (alpha) where the face shows through. When false/undefined, the face is drawn *on top*
   * (covers a solid white hole in the art).
   */
  compositeFaceBehindAvatar?: boolean;
  source: ImageSourcePropType;
}

/**
 * User-selectable avatars (onboarding / profile / home hero).
 * Not listed here: `the_goat.png` — reserved for gamified moments only (see QAScreen trivia).
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  // Face-hole / leathers (upload-your-face planned)
  {
    id: 'black_no_face',
    label: 'Black leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    source: require('../../avatar/black_no_face.png'),
  },
  {
    id: 'blue_no_face',
    label: 'Blue leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    source: require('../../avatar/blue_no_face.png'),
  },
  {
    id: 'pink_no_face',
    label: 'Pink leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    source: require('../../avatar/pink_no_face.png'),
  },
  {
    id: 'red_no_face',
    label: 'Red leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    source: require('../../avatar/red_no_face.png'),
  },
  {
    id: 'yellow_no_face',
    label: 'Yellow leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    source: require('../../avatar/yellow_no_face.png'),
  },
  {
    id: 'orange_no_face',
    label: 'Orange leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    source: require('../../avatar/orange_no_face.png'),
  },
  {
    id: 'purple_no_face',
    label: 'Purple leathers',
    hasFaceHole: true,
    compositeFaceBehindAvatar: true,
    // Filename uses a dot before _no_face
    source: require('../../avatar/purple._no_face.png'),
  },
  // Full characters / mascots
  {
    id: 'devil',
    label: 'Devil',
    hasFaceHole: false,
    source: require('../../avatar/devil.png'),
  },
  {
    id: '8ball',
    label: '8 ball',
    hasFaceHole: false,
    source: require('../../avatar/8ball.png'),
  },
  {
    id: 'donkey',
    label: 'Donkey',
    hasFaceHole: false,
    source: require('../../avatar/donkey.png'),
  },
  {
    id: 'flip',
    label: 'Flip',
    hasFaceHole: false,
    source: require('../../avatar/flip.png'),
  },
  {
    id: 'goat',
    label: 'Goat',
    hasFaceHole: false,
    source: require('../../avatar/goat.png'),
  },
];

export function getAvatarSource(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  const preset = AVATAR_PRESETS.find((p) => p.id === id);
  return preset ? preset.source : null;
}

export function getAvatarPreset(id: string | null | undefined): AvatarPreset | undefined {
  if (!id) return undefined;
  return AVATAR_PRESETS.find((p) => p.id === id);
}

/** Mascots / full characters that do not need a user face photo. */
export function getNoPhotoAvatarPresets(): AvatarPreset[] {
  return AVATAR_PRESETS.filter((p) => !p.hasFaceHole);
}

/** Assign a random mascot when the user skips avatar selection during onboarding. */
export function pickRandomNoPhotoAvatar(): string {
  const pool = getNoPhotoAvatarPresets();
  if (pool.length === 0) return AVATAR_PRESETS[0]?.id ?? 'devil';
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/** Intrinsic pixel size of leathers face-hole PNGs (`*_no_face.png`). */
export const AVATAR_ART_WIDTH = 1024;
export const AVATAR_ART_HEIGHT = 1536;

/**
 * Face hole as fractions of the **artwork bitmap** (not the letterboxed square badge).
 * `computeFaceHole` maps these through Image `contain` into badge coordinates.
 */
export type FaceHoleLayout = {
  widthPct: number;
  heightPct: number;
  leftPct: number;
  topPct: number;
};

/**
 * Oval hole in the leathers art — averaged from per-row alpha aperture scans across all
 * face-hole PNGs (1024×1536). Values are fractions of the artwork, then placed with
 * `contain` in the square badge (same as the Image).
 *
 * Re-measure and update if PNG size/aspect or the transparent cut-out changes.
 * See `./FACE_PHOTO.md` for capture ↔ home invariants.
 */
export const DEFAULT_FACE_HOLE_LAYOUT: FaceHoleLayout = {
  leftPct: 0.294,
  topPct: 0.15,
  widthPct: 0.373,
  heightPct: 0.25,
};

/** Per-frame overrides (optional). Keys match `AvatarPreset.id`. Art-space fractions. */
const FACE_HOLE_LAYOUT_OVERRIDES: Partial<Record<string, FaceHoleLayout>> = {};

export function getFaceHoleLayout(avatarId: string | null | undefined): FaceHoleLayout | null {
  const preset = getAvatarPreset(avatarId);
  if (!preset?.hasFaceHole) return null;
  return FACE_HOLE_LAYOUT_OVERRIDES[avatarId ?? ''] ?? DEFAULT_FACE_HOLE_LAYOUT;
}

/** Width/height ratio of the face hole in pixels (matches camera crop & ellipse). */
export function getFaceHoleAspectRatio(layout: FaceHoleLayout): number {
  return (layout.widthPct * AVATAR_ART_WIDTH) / (layout.heightPct * AVATAR_ART_HEIGHT);
}
