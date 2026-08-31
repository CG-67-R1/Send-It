/** Metres before apex to show the corner name (aligned with the 150 m board). */
export const CORNER_NAME_LEAD_M = 150;

/**
 * Corner `sNorm` is the apex — mid-corner / peak of the turn.
 * 150 / 100 / 50 boards are measured back from that point.
 */
export const DISTANCE_BOARD_M = [150, 100, 50] as const;

/** Distance boards only when turn angle exceeds this (degrees). */
export const DISTANCE_BOARD_MIN_DEG = 65;

/** First reference overlay after the bike starts moving. */
export const REF_OVERLAY_FIRST_MS = 15_000;
/** Second overlay, 30 s after the first. */
export const REF_OVERLAY_SECOND_MS = 45_000;
export const REF_OVERLAY_SHOW_MS = 5_000;

export const REF_OVERLAY_FIRST = {
  title: 'Reference points',
  lines: ['Look for markers before you turn in.'],
} as const;

export const REF_OVERLAY_SECOND = {
  title: 'More reference points is better',
  lines: ['end of curb', 'marshal point', 'tar snake', 'paint mark'],
} as const;

/** 50 m board: hold half speed this long. */
export const SLOW_MARK_M = 50;
export const SLOW_HOLD_MS = 5_000;
