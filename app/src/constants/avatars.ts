/**
 * Avatars live in app/avatar/
 * - no_face images: used as frame choice when user uploads their face.
 * - the_goat: used for special moments (e.g. 8 correct in trivia).
 */

export const AVATAR_IDS = [
  'devil',
  'donkey',
  'flip',
  'goat',
  '8ball',
  'black_no_face',
  'blue_no_face',
  'orange_no_face',
  'pink_no_face',
  'purple_no_face',
  'red_no_face',
  'yellow_no_face',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

/** IDs that are no_face frames (for face-upload flow). */
export const NO_FACE_IDS: readonly string[] = [
  'black_no_face',
  'blue_no_face',
  'orange_no_face',
  'pink_no_face',
  'purple_no_face',
  'red_no_face',
  'yellow_no_face',
];

export const AVATAR_SOURCES: Record<string, number> = {
  devil: require('../../avatar/devil.png'),
  donkey: require('../../avatar/donkey.png'),
  flip: require('../../avatar/flip.png'),
  goat: require('../../avatar/goat.png'),
  '8ball': require('../../avatar/8ball.png'),
  black_no_face: require('../../avatar/black_no_face.png'),
  blue_no_face: require('../../avatar/blue_no_face.png'),
  orange_no_face: require('../../avatar/orange_no_face.png'),
  pink_no_face: require('../../avatar/pink_no_face.png'),
  purple_no_face: require('../../avatar/purple._no_face.png'),
  red_no_face: require('../../avatar/red_no_face.png'),
  yellow_no_face: require('../../avatar/yellow_no_face.png'),
};

/** Special avatar for e.g. 8 correct in trivia. */
export const THE_GOAT_SOURCE = require('../../avatar/the_goat.png');
