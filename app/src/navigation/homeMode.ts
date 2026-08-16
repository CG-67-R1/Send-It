import type { OnboardingAnswers } from '../storage/onboarding';

export type HomeMode = 'learn' | 'setup';
export type RideActivity = OnboardingAnswers['activity'];

export const RIDE_ACTIVITY_OPTIONS: { value: RideActivity; label: string }[] = [
  { value: 'race', label: 'I race' },
  { value: 'track_days', label: 'Track days only' },
  { value: 'just_love_bikes', label: 'Just love bikes' },
  { value: 'race_one_day', label: 'I would like to know about local racing' },
];

export function homeModeFromActivity(activity: RideActivity | null | undefined): HomeMode {
  return activity === 'race' ? 'setup' : 'learn';
}
