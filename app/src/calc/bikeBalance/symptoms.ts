/** Symptom → parameters guidance (Result Reference Guide §9), for Rider/Tuner UX. */

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
    symptom: 'Slow steering / won’t finish the corner',
    lookAt: ['Trail', 'Rake (via ride height)', 'Wheelbase'],
    typicalDirection: 'Less trail / steeper rake / shorter WB — watch anti-squat rise if rear goes up.',
    equationIds: ['EQ-REAR-NTRAIL-01', 'EQ-AS-PCT-01', 'EQ-WEIGHT-01'],
  },
  {
    id: 'nervous-brakes',
    symptom: 'Nervous on brakes / headshake on exit',
    lookAt: ['Trail', 'Wheelbase', 'Front height'],
    typicalDirection: 'More trail / longer WB; check front isn’t collapsing trail under brakes.',
    equationIds: ['EQ-REAR-NTRAIL-01', 'EQ-FW-TRAVEL-01', 'EQ-FW-RATE-01'],
  },
  {
    id: 'rear-squats',
    symptom: 'Rear squats and runs wide on throttle',
    lookAt: ['Anti-squat %', 'AS angle', 'Sprocket / pivot / rear RH'],
    typicalDirection: 'Raise AS% toward ~100%+; confirm across travel, not one static number.',
    equationIds: ['EQ-AS-PCT-01', 'EQ-LT-ANGLE-01', 'EQ-AS-FLAG-01'],
  },
  {
    id: 'rear-harsh',
    symptom: 'Rear harsh / chatters on exit bumps',
    lookAt: ['Anti-squat %', 'Rw rate'],
    typicalDirection: 'AS% may be too high, or Rw rate too high at the wheel — check wheel rate not only spring.',
    equationIds: ['EQ-AS-PCT-01', 'EQ-RW-RATE-01', 'EQ-SRC-01'],
  },
  {
    id: 'wheelie-early',
    symptom: 'Wheelies too early, killing drive',
    lookAt: ['CoG Y', 'CoG X', 'Anti-squat'],
    typicalDirection: 'Lower / forward mass; slight AS reduction so squat drops CoG.',
    equationIds: ['EQ-WEIGHT-01', 'EQ-LT-ANGLE-01', 'EQ-AS-PCT-01'],
  },
  {
    id: 'poor-drive',
    symptom: 'Poor drive grip off slow corners',
    lookAt: ['R weight %', 'Anti-squat ~100%', 'Rw rate'],
    typicalDirection: 'More rear load share; AS toward ~100%; soften at the wheel if harsh.',
    equationIds: ['EQ-WEIGHT-01', 'EQ-AS-PCT-01', 'EQ-RW-RATE-01'],
  },
  {
    id: 'front-vague',
    symptom: 'Front vague mid-corner',
    lookAt: ['F weight %', 'Front ride height', 'Fw rate'],
    typicalDirection: 'Re-check at Lean ≠ 0 — static picture can look fine.',
    equationIds: ['EQ-WEIGHT-F-01', 'EQ-FW-RATE-01', 'EQ-FW-FORCE-01'],
  },
  {
    id: 'after-sprocket',
    symptom: 'After ANY sprocket change',
    lookAt: ['Wheelbase', 'Anti-squat'],
    typicalDirection: 'Re-run the model — gearing moves chain line and often WB.',
    equationIds: ['EQ-AS-PCT-01', 'EQ-LT-ANGLE-01'],
  },
];
