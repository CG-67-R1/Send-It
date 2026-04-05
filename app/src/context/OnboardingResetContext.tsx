import { createContext, useContext } from 'react';

export type OnboardingResetContextValue = {
  resetOnboarding: () => Promise<void>;
};

export const OnboardingResetContext = createContext<OnboardingResetContextValue | null>(null);

export function useOnboardingReset(): OnboardingResetContextValue | null {
  return useContext(OnboardingResetContext);
}
