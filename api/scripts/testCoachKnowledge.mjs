/**
 * Coach prompt evidence: matching FAQs and copied track hands.
 * Run: node scripts/testCoachKnowledge.mjs
 */
import { coachEvidenceBlock, selectFaqs, trackNotesForQuery } from '../coachKnowledge.js';
import { formatFaqsForPrompt } from '../riderAiFaqs.js';
import { readFileSync } from 'fs';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const island = trackNotesForQuery('running wide at phillip island turn 4', 'au');
assert('Phillip Island notes are included', island.includes('Phillip Island'));
assert('Phillip Island hand is copied', island.includes('T4 right'));
assert('UK circuit stays out of an AU track question', !island.toLowerCase().includes('brands'));

const brands = trackNotesForQuery('paddock hill at brands hatch', 'uk');
assert('Brands Hatch notes are included', brands.includes('Brands Hatch'));
assert('Paddock Hill hand is copied', brands.includes('Paddock Hill Bend'));

const bend = trackNotesForQuery('setup for the bend', 'au');
assert('The Bend asks for a layout', bend.includes('Ask which layout'));
assert('The Bend does not dump hands before a layout', !bend.includes('T1 '));

const gardner = trackNotesForQuery('turn 1 at gardner', 'au');
assert('Gardner layout is selected', gardner.includes('Gardner'));
assert('Gardner turn 1 hand is copied', gardner.includes('T1 left'));

const westOnly = trackNotesForQuery('the west side of the tyre', 'au');
assert('West alone does not select The Bend West', !westOnly.includes('West Circuit'));

const tyre = coachEvidenceBlock({ query: 'what pressure should I run', packId: 'au' });
assert('Tyre question forbids invented pressures', tyre.includes('do not invent a pressure'));
assert('Tyre notes have no pressure table', tyre.includes('no pressure table'));

const picked = selectFaqs(
  [
    { question: 'Why do I run wide?', answer: 'Early apex.' },
    { question: 'How do I set sag?', answer: 'Measure sag first.' },
  ],
  'running wide on exit'
);
assert('FAQ match keeps the wide note', picked.length === 1 && picked[0].question.includes('wide'));

const faqs = JSON.parse(readFileSync(new URL('../data/rider_ai_faqs.json', import.meta.url), 'utf8'));
const wideCoach = formatFaqsForPrompt(faqs, 'coach', 'intermediate', 'running wide out of turn 4 at brands hatch', 'uk');
assert('running wide includes the exit-throttle note', wideCoach.includes('finish enough turning') || wideCoach.includes('finish the turn before driving'));
assert('running wide includes trail braking', /trail brak/i.test(wideCoach));
assert('running wide includes the bike-setup side', wideCoach.includes('separate line') || wideCoach.includes('geometry'));
assert('UK corner note is not forced to Australia', !wideCoach.includes('Australian circuits'));

const wideSetup = formatFaqsForPrompt(faqs, 'bikesetup', 'intermediate', 'the bike runs wide on the exit', 'au');
assert('setup running-wide checks rider input before chassis', /line\/throttle|throttle timing|rider input/i.test(wideSetup));
assert('setup running-wide still carries the riding causes', /early turn-in|early apex/i.test(wideSetup));

const tear = formatFaqsForPrompt(faqs, 'bikesetup', 'intermediate', 'rear tyre is tearing', 'au');
assert('tearing checks pressure before suspension', /hot pressure/i.test(tear));
assert('tearing does not start with a clicker', !/first step is suspension/i.test(tear));

const ukCorner = formatFaqsForPrompt(faqs, 'coach', 'advanced', 'corner-specific coaching', 'uk');
assert('UK pack says UK track knowledge', ukCorner.includes('UK track knowledge'));
assert('UK pack does not keep the Australian-only line', !ukCorner.includes('Australian track knowledge'));

const ukSetup = formatFaqsForPrompt(faqs, 'bikesetup', 'advanced', 'setup for UK tracks specifically', 'uk');
assert('UK setup note says UK tracks', ukSetup.includes('UK tracks'));
assert('UK setup note drops the Australian line', !ukSetup.includes('Australian tracks'));

const clicker = formatFaqsForPrompt(faqs, 'bikesetup', 'advanced', 'two clicks of rebound', 'au');
assert('clicker question checks pressure first', /hot pressure/i.test(clicker));
assert('clicker question points at the rider when the cause is inputs', /rider input|technique/i.test(clicker));

const sag = formatFaqsForPrompt(faqs, 'bikesetup', 'intermediate', 'what sag should I run at mallala', 'au');
assert('sag question asks for a measurement', /static sag|rider sag/i.test(sag));
assert('sag question can belong in Coach', /Coach/i.test(sag));

const slide = formatFaqsForPrompt(faqs, 'coach', 'novice', 'I had a slide on the exit at donington', 'uk');
assert('a slide keeps the confidence drill', /do not tell the rider to push|push harder/i.test(slide));
assert('a slide also carries the setup check', /hot pressure|tyre pressure/i.test(slide));
assert('Donington stays on the UK notes', trackNotesForQuery('slide on the exit at donington', 'uk').includes('Donington'));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll coach knowledge checks passed.');
