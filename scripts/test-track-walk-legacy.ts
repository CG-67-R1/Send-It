import assert from 'node:assert/strict';
import { normalizeTrackWalkSessionForStorage as normalizeAppSession } from '../app/src/storage/trackWalk';
import { normalizeTrackWalkSessionForStorage as normalizeAndroidSession } from '../android-app/src/storage/trackWalk';

type Normalizer = typeof normalizeAppSession;

const beforeGardnersSplit = Date.parse('2026-09-02T04:24:29.000Z');
const afterGardnersSplit = Date.parse('2026-09-02T04:24:31.000Z');

function rawPhillipIslandSession(createdAt: number, cornerLabel: string) {
  return {
    id: `session_${createdAt}_${cornerLabel}`,
    dateIso: '2026-09-02',
    trackId: 'phillip_island',
    trackName: 'Phillip Island Grand Prix Circuit',
    visibility: 'private',
    createdAt,
    entries: [
      {
        type: 'corner',
        cornerId: 'phillip_island_t11',
        cornerNumber: 11,
        cornerLabel,
        direction: 'complex',
        text: 'Keep eyes up on exit.',
      },
    ],
  };
}

function runSuite(name: string, normalize: Normalizer) {
  const defaultLegacy = normalize(
    rawPhillipIslandSession(beforeGardnersSplit, "Turn 11 (Gardner's)")
  ).entries[0];
  assert.equal(defaultLegacy.cornerId, 'phillip_island_t12', `${name}: default legacy Gardner's ID migrates`);
  assert.equal(defaultLegacy.cornerNumber, 12, `${name}: default legacy Gardner's number migrates`);
  assert.equal(defaultLegacy.cornerLabel, "Gardner's", `${name}: default legacy Gardner's label migrates`);

  const customLegacy = normalize(rawPhillipIslandSession(beforeGardnersSplit, 'Fast exit')).entries[0];
  assert.equal(customLegacy.cornerId, 'phillip_island_t12', `${name}: pre-split custom notes migrate`);
  assert.equal(customLegacy.cornerNumber, 12, `${name}: pre-split custom note number migrates`);
  assert.equal(customLegacy.cornerLabel, 'Fast exit', `${name}: pre-split custom nickname is preserved`);

  const currentTurn11 = normalize(rawPhillipIslandSession(afterGardnersSplit, 'Turn 11')).entries[0];
  assert.equal(currentTurn11.cornerId, 'phillip_island_t11', `${name}: current Turn 11 ID is preserved`);
  assert.equal(currentTurn11.cornerNumber, 11, `${name}: current Turn 11 number is preserved`);
  assert.equal(currentTurn11.cornerLabel, 'Turn 11', `${name}: current Turn 11 label is preserved`);
}

runSuite('app', normalizeAppSession);
runSuite('android-app', normalizeAndroidSession);

console.log('All Track Walk legacy normalization checks passed');
