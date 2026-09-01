/**
 * Run: npx tsx src/storage/__tests__/trackdayPrepCleanup.ts
 */
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { TRACKDAY_PREP_STORAGE_KEYS } from '../trackdayPrep';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const expected = [
  STORAGE_KEYS.TRACK_PREP_SELECTED_TRACK,
  STORAGE_KEYS.TRACKDAY_PREP_DRAFT,
  STORAGE_KEYS.TRACKDAY_PREP_HISTORY,
];

assert(
  'Trackday Prep cleanup includes selected track, draft, and history keys',
  expected.every((key) => TRACKDAY_PREP_STORAGE_KEYS.includes(key)),
  `got ${TRACKDAY_PREP_STORAGE_KEYS.join(', ')}`
);
assert(
  'Trackday Prep cleanup has no duplicate keys',
  new Set(TRACKDAY_PREP_STORAGE_KEYS).size === TRACKDAY_PREP_STORAGE_KEYS.length
);
assert(
  'Trackday Prep cleanup key count matches persisted fields',
  TRACKDAY_PREP_STORAGE_KEYS.length === expected.length,
  `expected ${expected.length}, got ${TRACKDAY_PREP_STORAGE_KEYS.length}`
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll trackdayPrep cleanup tests passed.');
