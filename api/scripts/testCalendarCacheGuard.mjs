/**
 * AU calendar refresh must not replace a populated cache with a failed scrape.
 *
 * Usage: node api/scripts/testCalendarCacheGuard.mjs
 * Exit 0 on pass, 1 on fail.
 */
import { calendarRefreshWouldWipeCache } from './refreshAuCalendar.js';

let failed = 0;

function assert(label, cond) {
  if (cond) {
    console.log(`OK   ${label}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${label}`);
}

assert('empty scrape does not wipe 76 events', calendarRefreshWouldWipeCache(76, 0));
assert(
  'losing the Champions source (76 → 36) is a wipe',
  calendarRefreshWouldWipeCache(76, 36)
);
assert(
  'a smaller source outage (76 → 54) still publishes',
  !calendarRefreshWouldWipeCache(76, 54)
);
assert('exactly half of a large cache still publishes', !calendarRefreshWouldWipeCache(76, 38));
assert('first run with no cache can write an empty file', !calendarRefreshWouldWipeCache(0, 0));
assert('first successful run can write', !calendarRefreshWouldWipeCache(0, 12));
assert('a non-numeric next count is a wipe', calendarRefreshWouldWipeCache(76, Number.NaN));

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('calendar cache guard ok');
