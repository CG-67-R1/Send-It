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
  global_principles: ['One change at a time.', '---'],
  novice_guidelines: 'Make reasonable assumptions and use typical values.',
  coach: [
    {
      question: 'Why do I run wide on the exit?',
      answer: 'Early throttle or an early apex.',
    },
    {
      question: 'How do I set sag?',
      answer: 'Measure static and rider sag before changing springs.',
    },
  ],
  bikesetup: [],
};

const widePrompt = formatFaqsForPrompt(faqs, 'coach', 'novice', 'I keep running wide');
const setupPrompt = formatFaqsForPrompt(faqs, 'coach', 'novice', 'what sag should I run');
const barePrompt = formatFaqsForPrompt(faqs, 'coach', 'advanced', '');
assert('matching question includes that FAQ', widePrompt.includes('running wide') || widePrompt.includes('Early throttle'));
assert('unrelated FAQ stays out', !widePrompt.includes('static and rider sag'));
assert('novice prompt does not teach assumed values', !widePrompt.includes('typical values'));
assert('separator principle is dropped', !barePrompt.includes('---'));
assert('principles stay', barePrompt.includes('One change at a time.'));
assert('no query means no FAQ dump', !barePrompt.includes('Early throttle'));
assert('sag question can match the sag FAQ', setupPrompt.includes('rider sag'));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll rider-skill tests passed');
