/**
 * UK Events must keep the official BSB link once every dated round has finished.
 *
 * Usage: node scripts/testUkCalendarPointers.mjs
 * Exit 0 on pass, 1 on fail.
 */
import {
  bsbPointerUnlessCurrentRounds,
  getCalendarEvents,
  utcTodayIso,
} from '../calendar.js';

let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`OK   ${label}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${label}`);
}

const pointer = {
  series: 'bsb',
  title: 'ZYN British Superbike Championship',
  startDate: '',
  endDate: '',
};
const other = {
  series: 'isle_of_man_tt',
  title: 'Isle of Man TT',
  startDate: '',
  endDate: '',
};
const finale = {
  series: 'bsb',
  title: 'Round 11 – Brands Hatch GP',
  startDate: '2026-10-16',
  endDate: '2026-10-18',
};

const duringFinale = bsbPointerUnlessCurrentRounds([pointer, other], [finale], '2026-10-18');
assert(
  'an ongoing BSB round hides the official-calendar pointer',
  !duringFinale.some((ev) => ev.series === 'bsb')
);
assert(
  'other official calendars stay while BSB is on',
  duringFinale.some((ev) => ev.series === 'isle_of_man_tt')
);

const afterSeason = bsbPointerUnlessCurrentRounds([pointer, other], [finale], '2026-10-30');
assert(
  'a finished BSB season puts the official calendar back',
  afterSeason.some((ev) => ev.series === 'bsb' && ev.title === pointer.title)
);

const events = await getCalendarEvents(true, 'uk');
const today = utcTodayIso();
const currentBsb = events.filter((ev) => {
  if (ev.series !== 'bsb' || !ev.startDate) return false;
  return (ev.endDate || ev.startDate) >= today;
});
const bsbLinks = events.filter((ev) => ev.series === 'bsb' && !ev.startDate);
assert(
  currentBsb.length
    ? 'upcoming BSB rounds are not duplicated by the official-calendar link'
    : 'with no upcoming BSB round, Events still has the official calendar link',
  currentBsb.length ? bsbLinks.length === 0 : bsbLinks.length === 1
);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('uk calendar pointers ok');
