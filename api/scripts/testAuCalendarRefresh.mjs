#!/usr/bin/env node
/**
 * Run: node scripts/testAuCalendarRefresh.mjs
 */
import { parseChampionsEndDate } from '../calendarScrapers.js';
import { retainMissingSourceEvents } from './refreshAuCalendar.js';

let failed = 0;

function assert(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert(
  'Champions parser handles DD Mon-DD Mon cross-month range',
  parseChampionsEndDate('Morgan Park Raceway 31 Aug-1 Sept 2026 DOUBLE!!', '2026-08-31') ===
    '2026-09-01'
);
assert(
  'Champions parser handles DD-DD Month range',
  parseChampionsEndDate('Collie Motorplex 12-13 September, 2026 DOUBLE!!', '2026-09-12') ===
    '2026-09-13'
);
assert(
  'Champions parser handles abbreviated DD-DD Month range',
  parseChampionsEndDate('Morgan Park Raceway 16-17 Sept 2026 DOUBLE!!', '2026-09-16') ===
    '2026-09-17'
);
assert(
  'Champions parser handles same-month DD Mon-DD range',
  parseChampionsEndDate('The Bend Motorsport Park 30-31 Oct, 2026 DOUBLE DAY!!', '2026-10-30') ===
    '2026-10-31'
);
assert(
  'Champions parser handles explicit cross-year range',
  parseChampionsEndDate('Example Raceway 31 Dec-1 Jan 2027 DOUBLE!!', '2026-12-31') ===
    '2027-01-01'
);
assert(
  'Champions parser keeps single-day titles unchanged',
  parseChampionsEndDate('Broadford Raceway', '2026-09-11') === '2026-09-11'
);

const errors = [];
const retained = retainMissingSourceEvents(
  [{ name: 'Current A', start_date: '2099-09-10', source_id: 'source_a' }],
  [
    { name: 'Old B', start_date: '2026-08-01', end_date: '2026-08-01', source_id: 'source_b' },
    { name: 'Future B', start_date: '2099-09-20', end_date: '2099-09-21', source_id: 'source_b' },
  ],
  {
    sources: [
      { id: 'source_a', type: 'club_calendar' },
      { id: 'source_b', type: 'club_calendar' },
      { id: 'directory_only', type: 'club_directory_reference' },
    ],
  },
  errors
);

assert(
  'retention keeps previous upcoming events when a configured source returns empty',
  retained.some((ev) => ev.name === 'Future B') && !retained.some((ev) => ev.name === 'Old B')
);
assert(
  'retention records an operator-visible source error',
  errors.some((msg) => msg.includes('source_b') && msg.includes('retained 1 previous cache event'))
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll AU calendar refresh tests passed.');
