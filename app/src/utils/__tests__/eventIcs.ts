/**
 * Run: npx tsx src/utils/__tests__/eventIcs.ts
 */
import {
  buildEventIcs,
  exclusiveEndDate,
  eventIcsFilename,
  normalizeEventDateRange,
  parseYmd,
} from '../eventIcs';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

{
  const ics = buildEventIcs(
    {
      title: 'ASBK: Round 1, Phillip Island',
      startDate: '2026-02-20',
      endDate: '2026-02-22',
      location: 'Phillip Island, Australia',
      description: 'Added from RoadRacer\nhttps://example.com',
      uid: 'test-event@roadracer.app',
    },
    new Date('2026-08-18T10:00:00Z')
  );

  assert('uses CRLF', ics.includes('\r\n') && !ics.split('\r\n').some((line) => line.includes('\n')));
  assert('all-day start', ics.includes('DTSTART;VALUE=DATE:20260220'));
  assert('exclusive DTEND', ics.includes('DTEND;VALUE=DATE:20260223'));
  assert('escapes comma in summary', ics.includes('SUMMARY:ASBK: Round 1\\, Phillip Island'));
  assert('escapes newline in description', ics.includes('DESCRIPTION:Added from RoadRacer\\nhttps://example.com'));
  assert('one-day reminder', ics.includes('TRIGGER:-P1D'));
  assert('stable UID', ics.includes('UID:test-event@roadracer.app'));
  assert('DTSTAMP UTC', ics.includes('DTSTAMP:20260818T100000Z'));
}

{
  assert('same-day exclusive end is next day', exclusiveEndDate('2026-03-01').d === 2);
  assert('parses ISO date locally', parseYmd('2026-08-20').y === 2026 && parseYmd('2026-08-20').d === 20);
  assert('filename slug', eventIcsFilename('ASBK: Round 1') === 'ASBK-Round-1.ics');
}

{
  const dates = normalizeEventDateRange('2026-03-31', '2026-03-01');
  assert('repairs cross-month parser date range', dates.endDate === '2026-04-01');
  const ambiguous = normalizeEventDateRange('2026-03-15', '2026-03-01');
  assert('collapses ambiguous invalid date range', ambiguous.endDate === ambiguous.startDate);
  const ics = buildEventIcs(
    {
      title: 'AU Road Race: State Titles + Easter Cup',
      startDate: '2026-03-31',
      endDate: '2026-03-01',
      uid: 'bad-range@roadracer.app',
    },
    new Date('2026-08-18T10:00:00Z')
  );
  assert('repairs invalid ICS DTEND', ics.includes('DTEND;VALUE=DATE:20260402'));
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll eventIcs tests passed.');
