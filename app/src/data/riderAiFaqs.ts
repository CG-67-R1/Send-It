import bundled from './rider_ai_faqs.json';

export type RiderAiFaqItem = {
  id: string;
  question: string;
  answer: string;
  confidence_rule?: string;
  recommended_user_inputs?: string[];
};

export type RiderAiFaqBank = {
  version?: number;
  schema_version?: string;
  coach: RiderAiFaqItem[];
  bikesetup: RiderAiFaqItem[];
  global_principles?: string[];
  novice_guidelines?: string;
};

export type RiderAiFaqMode = 'coach' | 'bikesetup';

export const RIDER_AI_FAQS: RiderAiFaqBank = bundled as RiderAiFaqBank;

export function faqsForMode(mode: RiderAiFaqMode): RiderAiFaqItem[] {
  return mode === 'bikesetup' ? RIDER_AI_FAQS.bikesetup : RIDER_AI_FAQS.coach;
}
