/**
 * Calendar regression tests for high-severity refresh/cache bugs.
 * Run: node scripts/testCalendarRegression.mjs
 */
import { getCalendarEvents } from '../calendar.js';
import { filterByCatalogPeriod } from '../calendarScrapers.js';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const sourceConfig = {
  meta: {
    period: {
      start_date: '2026-02-24',
      end_date: '2027-02-23',
    },
  },
};

const filtered = filterByCatalogPeriod(
  [
    { name: 'stale past event', start_date: '2026-07-01' },
    { name: 'next season round', start_date: '2027-03-19' },
  ],
  sourceConfig,
  new Date('2026-09-05T12:00:00Z')
);

assert(
  'catalog filter keeps future events beyond static period end',
  filtered.some((ev) => ev.name === 'next season round')
);
assert(
  'catalog filter still drops stale past events',
  !filtered.some((ev) => ev.name === 'stale past event')
);

const knownWorldsbk = [
  {
    series: 'worldsbk',
    seriesLabel: 'WorldSBK',
    title: 'Known WorldSBK Round',
    venue: 'Known Circuit',
    country: 'AU',
    startDate: '2026-09-01',
    endDate: '2026-09-03',
    url: 'https://www.worldsbk.com/en/calendar-e-circuits.html',
    detailTier: 'summary',
  },
];

const primed = await getCalendarEvents(true, {
  fetchWorldSBK: async () => knownWorldsbk,
});
assert(
  'calendar cache can be primed with WorldSBK events',
  primed.some((ev) => ev.series === 'worldsbk' && ev.title === 'Known WorldSBK Round')
);

const afterFailure = await getCalendarEvents(true, {
  fetchWorldSBK: async () => null,
});
assert(
  'WorldSBK fetch failure keeps previous cached series events',
  afterFailure.some((ev) => ev.series === 'worldsbk' && ev.title === 'Known WorldSBK Round')
);

const cached = await getCalendarEvents(false, {
  fetchWorldSBK: async () => {
    throw new Error('valid cache should avoid a fresh fetch');
  },
});
assert(
  'normal calendar reads use the retained cache after a failed refresh',
  cached.some((ev) => ev.series === 'worldsbk' && ev.title === 'Known WorldSBK Round')
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll calendar regression tests passed');
