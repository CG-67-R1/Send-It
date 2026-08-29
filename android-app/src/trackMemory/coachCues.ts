/** Metres before apex to show the corner name. */
export const CORNER_NAME_LEAD_M = 95;

/**
 * Corner `sNorm` is the apex — mid-corner / peak of the turn.
 * 150 / 100 / 50 boards are measured back from that point.
 */
export const DISTANCE_BOARD_M = [150, 100, 50] as const;

/** Distance boards only when turn angle exceeds this (degrees). */
export const DISTANCE_BOARD_MIN_DEG = 65;

/** Coaching popup visible duration. */
export const COACH_SHOW_MS = 2000;

/** Quiet gap between coaching popups. */
export const COACH_GAP_MS = 2000;

/**
 * Lap coaching playlist — played from the start of each lap on a fixed
 * 2 s show / 2 s gap clock. Not tied to distance boards or apex stations.
 */
export const COACH_SCRIPT: string[] = [
  'remember to look for your reference points',
  'apply brake marker?',
  'ease off brake marker?',
  'turn in marker?',
  'your apex?',
  'exit target marker',
  'visualise your reference points',
  'more information is better!',
];
