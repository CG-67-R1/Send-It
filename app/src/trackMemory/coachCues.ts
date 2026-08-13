/** Metres before apex to show the corner name. */
export const CORNER_NAME_LEAD_M = 95;

/** Distance boards only when turn angle exceeds this (degrees). */
export const DISTANCE_BOARD_MIN_DEG = 90;

/** Coaching popup duration (longer so riders can read). */
export const COACH_FLASH_MS = 3200;

/** Do not start the coaching sequence until this fraction of the lap. */
export const COACH_SEQUENCE_MIN_SNORM = 0.3;

/** Speed cap while a taught-corner sequence is in progress (until Send it). */
export const COACH_SLOW_SPEED_FRAC = 0.5;

export const COACH_START_TEXT = 'remember to look for your reference points';

/** Distance-relative coaching marks for one taught corner (metres from apex). */
export const COACH_CORNER_MARKS: { offsetM: number; key: string; text: string }[] = [
  { offsetM: -125, key: 'brake', text: 'apply brake marker?' },
  { offsetM: -70, key: 'ease', text: 'ease off brake marker?' },
  { offsetM: -40, key: 'turnin', text: 'turn in marker?' },
  { offsetM: -10, key: 'release', text: 'release brake/pickup throttle marker?' },
  { offsetM: 0, key: 'apex', text: 'your apex?' },
  { offsetM: 5, key: 'exit', text: 'exit target marker' },
  { offsetM: 15, key: 'sendit', text: 'Send it marker!' },
];

/** Near end-of-lap coaching (metres before finish / start). */
export const COACH_LAP_END = [
  { leadM: 90, id: 'lap-visualise', text: 'visualise your reference points' },
  { leadM: 40, id: 'lap-moreinfo', text: 'more information is better!' },
] as const;

export function coachCornerCueId(cornerId: string, key: string): string {
  return `coach:${cornerId}:${key}`;
}
