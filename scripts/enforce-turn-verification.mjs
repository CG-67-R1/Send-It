#!/usr/bin/env node
/**
 * Apply track_turn_verification.json to tracks.json.
 * Unverified left|right → complex. Verified hands applied exactly.
 * Usage: node scripts/enforce-turn-verification.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACKS_PATH = path.join(ROOT, 'app/src/data/tracks.json');
const VERIFY_PATH = path.join(ROOT, 'app/src/data/track_turn_verification.json');
const write = process.argv.includes('--write');

const catalog = JSON.parse(fs.readFileSync(TRACKS_PATH, 'utf8'));
const policy = JSON.parse(fs.readFileSync(VERIFY_PATH, 'utf8'));
const forceAll = new Set(policy.forceAllComplex || []);
const verifiedHands = policy.verifiedHands || {};
const trackDir = policy.trackDirection || {};
const lengthKm = policy.lengthKm || {};
const changes = [];

for (const track of catalog.tracks) {
  if (trackDir[track.id] && track.direction !== trackDir[track.id]) {
    changes.push(`${track.id}: direction ${track.direction} → ${trackDir[track.id]}`);
    track.direction = trackDir[track.id];
  }
  if (lengthKm[track.id] && track.lengthKm !== lengthKm[track.id]) {
    changes.push(`${track.id}: lengthKm ${track.lengthKm} → ${lengthKm[track.id]}`);
    track.lengthKm = lengthKm[track.id];
  }

  const verified = verifiedHands[track.id] || {};
  const wipeAll = forceAll.has(track.id);

  for (const c of track.corners) {
    if (c.isFinish || c.number == null) continue;
    const key = String(c.number);
    const want = wipeAll ? null : verified[key];
    if (want) {
      if (c.direction !== want) {
        changes.push(`${track.id} T${c.number}: ${c.direction} → ${want} (verified)`);
        c.direction = want;
      }
    } else if (c.direction === 'left' || c.direction === 'right') {
      changes.push(`${track.id} T${c.number}: ${c.direction} → complex (unverified)`);
      c.direction = 'complex';
    }
  }
}

// Bathurst T1 = Hell Corner (right) when present
const bath = catalog.tracks.find((t) => t.id === 'mount_panorama');
if (bath) {
  const t1 = bath.corners.find((c) => c.number === 1);
  const hellElsewhere = bath.corners.find((c) => c.number !== 1 && /hell/i.test(c.label || ''));
  if (t1) {
    if (t1.label !== 'Hell Corner' || t1.direction !== 'right') {
      changes.push('mount_panorama T1 → Hell Corner (right)');
      t1.label = 'Hell Corner';
      t1.shape = 'Hairpin';
      t1.direction = 'right';
    }
  }
  if (hellElsewhere) {
    changes.push(`mount_panorama T${hellElsewhere.number}: demote duplicate Hell Corner label`);
    hellElsewhere.label = `Turn ${hellElsewhere.number}`;
    hellElsewhere.direction = 'complex';
  }
}

console.log(write ? 'WRITE mode' : 'DRY-RUN (pass --write to apply)');
console.log(`Changes: ${changes.length}`);
for (const line of changes) console.log(' ', line);

if (write) {
  fs.writeFileSync(TRACKS_PATH, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Wrote ${TRACKS_PATH}`);
}
