/**
 * Run: node scripts/testCalendarDateRange.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEventDateRange } from '../calendarScrapers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.join(__dirname, '..', 'data', 'au-road-race-events.json');

assert.deepEqual(
  normalizeEventDateRange('2026-03-31', '2026-03-01'),
  { start_date: '2026-03-31', end_date: '2026-04-01' },
  'repairs same-month parser output for cross-month date ranges'
);
assert.deepEqual(
  normalizeEventDateRange('2026-03-15', '2026-03-01'),
  { start_date: '2026-03-15', end_date: '2026-03-15' },
  'collapses ambiguous invalid ranges to a one-day event'
);

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const invalidEvents = (cache.events || []).filter((event) => {
  const dates = normalizeEventDateRange(event.start_date, event.end_date);
  return dates.end_date < dates.start_date;
});

assert.equal(invalidEvents.length, 0, 'calendar cache must not emit events ending before they start');

console.log('All calendar date-range tests passed.');
