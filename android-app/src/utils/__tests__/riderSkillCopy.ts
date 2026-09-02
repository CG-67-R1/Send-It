/**
 * Run: npx tsx src/utils/__tests__/riderSkillCopy.ts
 */
import {
  bikeSetupIntroForSkill,
  riderSkillReplyInstruction,
  showDetailedSetupTips,
  trackInfoCoachingForSkill,
  trackPrepBriefingInstruction,
  trackPrepLevelFromActivity,
} from '../riderSkillCopy';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert('track days → can_ride prep', trackPrepLevelFromActivity('track_days') === 'can_ride');
assert('want to race → newbie prep', trackPrepLevelFromActivity('race_one_day') === 'newbie');
assert('just love bikes → newbie prep', trackPrepLevelFromActivity('just_love_bikes') === 'newbie');
assert('intermediate → experienced prep', trackPrepLevelFromActivity('intermediate') === 'experienced');
assert('racer → racer prep', trackPrepLevelFromActivity('race') === 'racer');
assert('missing → newbie prep', trackPrepLevelFromActivity(undefined) === 'newbie');

assert(
  'novice instruction is simple',
  riderSkillReplyInstruction('novice').includes('everyday language')
);
assert(
  'racer instruction asks for technical detail',
  riderSkillReplyInstruction('advanced').includes('technical coaching')
);

const noviceTips = trackInfoCoachingForSkill('novice');
const racerTips = trackInfoCoachingForSkill('advanced');
assert('novice track tips are shorter', noviceTips.points.length < racerTips.points.length);
assert('novice track tips skip racing line', noviceTips.intro.includes('do not need a racing line'));

assert('novice setup hides clicker depth', showDetailedSetupTips('novice') === false);
assert('racer setup shows clicker depth', showDetailedSetupTips('advanced') === true);
assert(
  'novice bike-setup intro stays simple',
  bikeSetupIntroForSkill('novice').whyBase.includes('one thing at a time')
);

assert(
  'newbie briefing asks for simple copy',
  trackPrepBriefingInstruction('newbie').includes('short and simple')
);
assert(
  'racer briefing asks for race-engineer depth',
  trackPrepBriefingInstruction('racer').includes('race-engineer')
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll riderSkillCopy tests passed');
