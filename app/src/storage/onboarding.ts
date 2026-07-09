import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAvatarFacePhoto } from './avatarFacePhoto';

const KEY_ONBOARDING_DONE = '@roadrace_onboarding_done';
const KEY_ONBOARDING_ANSWERS = '@roadrace_onboarding_answers';

export interface OnboardingAnswers {
  favouriteBike: string;
  favouriteRider: string;
  activity: 'race' | 'track_days' | 'just_love_bikes' | 'race_one_day';
  /** Optional for backward compatibility; prefer avatarId. */
  knowsJustSendIt?: boolean;
  /** Predefined avatar id (e.g. 'devil', 'black_no_face') or 'custom' when using uploaded photo. */
  avatarId?: string;
  /** When avatarId is 'custom', which no_face frame was chosen (e.g. 'black_no_face'). */
  noFaceFrameId?: string;
  /** Name, race number or nickname shown on the home screen (optional for backward compatibility) */
  riderNickname?: string;
  /** Future racer flow: whether they picked \"Want to have a go at racing one day!\" */
  futureRacer?: boolean;
  /** Future racer flow: state they selected for learning how to race (e.g. 'NSW'). */
  racingStateCode?: string;
  /** Future racer flow: email address for follow-up info, if they opted in. */
  racingInfoEmail?: string;
}

export async function getOnboardingDone(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ONBOARDING_DONE);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_DONE, 'true');
}

export async function getOnboardingAnswers(): Promise<OnboardingAnswers | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ONBOARDING_ANSWERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.favouriteBike === 'string') return parsed as OnboardingAnswers;
    }
  } catch {}
  return null;
}

export async function setOnboardingAnswers(answers: OnboardingAnswers): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_ANSWERS, JSON.stringify(answers));
}

/** Merge partial updates into saved onboarding answers (profile edits after setup). */
export async function updateOnboardingAnswers(
  partial: Partial<OnboardingAnswers>
): Promise<OnboardingAnswers | null> {
  const current = await getOnboardingAnswers();
  if (!current) return null;
  const next = { ...current, ...partial };
  await setOnboardingAnswers(next);
  return next;
}

/** Clears onboarding completion flag and saved answers (e.g. to re-run welcome flow). */
export async function resetOnboardingStorage(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_ONBOARDING_DONE, KEY_ONBOARDING_ANSWERS]);
}

/**
 * Full reset for re-testing onboarding: clears answers + saved face-in-hole image.
 * Does not clear bike hero photo or headlines settings.
 */
export async function resetOnboardingForRetest(): Promise<void> {
  await clearAvatarFacePhoto();
  await resetOnboardingStorage();
}

