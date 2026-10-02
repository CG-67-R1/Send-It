/**
 * Regression tests for high-severity app data bugs.
 * Run from android-app/: npm run test:critical-bugs
 */
import { formatCalendarDateRange, isIsoDateTodayOrFuture } from '../calendarDates';
import { walkNoteForTurn, walkNotesForTrack } from '../trackWalkOnDetails';
import { serializeRiderTrackMarksForWrite } from '../../storage/riderTrackMarks';
import type { TrackWalkSession } from '../../storage/trackWalk';

declare const process: { env: { TZ?: string } };

process.env.TZ = 'America/Los_Angeles';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const localNoonOnOct2 = new Date(2026, 9, 2, 12);
assert(
  'calendar keeps event visible on its local final day',
  isIsoDateTodayOrFuture('2026-10-02', localNoonOnOct2)
);
assert(
  'calendar drops event after its local final day',
  !isIsoDateTodayOrFuture('2026-10-01', localNoonOnOct2)
);
assert(
  'calendar date range formats from local date parts',
  formatCalendarDateRange('2026-10-02', '2026-10-04', 'en-AU') === '2\u20134 Oct 2026'
);

const walkSession: TrackWalkSession = {
  id: 'tw-test',
  dateIso: '2026-10-02',
  trackId: 'brands-hatch',
  trackName: 'Brands Hatch',
  visibility: 'private',
  entries: [
    {
      type: 'corner',
      cornerId: 'brands-hatch_t1',
      cornerNumber: 1,
      text: 'Brake before the bridge.',
    },
  ],
  createdAt: 1,
};

{
  const raw = JSON.stringify({
    mallala: { trackId: 'mallala', corners: [{ id: 'legacy', custom: true }], updatedAt: 1 },
  });
  const serialized = serializeRiderTrackMarksForWrite(
    raw,
    { trackId: 'brands-hatch', corners: [], updatedAt: 0 },
    123
  );
  const parsed = JSON.parse(serialized) as Record<string, { trackId: string; updatedAt: number }>;
  assert('rider mark save preserves other track blobs', parsed.mallala?.trackId === 'mallala');
  assert('rider mark save updates only selected track', parsed['brands-hatch']?.updatedAt === 123);
}

{
  let threw = false;
  try {
    serializeRiderTrackMarksForWrite('[', { trackId: 'brands-hatch', corners: [], updatedAt: 0 }, 123);
  } catch {
    threw = true;
  }
  assert('rider mark save rejects unreadable storage blob', threw);
}

{
  const riderTurn = { id: 'rider_brands-hatch_1', number: 1, baked: false };
  const notes = walkNotesForTrack([walkSession], 'brands-hatch', [riderTurn]);
  assert('map-only rider pin does not inherit catalog note by number', walkNoteForTurn(notes, riderTurn) === null);
  assert('catalog note stays visible as unmatched for map-only pins', notes.unmatchedCorners.length === 1);
}

{
  const bakedTurn = { id: 'brands-hatch_rebaked_t1', number: 1, baked: true };
  const notes = walkNotesForTrack([walkSession], 'brands-hatch', [bakedTurn]);
  assert(
    'baked turn can still use legacy number fallback',
    walkNoteForTurn(notes, bakedTurn) === 'Brake before the bridge.'
  );
}

{
  const riderTurn = { id: 'rider_brands-hatch_1', number: 1, baked: false };
  const riderSession: TrackWalkSession = {
    ...walkSession,
    entries: [{ ...walkSession.entries[0], cornerId: riderTurn.id }],
  };
  const notes = walkNotesForTrack([riderSession], 'brands-hatch', [riderTurn]);
  assert('exact rider-pin ids still match rider notes', walkNoteForTurn(notes, riderTurn) === 'Brake before the bridge.');
}

if (failed > 0) {
  throw new Error(`${failed} critical bug regression test(s) failed`);
}
