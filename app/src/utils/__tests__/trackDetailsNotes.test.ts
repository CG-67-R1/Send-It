import { getTrackDetailsCorners, getTrackDetailsLayoutRevision } from '../../data/trackDetailsCorners';
import type { TrackWalkSession } from '../../storage/trackWalk';
import { findLatestTrackDetailsNote } from '../trackDetailsNotes';

function assert(name: string, pass: boolean, detail?: string): void {
  if (!pass) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
}

function assertEqual<T>(name: string, actual: T, expected: T): void {
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertDeepEqual<T>(name: string, actual: T, expected: T): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${name}: expected ${b}, got ${a}`);
}

function session(trackId: string, entries: TrackWalkSession['entries']): TrackWalkSession {
  return {
    id: `test-${trackId}`,
    dateIso: '2026-09-09',
    trackId,
    trackName: trackId,
    visibility: 'private',
    entries,
    createdAt: Date.parse('2026-09-09T00:00:00Z'),
  };
}

function currentIds(trackId: string): Set<string> {
  const layout = getTrackDetailsCorners(trackId);
  assert(`${trackId} layout exists`, Boolean(layout));
  return new Set(layout!.corners.map((c) => c.id));
}

{
  const trackId = 'mallala';
  const layout = getTrackDetailsCorners(trackId);
  const revision = getTrackDetailsLayoutRevision(trackId);
  assert(`${trackId} layout exists`, Boolean(layout));
  assert(`${trackId} revision exists`, Boolean(revision));

  const match = findLatestTrackDetailsNote(
    [
      session(trackId, [
        {
          type: 'corner',
          cornerId: layout!.corners[1].id,
          cornerNumber: layout!.corners[1].number,
          text: 'Brake marker was saved before the rebake.',
        },
      ]),
    ],
    trackId,
    layout!.corners[1],
    currentIds(trackId),
    revision
  );

  assertEqual('rebaked legacy exact id is not pinned', match.savedNote, null);
  assertDeepEqual('rebaked legacy exact id is unpinned', match.unpinnedNotes, [
    'T2: Brake marker was saved before the rebake.',
  ]);
}

{
  const trackId = 'mallala';
  const layout = getTrackDetailsCorners(trackId);
  const revision = getTrackDetailsLayoutRevision(trackId);
  assert(`${trackId} layout exists`, Boolean(layout));
  assert(`${trackId} revision exists`, Boolean(revision));

  const match = findLatestTrackDetailsNote(
    [
      session(trackId, [
        {
          type: 'corner',
          cornerId: layout!.corners[1].id,
          cornerNumber: layout!.corners[1].number,
          trackDetailsLayoutRevision: revision,
          text: 'Current note is pinned to this map revision.',
        },
      ]),
    ],
    trackId,
    layout!.corners[1],
    currentIds(trackId),
    revision
  );

  assertEqual(
    'revision-stamped note is pinned',
    match.savedNote,
    'Current note is pinned to this map revision.'
  );
  assertDeepEqual('revision-stamped note has no unpinned notes', match.unpinnedNotes, []);
}

{
  const trackId = 'phillip_island';
  const layout = getTrackDetailsCorners(trackId);
  const revision = getTrackDetailsLayoutRevision(trackId);
  assert(`${trackId} layout exists`, Boolean(layout));
  assert(`${trackId} revision exists`, Boolean(revision));

  const match = findLatestTrackDetailsNote(
    [
      session(trackId, [
        {
          type: 'corner',
          cornerId: layout!.corners[0].id,
          cornerNumber: layout!.corners[0].number,
          text: 'Legacy note remains safe on unchanged maps.',
        },
      ]),
    ],
    trackId,
    layout!.corners[0],
    currentIds(trackId),
    revision
  );

  assertEqual(
    'unchanged-map legacy note remains pinned',
    match.savedNote,
    'Legacy note remains safe on unchanged maps.'
  );
  assertDeepEqual('unchanged-map legacy note has no unpinned notes', match.unpinnedNotes, []);
}

{
  const trackId = 'wanneroo';
  const layout = getTrackDetailsCorners(trackId);
  const revision = getTrackDetailsLayoutRevision(trackId);
  assert(`${trackId} layout exists`, Boolean(layout));
  assert(`${trackId} revision exists`, Boolean(revision));

  const match = findLatestTrackDetailsNote(
    [
      session(trackId, [
        {
          type: 'corner',
          cornerId: 'wanneroo_t7',
          cornerNumber: 7,
          trackDetailsLayoutRevision: 'gpx-old',
          text: 'Old turn no longer exists in Track Details.',
        },
      ]),
    ],
    trackId,
    layout!.corners[0],
    currentIds(trackId),
    revision
  );

  assertEqual('removed old turn is not pinned', match.savedNote, null);
  assertDeepEqual('removed old turn is unpinned', match.unpinnedNotes, [
    'T7: Old turn no longer exists in Track Details.',
  ]);
}

{
  const trackId = 'wanneroo';
  const layout = getTrackDetailsCorners(trackId);
  const revision = getTrackDetailsLayoutRevision(trackId);
  assert(`${trackId} layout exists`, Boolean(layout));
  assert(`${trackId} revision exists`, Boolean(revision));

  const match = findLatestTrackDetailsNote(
    [
      session(trackId, [
        {
          type: 'corner',
          cornerId: layout!.corners[0].id,
          cornerNumber: layout!.corners[0].number,
          trackDetailsLayoutRevision: revision,
          text: 'Current T1 note.',
        },
        {
          type: 'corner',
          cornerId: 'wanneroo_t7',
          cornerNumber: 7,
          trackDetailsLayoutRevision: 'gpx-old',
          text: 'Removed turn note still needs review.',
        },
      ]),
    ],
    trackId,
    layout!.corners[0],
    currentIds(trackId),
    revision
  );

  assertEqual('current note still pins with unpinned old notes present', match.savedNote, 'Current T1 note.');
  assertDeepEqual('removed note remains visible alongside current note', match.unpinnedNotes, [
    'T7: Removed turn note still needs review.',
  ]);
}
