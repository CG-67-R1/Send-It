/** Symptom to parameter guidance for Rider/Tuner UX. */

export type SymptomGuide = {
  id: string;
  symptom: string;
  lookAt: string[];
  typicalDirection: string;
  equationIds: string[];
};

export const SYMPTOM_GUIDES: SymptomGuide[] = [
  {
    id: 'slow-steering',
    symptom: 'Slow steering / will not finish the corner',
    lookAt: ['Trail', 'Rake (via ride height)', 'Wheelbase'],
    typicalDirection:
      'Less trail, steeper rake, or shorter wheelbase. Watch anti-squat rise if the rear goes up.',
    equationIds: ['EQ-REAR-NTRAIL-01', 'EQ-AS-PCT-01', 'EQ-WEIGHT-01'],
  },
  {
    id: 'nervous-brakes',
    symptom: 'Nervous on brakes / headshake on exit',
    lookAt: ['Trail', 'Wheelbase', 'Front height'],
    typicalDirection:
      'More trail or longer wheelbase. Check the front is not collapsing trail under brakes.',
    equationIds: ['EQ-REAR-NTRAIL-01', 'EQ-FW-TRAVEL-01', 'EQ-FW-RATE-01'],
  },
  {
    id: 'rear-squats',
    symptom: 'Rear squats and runs wide on throttle',
    lookAt: ['Anti-squat %', 'AS angle', 'Sprocket / pivot / rear RH'],
    typicalDirection: 'Raise AS% toward about 100% or above. Confirm across travel, not one static number.',
    equationIds: ['EQ-AS-PCT-01', 'EQ-LT-ANGLE-01', 'EQ-AS-FLAG-01'],
  },
  {
    id: 'rear-harsh',
    symptom: 'Rear harsh / chatters on exit bumps',
    lookAt: ['Anti-squat %', 'Rw rate'],
    typicalDirection:
      'AS% may be too high, or Rw rate too high at the wheel. Check wheel rate, not only the spring.',
    equationIds: ['EQ-AS-PCT-01', 'EQ-RW-RATE-01', 'EQ-SRC-01'],
  },
  {
    id: 'wheelie-early',
    symptom: 'Wheelies too early, killing drive',
    lookAt: ['CoG Y', 'CoG X', 'Anti-squat'],
    typicalDirection: 'Lower or forward mass. Slight AS reduction so squat drops CoG.',
    equationIds: ['EQ-WEIGHT-01', 'EQ-LT-ANGLE-01', 'EQ-AS-PCT-01'],
  },
  {
    id: 'poor-drive',
    symptom: 'Poor drive grip off slow corners',
    lookAt: ['R weight %', 'Anti-squat near 100%', 'Rw rate'],
    typicalDirection: 'More rear load share. AS toward about 100%. Soften at the wheel if harsh.',
    equationIds: ['EQ-WEIGHT-01', 'EQ-AS-PCT-01', 'EQ-RW-RATE-01'],
  },
  {
    id: 'front-vague',
    symptom: 'Front vague mid-corner',
    lookAt: ['F weight %', 'Front ride height', 'Fw rate'],
    typicalDirection: 'Re-check at lean not equal to 0 deg. The static picture can look fine.',
    equationIds: ['EQ-WEIGHT-F-01', 'EQ-FW-RATE-01', 'EQ-FW-FORCE-01'],
  },
  {
    id: 'after-sprocket',
    symptom: 'After any sprocket change',
    lookAt: ['Wheelbase', 'Anti-squat'],
    typicalDirection: 'Re-run the model. Gearing moves chain line and often wheelbase.',
    equationIds: ['EQ-AS-PCT-01', 'EQ-LT-ANGLE-01'],
  },
];
