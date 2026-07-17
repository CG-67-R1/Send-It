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

/** Where to place the user’s face photo (percent of badge box). Tune per art if needed. */
export type FaceHoleLayout = {
  widthPct: number;
  heightPct: number;
  leftPct: number;
  topPct: number;
};

/**
 * Oval hole (ellipse) — pixel-accurate to the transparent face hole in the leathers art.
 * Measured via per-pixel alpha scan across all six avatar PNGs (1024×1536, contain in badge).
 * Expressed as fractions of the badge box; scales with `HERO_AVATAR_BADGE_SIZE`.
 *
 * Previous values (0.34/0.42/0.33/0.15) had the ellipse ~2× too tall and 8% too low —
 * corrected to match the actual cut-out in the artwork.
 */
export const DEFAULT_FACE_HOLE_LAYOUT: FaceHoleLayout = {
  widthPct: 0.25,
  heightPct: 0.23,
  leftPct: 0.37,
  topPct: 0.17,
};

/** Per-frame overrides (optional). Keys match `AvatarPreset.id`. */
const FACE_HOLE_LAYOUT_OVERRIDES: Partial<Record<string, FaceHoleLayout>> = {};

export function getFaceHoleLayout(avatarId: string | null | undefined): FaceHoleLayout | null {
  const preset = getAvatarPreset(avatarId);
  if (!preset?.hasFaceHole) return null;
  return FACE_HOLE_LAYOUT_OVERRIDES[avatarId ?? ''] ?? DEFAULT_FACE_HOLE_LAYOUT;
}

/** Width/height ratio of the face hole bounding box (matches camera crop & ellipse). */
export function getFaceHoleAspectRatio(layout: FaceHoleLayout): number {
  return layout.widthPct / layout.heightPct;
}
