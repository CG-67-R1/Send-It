import type { RideActivity } from '../storage/onboarding';

export type HomeMode = 'learn' | 'setup';
export type { RideActivity };
export type RiderAiSkill = 'novice' | 'intermediate' | 'advanced';

export const RIDE_ACTIVITY_OPTIONS: { value: RideActivity; label: string }[] = [
  { value: 'race', label: 'I race' },
  { value: 'intermediate', label: 'Intermediate rider' },
  { value: 'track_days', label: 'Track days only' },
  { value: 'just_love_bikes', label: 'Just love bikes' },
  { value: 'race_one_day', label: 'I would like to know about local racing' },
];

export function homeModeFromActivity(activity: RideActivity | null | undefined): HomeMode {
  return activity === 'race' ? 'setup' : 'learn';
}

/**
 * Coach / Bike Setup detail from onboarding "how you ride".
 * Track days and "want to race" stay simple; intermediate and racers get more depth.
 */
export function riderAiSkillFromActivity(activity: RideActivity | null | undefined): RiderAiSkill {
  if (activity === 'race') return 'advanced';
  if (activity === 'intermediate') return 'intermediate';
  return 'novice';
}

let cachedHomeMode: HomeMode | null = null;

/** Last resolved home mode for remounts so the activity card does not flash empty. */
export function peekHomeMode(): HomeMode | null {
  return cachedHomeMode;
}

export function rememberHomeMode(mode: HomeMode): void {
  cachedHomeMode = mode;
}
