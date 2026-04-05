import type { ImageSourcePropType } from 'react-native';

export interface AvatarPreset {
  id: string;
  label: string;
  /** When true, this art is a "face hole" frame — user photo can be composited later. */
  hasFaceHole: boolean;
  source: ImageSourcePropType;
}

/**
 * All bundled avatar art in `app/avatar/`.
 * Face-hole variants are flagged for a future "add your face" flow.
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
  {
    id: 'the_goat',
    label: 'The GOAT',
    hasFaceHole: false,
    source: require('../../avatar/the_goat.png'),
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
