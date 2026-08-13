/** Metres before apex to show the corner name. */
export const CORNER_NAME_LEAD_M = 95;

/**
 * Corner `sNorm` is the apex — mid-corner / peak of the turn.
 * 150 / 100 / 50 boards and coaching cues are measured back from that point.
 */
export const DISTANCE_BOARD_M = [150, 100, 50] as const;

/** Distance boards only when turn angle exceeds this (degrees). */
export const DISTANCE_BOARD_MIN_DEG = 90;

/** Coaching popup duration (longer so riders can read). */
export const COACH_FLASH_MS = 3200;

/** Do not start the coaching sequence until this fraction of the lap. */
export const COACH_SEQUENCE_MIN_SNORM = 0.3;

/** Speed cap while a taught-corner sequence is in progress (until exit cue). */
export const COACH_SLOW_SPEED_FRAC = 0.5;

export const COACH_START_TEXT = 'remember to look for your reference points';

/**
 * Coaching marks aligned to distance boards (and apex / exit).
 * Only used on corners that show 150/100/50 boards (>90° turns).
 */
export const COACH_CORNER_MARKS: { offsetM: number; key: string; text: string }[] = [
  { offsetM: -150, key: 'brake', text: 'apply brake marker?' },
  { offsetM: -100, key: 'ease', text: 'ease off brake marker?' },
  { offsetM: -50, key: 'turnin', text: 'turn in marker?' },
  { offsetM: 0, key: 'apex', text: 'your apex?' },
  { offsetM: 25, key: 'exit', text: 'exit target marker' },
];

/** Near end-of-lap coaching (metres before finish / start). */
export const COACH_LAP_END = [
  { leadM: 90, id: 'lap-visualise', text: 'visualise your reference points' },
  { leadM: 40, id: 'lap-moreinfo', text: 'more information is better!' },
] as const;

export function coachCornerCueId(cornerId: string, key: string): string {
  return `coach:${cornerId}:${key}`;
}
