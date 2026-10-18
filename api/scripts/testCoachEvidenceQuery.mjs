/**
 * Coach evidence should come from the latest rider turn, not stale history.
 * Run: node scripts/testCoachEvidenceQuery.mjs
 */
import { adviceForQuery, coachEvidenceBlock, trackNotesForQuery } from '../coachKnowledge.js';
import { evidenceQueryFromMessages } from '../roadraceAi.js';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const staleHistory = [
  { role: 'user', content: 'I am at Phillip Island turn 4 and running wide.' },
  { role: 'assistant', content: 'Call: work on the exit.' },
  { role: 'user', content: 'rear tyre wear, what order should I check?' },
];

const latest = evidenceQueryFromMessages(staleHistory);
assert('latest user turn is selected', latest === 'rear tyre wear, what order should I check?');

const staleBlock = coachEvidenceBlock({ query: latest, packId: 'au' });
assert('generic tyre follow-up keeps tyre evidence', staleBlock.includes('Tyre notes:'));
assert('generic tyre follow-up does not keep old circuit notes', !staleBlock.includes('Phillip Island'));
assert('old circuit would have matched before this guard', trackNotesForQuery(staleHistory[0].content, 'au').includes('Phillip Island'));

const currentTrack = evidenceQueryFromMessages([
  { role: 'user', content: 'rear tyre wear at Phillip Island turn 4' },
]);
assert('current turn still selects current circuit notes', coachEvidenceBlock({ query: currentTrack, packId: 'au' }).includes('Phillip Island'));

const landscape = adviceForQuery({ coach: [], bikesetup: [] }, 'coach', 'the landscape beside the track');
assert('landscape does not trigger apex drill', landscape.drill === '');

const apex = adviceForQuery({ coach: [], bikesetup: [] }, 'coach', 'I keep missing the apex');
assert('apex still triggers apex drill', apex.drill.includes('turn-in'));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll coach evidence query checks passed.');
