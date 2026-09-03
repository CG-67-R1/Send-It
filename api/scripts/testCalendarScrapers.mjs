/**
 * Calendar scraper date normalization checks.
 * Run: node scripts/testCalendarScrapers.mjs
 */
import { resolveIcsDateRange } from '../calendarScrapers.js';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const raceWeekend = resolveIcsDateRange('20260626', '20260629');
assert('race weekend parses start', raceWeekend?.start_date === '2026-06-26');
assert('race weekend keeps inclusive end', raceWeekend?.end_date === '2026-06-28');
assert('race weekend is not placeholder', raceWeekend?.isMonthPlaceholder === false);

const monthPlaceholder = resolveIcsDateRange('20270201', '20270301');
assert('month placeholder parses start', monthPlaceholder?.start_date === '2027-02-01');
assert('month placeholder collapses end to start', monthPlaceholder?.end_date === '2027-02-01');
assert('month placeholder is flagged', monthPlaceholder?.isMonthPlaceholder === true);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll calendar scraper tests passed');
