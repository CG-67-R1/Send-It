import type { ImageSourcePropType } from 'react-native';

export interface AvatarPreset {
  id: string;
  label: string;
  /** When true, this art is a "face hole" frame — user photo can be composited later. */
  hasFaceHole: boolean;
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
    source: require('../../avatar/black_no_face.png'),
  },
  {
    id: 'blue_no_face',
    label: 'Blue leathers',
    hasFaceHole: true,
    source: require('../../avatar/blue_no_face.png'),
  },
  {
    id: 'pink_no_face',
    label: 'Pink leathers',
    hasFaceHole: true,
    source: require('../../avatar/pink_no_face.png'),
  },
  {
    id: 'red_no_face',
    label: 'Red leathers',
    hasFaceHole: true,
    source: require('../../avatar/red_no_face.png'),
  },
  {
    id: 'yellow_no_face',
    label: 'Yellow leathers',
    hasFaceHole: true,
    source: require('../../avatar/yellow_no_face.png'),
  },
  {
    id: 'orange_no_face',
    label: 'Orange leathers',
    hasFaceHole: true,
    source: require('../../avatar/orange_no_face.png'),
  },
  {
    id: 'purple_no_face',
    label: 'Purple leathers',
    hasFaceHole: true,
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

/** Where to place the user’s face photo (percent of badge box). Tune per art if needed. */
export type FaceHoleLayout = {
  widthPct: number;
  heightPct: number;
  leftPct: number;
  topPct: number;
};

const DEFAULT_FACE_HOLE_LAYOUT: FaceHoleLayout = {
  widthPct: 0.38,
  heightPct: 0.38,
  leftPct: 0.31,
  topPct: 0.18,
};

/** Per-frame overrides (optional). Keys match `AvatarPreset.id`. */
const FACE_HOLE_LAYOUT_OVERRIDES: Partial<Record<string, FaceHoleLayout>> = {};

export function getFaceHoleLayout(avatarId: string | null | undefined): FaceHoleLayout | null {
  const preset = getAvatarPreset(avatarId);
  if (!preset?.hasFaceHole) return null;
  return FACE_HOLE_LAYOUT_OVERRIDES[avatarId ?? ''] ?? DEFAULT_FACE_HOLE_LAYOUT;
}
