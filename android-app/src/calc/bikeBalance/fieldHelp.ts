/**
 * Teaching copy for Bike Balance input fields.
 * Plain document style. Math symbols only inside formulas.
 */

import type { BikeBalanceInputs, SkillMode } from './types';
import { R6_2020_PUBLIC_CHASSIS } from './r6Guide';

export type FieldHelp = {
  key: keyof BikeBalanceInputs;
  label: string;
  /** One-line caption under the label. */
  shortHint: string;
  /** What the number means. */
  what: string;
  /** How a paddock user gets it. */
  how: string;
  /** Why the calculator needs it. */
  why: string;
  /** Optional public R6 teaching note. */
  r6Tip?: string;
};

export const INPUT_FIELD_HELP: FieldHelp[] = [
  {
    key: 'rakeDeg',
    label: 'Rake (°)',
    shortHint: 'Steering-axis angle from vertical',
    what: 'Rake (caster) is how far the steering axis leans back from vertical when viewed from the side.',
    how: 'Start from the OEM spec sheet. Re-measure or re-enter if you changed yokes, offset, or ride height enough to change geometry.',
    why: 'Rake converts fork travel, rate, and force into vertical wheel values, and it sits inside trail and rear-normal-trail geometry.',
    r6Tip: `2020 YZF-R6 public stock rake is ${R6_2020_PUBLIC_CHASSIS.rakeDeg} deg.`,
  },
  {
    key: 'trailMm',
    label: 'Trail (mm)',
    shortHint: 'Ground trail at the front contact',
    what: 'Trail is the ground distance from where the steering axis meets the ground back to the front tyre contact patch. It is the main straight-line stability number.',
    how: 'Use the OEM trail figure for stock attitude, or measure at the position you care about after ride-height changes.',
    why: 'Trail and rear normal trail describe how eager or calm the front feels when you tip in and when you hold a line.',
    r6Tip: `2020 YZF-R6 public stock trail is ${R6_2020_PUBLIC_CHASSIS.trailMm} mm.`,
  },
  {
    key: 'wheelbaseMm',
    label: 'Wheelbase (mm)',
    shortHint: 'Front contact to rear contact',
    what: 'Wheelbase is the distance between the front and rear tyre contact patches along the ground.',
    how: 'OEM sheet for stock bikes. Tape measure between contact centres after sprocket, swingarm, or ride-height changes.',
    why: 'Wheelbase scales load transfer, weight split, spring centres, and anti-squat geometry.',
    r6Tip: `2020 YZF-R6 public stock wheelbase is ${R6_2020_PUBLIC_CHASSIS.wheelbaseMm} mm.`,
  },
  {
    key: 'forkTravelMm',
    label: 'Fork travel (mm)',
    shortHint: 'Used stroke along the fork axis at this Pos',
    what: 'How far the forks have compressed from full extension at the chosen position. This is used travel, not total stroke capacity.',
    how: 'Zip-tie on a stanchion, or measure from a full-extension reference to the current seal or marker. Measure at the same Pos label you selected.',
    why: 'Front wheel travel and several attitude-sensitive results use this number. Guessing invents a fake attitude.',
    r6Tip: `Public R6 total fork capacity is about ${R6_2020_PUBLIC_CHASSIS.publishedFrontTravelCapacityMm} mm. Do not enter that as used travel unless the forks are nearly bottomed.`,
  },
  {
    key: 'shockTravelMm',
    label: 'Shock travel (mm)',
    shortHint: 'Used shock-shaft stroke at this Pos',
    what: 'How far the shock shaft has moved from full extension at the chosen position.',
    how: 'Measure shaft stroke used from a full-extension mark, or use a travel indicator. Save it under the Pos you measured.',
    why: 'Rear wheel travel uses shock travel times the motion ratio. Position presets do not invent this for you.',
    r6Tip: `Public R6 total rear stroke capacity is about ${R6_2020_PUBLIC_CHASSIS.publishedRearTravelCapacityMm} mm. Measure used stroke yourself.`,
  },
  {
    key: 'forkRateNPerMm',
    label: 'Fork rate (N/mm)',
    shortHint: 'Combined spring rate of both legs',
    what: 'The spring rate felt along the fork tubes when both legs are counted together.',
    how: 'Read the spring stamp or tuner sheet. Convert lb/in if needed (1 N/mm is about 5.71 lb/in). Add both legs for a conventional twin-fork setup.',
    why: 'Front wheel rate is fork rate transformed by rake: Fw_rate = fork_rate / cos^2(rake).',
  },
  {
    key: 'shockRateNPerMm',
    label: 'Shock rate (N/mm)',
    shortHint: 'Spring rate at the shock shaft',
    what: 'The spring rate along the shock, before the linkage multiplies motion.',
    how: 'Read the spring stamp or manufacturer data for the fitted spring.',
    why: 'Rear wheel rate is shock rate transformed by motion ratio: Rw_rate = shock_rate / link_ratio^2.',
  },
  {
    key: 'linkRatio',
    label: 'Link ratio',
    shortHint: 'Instantaneous wheel/shock motion ratio',
    what: 'How many millimetres of rear-wheel travel you get per millimetre of shock stroke at this attitude. Often called motion ratio (MR).',
    how: 'From a linkage chart at the current shock stroke, or careful measurement of wheel travel versus shaft travel near that stroke. Instantaneous local ratio, not a vague average, is best.',
    why: 'Link ratio converts shock force, rate, and travel into rear-wheel values.',
  },
  {
    key: 'forkForceN',
    label: 'Fork force (N)',
    shortHint: 'Axial force in the forks at this Pos',
    what: 'The compressive force along the fork axis at the chosen position.',
    how: 'Use a Position preset to set teaching loads from chosen vertical wheel forces, or enter a measured/modelled value. Presets are not OEM R6 lab numbers.',
    why: 'Front wheel force and spring-force centre need this. Fw_force = fork_force / cos(rake).',
  },
  {
    key: 'shockForceN',
    label: 'Shock force (N)',
    shortHint: 'Force along the shock at this Pos',
    what: 'The compressive force in the shock at the chosen position.',
    how: 'Position preset, or measured/modelled shaft force. Same caution as fork force: presets are for teaching and comparison.',
    why: 'Rear wheel force is shock force divided by link ratio. Spring-force centre uses both wheel forces.',
  },
  {
    key: 'cogXMm',
    label: 'CoG X (mm)',
    shortHint: 'Horizontal CoG from the front contact',
    what: 'How far rearward the combined bike-and-rider centre of gravity sits from the front contact patch.',
    how: 'Best: scales plus a CoG procedure. If you only estimate, mark provenance as Estimated. Leave blank if you cannot defend the number.',
    why: 'Static weight split is CoG X over wheelbase. Bad CoG X makes tidy-looking but untrustworthy percentages.',
    r6Tip: 'Public wet weight exists for the R6. A trustworthy rider-plus-bike CoG X does not come from the brochure.',
  },
  {
    key: 'cogYMm',
    label: 'CoG Y (mm)',
    shortHint: 'CoG height above the ground',
    what: 'How high the combined centre of gravity sits above the ground plane.',
    how: 'Same honesty rule as CoG X. Estimated is allowed if labelled. Blank is better than fiction.',
    why: 'Load-transfer angle is atan(CoG_Y / wheelbase). Anti-squat percent compares AS angle to that LT angle.',
    r6Tip: 'Brochure wet weight does not give CoG height. Measure or estimate with provenance marked.',
  },
  {
    key: 'antiSquatAngleDeg',
    label: 'Anti-squat angle (°)',
    shortHint: 'Manual squat-line angle above horizontal',
    what: 'The angle above horizontal of the line from the rear contact through the Instantaneous Force Centre (IFC).',
    how: 'Enter a trusted analysis angle in Manual mode, or switch to Geometry mode and measure swingarm and chain-line inputs instead.',
    why: 'AS% = tan(AS_angle) / tan(LT_angle) x 100. Without a defensible AS angle, AS% is noise.',
  },
];

