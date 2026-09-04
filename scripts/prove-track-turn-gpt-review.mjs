#!/usr/bin/env node
/**
 * Prove every Track Details turn has a pending GPT shape / approach / orientation
 * and that UI + answers never say "from the catalog".
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const built = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build-track-turn-gpt-review.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (built.status !== 0) {
  console.error(built.stdout);
  console.error(built.stderr);
  process.exit(1);
}

const inventory = JSON.parse(
  await readFile(path.join(ROOT, 'docs/reviews/track-turn-gpt-review/inventory.json'), 'utf8')
);
const review = JSON.parse(
  await readFile(path.join(ROOT, 'docs/reviews/track-turn-gpt-review/turns.json'), 'utf8')
);

const byId = new Map();
for (const track of review.tracks) {
  for (const turn of track.turns) byId.set(turn.id, turn);
}

let failed = 0;
function fail(msg) {
  failed += 1;
  console.error(`FAIL ${msg}`);
}

if (review.doNotApplyUntilApproved !== true) {
  fail('turns.json must stay pending_owner_review / doNotApplyUntilApproved');
}

for (const track of inventory.tracks) {
  for (const corner of track.turns) {
    const row = byId.get(corner.id);
    if (!row) {
      fail(`missing ${corner.id}`);
      continue;
    }
    for (const field of ['shape', 'approach', 'orientation']) {
      const value = row.proposed?.[field];
      if (!value || !String(value).trim()) fail(`${corner.id} empty proposed.${field}`);
      if (/from the catalog/i.test(String(value))) fail(`${corner.id} ${field} uses forbidden catalog wording`);
    }
    if (!['high', 'medium', 'low'].includes(row.confidence)) {
      fail(`${corner.id} bad confidence ${row.confidence}`);
    }
  }
}

const uiFiles = [
  'app/src/components/TrackCornerSheet.tsx',
  'android-app/src/components/TrackCornerSheet.tsx',
  'app/src/data/tracks.ts',
  'android-app/src/data/tracks.ts',
];
for (const rel of uiFiles) {
  const text = await readFile(path.join(ROOT, rel), 'utf8');
  if (/from the catalog/i.test(text)) fail(`${rel} still says from the catalog`);
  if (rel.endsWith('tracks.ts') && !text.includes('from memory')) {
    fail(`${rel} missing from memory fallback`);
  }
}

if (failed) {
  console.error(`${failed} failure(s)`);
  process.exit(1);
}
console.log(
  `PASS ${inventory.turnCount} Track Details turns have GPT shape/approach/orientation; UI uses from memory.`
);
