/**
 * One-off audit: catalog corners vs bake sNorm vs geometry turn events.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alignCornersToEvents,
  expandCornerSlots,
  longestStraight,
  turnEvents,
} from './lib/track-geometry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/src/data/tracks.json'), 'utf8'));
const verified = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'app/src/data/track_turn_verification.json'), 'utf8')
);

const ids = process.argv.slice(2);
const tracks = ids.length ? catalog.tracks.filter((t) => ids.includes(t.id)) : catalog.tracks;

for (const t of tracks) {
  const bakePath = path.join(ROOT, 'app/src/data/trackMemory', `${t.id}.json`);
  if (!fs.existsSync(bakePath)) continue;
  const bake = JSON.parse(fs.readFileSync(bakePath, 'utf8'));
  const events = turnEvents(bake.points, bake.lengthM);
  const straight = longestStraight(bake.points, bake.lengthM);
  const hands = verified.verifiedHands?.[t.id] ?? {};
  const { playable, slots } = expandCornerSlots(t.corners, hands);
  const alignment = alignCornersToEvents(slots, events);
  const t1 = playable[0];
  const bakeT1 = bake.corners.find((c) => c.number === t1?.number);

  console.log(`\n=== ${t.id}`);
  console.log(
    `  T1 catalog #${t1?.number} bake s=${bakeT1?.sNorm?.toFixed(3)}  longestStraight ${Math.round(straight.lenM)}m startI=${straight.startI}`
  );
  if (alignment) {
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i].primary) continue;
      const c = playable[slots[i].cornerIndex];
      const ev = alignment.pairs.get(i);
      const b = bake.corners.find((x) => x.id === c.id);
      const ds = ev && b ? Math.abs(ev.sNorm - b.sNorm).toFixed(3) : 'n/a';
      const flag = ev && b && Math.abs(ev.sNorm - b.sNorm) > 0.04 ? ' SHIFT' : '';
      console.log(
        `  T${c.number} bake=${b?.sNorm?.toFixed(3)} geom=${ev ? ev.sNorm.toFixed(3) + ' ' + ev.hand : 'UNMATCHED'} ds=${ds}${flag}`
      );
    }
  } else {
    console.log('  no alignment');
  }
}
