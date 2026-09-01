/**
 * Rider skill mapping for Coach / Bike Setup system prompts.
 * Run: node scripts/testRiderSkill.mjs
 */
import { normalizeRiderSkill } from '../roadraceAi.js';
import { formatFaqsForPrompt } from '../riderAiFaqs.js';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert('known novice', normalizeRiderSkill('novice') === 'novice');
assert('known intermediate', normalizeRiderSkill('intermediate') === 'intermediate');
assert('known advanced', normalizeRiderSkill('advanced') === 'advanced');
assert('junk → novice', normalizeRiderSkill('racer') === 'novice');
assert('null → novice', normalizeRiderSkill(null) === 'novice');
assert('object → novice', normalizeRiderSkill({ skill: 'advanced' }) === 'novice');

const faqs = {
  global_principles: ['One change at a time.'],
  novice_guidelines: 'Ask at most two questions.',
  coach: [],
  bikesetup: [],
};

const novicePrompt = formatFaqsForPrompt(faqs, 'coach', 'novice');
const advancedPrompt = formatFaqsForPrompt(faqs, 'coach', 'advanced');
assert('novice prompt includes novice guidelines', novicePrompt.includes('Ask at most two questions.'));
assert(
  'advanced prompt skips novice guidelines',
  !advancedPrompt.includes('Ask at most two questions.')
);
assert('both include global principles', advancedPrompt.includes('One change at a time.'));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll rider-skill tests passed');
