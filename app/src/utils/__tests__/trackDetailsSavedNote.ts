/**
 * Run: npx tsx src/utils/__tests__/trackDetailsSavedNote.ts
 */
import {
  latestTrackDetailsCornerNote,
  shouldApplyTrackDetailsSavedNote,
  type TrackDetailsSavedNoteSelection,
} from '../trackDetailsSavedNote';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const sessions = [
  {
    trackId: 'phillip_island',
    createdAt: 100,
    entries: [
      { type: 'corner', cornerId: 'phillip_island-t1', text: ' old note ' },
      { type: 'corner', cornerId: 'phillip_island-t2', text: '   ' },
    ],
  },
  {
    trackId: 'phillip_island',
    createdAt: 200,
    entries: [{ type: 'corner', cornerId: 'phillip_island-t1', text: 'latest note' }],
  },
  {
    trackId: 'smp_gardner',
    createdAt: 300,
    entries: [{ type: 'corner', cornerId: 'phillip_island-t1', text: 'wrong track' }],
  },
];

assert(
  'latest note is picked for the requested track/corner',
  latestTrackDetailsCornerNote(sessions, 'phillip_island', 'phillip_island-t1') === 'latest note'
);
assert(
  'blank corner notes are ignored',
  latestTrackDetailsCornerNote(sessions, 'phillip_island', 'phillip_island-t2') === null
);
assert(
  'notes from another track are ignored',
  latestTrackDetailsCornerNote(sessions, 'smp_gardner', 'smp_gardner-t1') === null
);

const firstRequest: TrackDetailsSavedNoteSelection = {
  requestId: 1,
  trackId: 'phillip_island',
  cornerId: 'phillip_island-t1',
};
const secondRequest: TrackDetailsSavedNoteSelection = {
  requestId: 2,
  trackId: 'phillip_island',
  cornerId: 'phillip_island-t2',
};

assert(
  'current request may apply its note',
  shouldApplyTrackDetailsSavedNote(secondRequest, secondRequest)
);
assert(
  'slower previous corner request is rejected',
  !shouldApplyTrackDetailsSavedNote(firstRequest, secondRequest)
);
assert(
  'request from previous track is rejected',
  !shouldApplyTrackDetailsSavedNote(secondRequest, {
    requestId: 3,
    trackId: 'smp_gardner',
    cornerId: 'smp_gardner-t1',
  })
);
assert(
  'closed sheet rejects a late note response',
  !shouldApplyTrackDetailsSavedNote(secondRequest, {
    requestId: 3,
    trackId: 'phillip_island',
    cornerId: null,
  })
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll trackDetailsSavedNote tests passed');