export const GEO_FIELD_HELP: FieldHelp[] = [
  {
    key: 'rearTyreRadiusMm',
    label: 'Rear tyre radius (mm)',
    shortHint: 'Effective loaded rolling radius',
    what: 'Distance from rear axle centre to the ground under the tyre you are analysing.',
    how: 'Measure axle height above ground at the chosen attitude, or use a carefully chosen effective rolling radius for that tyre and load.',
    why: 'Sets the rear contact height for anti-squat geometry.',
  },
  {
    key: 'swingarmLengthMm',
    label: 'Swingarm length (mm)',
    shortHint: 'Pivot centre to rear axle centre',
    what: 'Straight-line distance between swingarm pivot and rear axle.',
    how: 'Measure centre to centre on the bike, or take from a trusted frame drawing for that chassis.',
    why: 'Defines the swingarm line used to find the IFC with the top chain run.',
  },
  {
    key: 'swingarmAngleDeg',
    label: 'Swingarm angle (°)',
    shortHint: 'Above horizontal; + when pivot is above axle',
    what: 'Angle of the swingarm centreline relative to horizontal at the chosen position.',
    how: 'Inclinometer or careful geometry from measured heights. Positive when the pivot sits above the axle.',
    why: 'Swingarm angle places the pivot in space so the IFC construction matches the attitude you are studying.',
  },
  {
    key: 'csFromPivotXMm',
    label: 'CS from pivot X (mm)',
    shortHint: '+ rearward from pivot (frame convention)',
    what: 'Horizontal offset from swingarm pivot to countershaft (front sprocket) centre. Positive is rearward of the pivot in this app convention.',
    how: 'Measure on the bike or use a trusted frame print. Do not invent from a brochure photo.',
    why: 'Locates the front sprocket for the top chain-run tangent used in AS geometry.',
  },
  {
    key: 'csFromPivotYMm',
    label: 'CS from pivot Y (mm)',
    shortHint: '+ up from pivot',
    what: 'Vertical offset from swingarm pivot to countershaft centre. Positive is upward.',
    how: 'Same measurement discipline as CS X.',
    why: 'Together with CS X, this places the chain drive centre for the IFC.',
  },
  {
    key: 'frontSprocketTeeth',
    label: 'Front sprocket teeth',
    shortHint: 'Count the teeth on the countershaft sprocket',
    what: 'Tooth count on the front sprocket. It sets pitch-circle radius with chain pitch.',
    how: 'Count teeth on the fitted sprocket. Stock counts are on the bike, not guessed from marketing copy.',
    why: 'Front sprocket radius helps build the upper external chain tangent.',
  },
  {
    key: 'rearSprocketTeeth',
    label: 'Rear sprocket teeth',
    shortHint: 'Count the teeth on the rear sprocket',
    what: 'Tooth count on the rear sprocket.',
    how: 'Count teeth on the fitted sprocket after any gearing change.',
    why: 'Rear sprocket radius completes the top chain-run model. Gearing changes can move anti-squat.',
  },
  {
    key: 'chainPitchMm',
    label: 'Chain pitch (mm)',
    shortHint: '520/525/530 pitch is about 15.875 mm',
    what: 'Distance between chain pin centres. Common 520/525/530 pitch is about 15.875 mm.',
    how: 'Read the chain size stamped on the side plates, then use the matching pitch.',
    why: 'Pitch radius is teeth x pitch / (2*pi). That radius feeds the chain tangent model.',
  },
];

export const SKILL_MODE_HELP: Record<
  SkillMode,
  { title: string; blurb: string }
> = {
  rider: {
    title: 'Rider',
    blurb:
      'Plain-language results and teaching diagrams. Same equations as every other mode. Best when you are learning what the numbers mean.',
  },
  tuner: {
    title: 'Tuner',
    blurb:
      'Compact parameter rows with deltas versus your Ref. Same math. Best when you are comparing a proposal to a baseline.',
  },
  engineer: {
    title: 'Engineer',
    blurb:
      'Equation IDs and Verify cross-checks stay visible. Same math. Best when you are auditing identities and sources.',
  },
};

export function getFieldHelp(key: keyof BikeBalanceInputs): FieldHelp | undefined {
  return (
    INPUT_FIELD_HELP.find((f) => f.key === key) ?? GEO_FIELD_HELP.find((f) => f.key === key)
  );
}
