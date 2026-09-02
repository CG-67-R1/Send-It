import { riderAiSkillFromActivity, type RiderAiSkill } from '../navigation/homeMode';
import { getOnboardingAnswers } from '../storage/onboarding';

export async function getSavedRiderAiSkill(): Promise<RiderAiSkill> {
  const answers = await getOnboardingAnswers();
  return riderAiSkillFromActivity(answers?.activity);
}
