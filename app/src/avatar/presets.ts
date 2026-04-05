import type { ImageSourcePropType } from 'react-native';

export type AvatarId = 'devil' | '8ball' | 'black_no_face';

export interface AvatarPreset {
  id: AvatarId;
  label: string;
  source: ImageSourcePropType;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'devil',
    label: 'Devil',
    source: require('../../avatar/devil.png'),
  },
  {
    id: '8ball',
    label: '8 ball',
    source: require('../../avatar/8ball.png'),
  },
  {
    id: 'black_no_face',
    label: 'Black helmet',
    source: require('../../avatar/black_no_face.png'),
  },
];

export function getAvatarSource(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  const preset = AVATAR_PRESETS.find((p) => p.id === id);
  return preset ? preset.source : null;
}

