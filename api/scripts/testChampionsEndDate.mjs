/**
 * Champions Ride Days multi-day titles must keep the last day.
 *
 * Usage: node api/scripts/testChampionsEndDate.mjs
 * Exit 0 on pass, 1 on fail.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseChampionsEndDate } from '../calendarScrapers.js';

const cachePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'au-road-race-events.json'
);

let failed = 0;

function assert(label, cond) {
  if (cond) {
    console.log(`OK   ${label}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${label}`);
}

assert(
  '30-31 Oct keeps 31 October',
  parseChampionsEndDate('The Bend Motorsport Park 30-31 Oct, 2026 DOUBLE DAY!!', '2026-10-30') ===
    '2026-10-31'
);
assert(
  '2-3 November keeps 3 November',
  parseChampionsEndDate('Morgan Park Raceway 2-3 November 2026 DOUBLE!!', '2026-11-02') ===
    '2026-11-03'
);
assert(
  '20-22 November keeps 22 November, not the next day only',
  parseChampionsEndDate(
    'Morgan Park Raceway 20-22 November, 2026 TRIPLE WEEKEND!!',
    '2026-11-20'
  ) === '2026-11-22'
);
assert(
  '30 Oct-31 keeps 31 October',
  parseChampionsEndDate('The Bend 30 Oct-31', '2026-10-30') === '2026-10-31'
);
assert(
  '20 Nov-22 keeps 22 November',
  parseChampionsEndDate('Morgan Park 20 Nov-22', '2026-11-20') === '2026-11-22'
);
assert(
  'a one-day title stays on the start date',
  parseChampionsEndDate('The Bend Motorsport Park', '2026-10-30') === '2026-10-30'
);
assert(
  'an end day before the start is not invented',
  parseChampionsEndDate('Broadford 15-10 Oct', '2026-10-15') === '2026-10-15'
);

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const champions = (cache.events || []).filter(
  (event) => event.source_id === 'club_au_champions_ride_days'
);
const truncated = champions.filter((event) => {
  const end = parseChampionsEndDate(event.name, event.start_date);
  return end && end > (event.end_date || event.start_date);
});
assert(
  'cached Champions events include the last day from the title',
  truncated.length === 0
);
if (truncated.length) {
  for (const event of truncated) {
    console.error(
      `  ${event.name}: ${event.start_date}..${event.end_date} should end ${parseChampionsEndDate(event.name, event.start_date)}`
    );
  }
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('All Champions end-date tests passed.');
