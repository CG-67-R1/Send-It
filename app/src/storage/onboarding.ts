import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ONBOARDING_DONE = '@roadrace_onboarding_done';
const KEY_ONBOARDING_ANSWERS = '@roadrace_onboarding_answers';

export interface OnboardingAnswers {
  favouriteBike: string;
  favouriteRider: string;
  activity: 'race' | 'track_days' | 'just_love_bikes';
  knowsJustSendIt: boolean;
  /** Name, race number or nickname shown on the home screen (optional for backward compatibility) */
  riderNickname?: string;
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
