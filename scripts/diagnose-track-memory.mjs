/**
 * Audit baked Track Memory layouts against their own geometry.
 *
 * Usage: node scripts/diagnose-track-memory.mjs [trackId]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alignCornersToEvents,
  expandCornerSlots,
  findKinks,
  handAt,
  longestStraight,
  scoreAlignment,
  turnEvents,
} from './lib/track-geometry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAYOUT_DIR = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');

const only = process.argv[2];
const files = fs
  .readdirSync(LAYOUT_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json`);

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'src', 'data', 'tracks.json'), 'utf8'));
const verifiedDoc = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json'), 'utf8')
);

let totalMismatch = 0;
let totalKinks = 0;
let totalHandMiss = 0;

for (const file of files) {
  const layout = JSON.parse(fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8'));
  const { points, lengthM, corners } = layout;
  const kinks = findKinks(points, 14);
  const events = turnEvents(points, lengthM);
  const straight = longestStraight(points, lengthM);
  const track = catalog.tracks.find((t) => t.id === layout.trackId);
  const hands = verifiedDoc.verifiedHands?.[layout.trackId] ?? {};
  const { playable, slots } = expandCornerSlots(track?.corners ?? [], hands);
  const alignment = alignCornersToEvents(slots, events);
  const score = alignment ? scoreAlignment(slots, alignment.pairs) : { checked: 0, agreed: 0 };

  const named = corners.filter((c) => c.number != null);
  const mismatches = [];
  for (const c of named) {
    if (c.direction !== 'left' && c.direction !== 'right') continue;
    const got = handAt(points, lengthM, c.sNorm);
    if (got !== c.direction) {
      mismatches.push(`${c.label}@${c.sNorm.toFixed(3)} wants ${c.direction} got ${got}`);
    }
  }

  totalMismatch += mismatches.length;
  totalKinks += kinks.length;
  totalHandMiss += score.checked - score.agreed;

  console.log(`\n=== ${layout.trackId}  ${Math.round(lengthM)}m  ${points.length}pts  src ${layout.sourceGpx || '?'}`);
  console.log(
    `  corners: catalog ${named.length}, geometry ${events.length} turns` +
      `  (${events.map((e) => e.hand[0].toUpperCase()).join('')})`
  );
  console.log(
    `  verified hands ${score.agreed}/${score.checked}` +
      (score.checked && score.agreed < score.checked ? '  MISS' : '')
  );
  if (score.checked && score.agreed < score.checked) {
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i].hand) continue;
      const ev = alignment?.pairs.get(i);
      if (ev && ev.hand === slots[i].hand) continue;
      const c = playable[slots[i].cornerIndex];
      console.log(
        `     T${c.number} want ${slots[i].hand} got ${ev ? ev.hand + '@' + ev.sNorm.toFixed(3) : 'UNMATCHED'}`
      );
    }
  }
  if (mismatches.length) {
    console.log(`  BAKED STATION MISMATCH (${mismatches.length}):`);
    for (const m of mismatches) console.log(`     ${m}`);
  }
  console.log(
    `  longest straight ${Math.round(straight.lenM)}m starting s=${(straight.startI / points.length).toFixed(3)}`
  );
  if (kinks.length) {
    console.log(
      `  KINKS ${kinks.length}: ` +
        kinks.map((k) => `s=${k.sNorm.toFixed(3)}(${Math.round(k.deg)}deg)`).join(' ')
    );
  }
}

console.log(
  `\nTOTAL baked-station mismatches ${totalMismatch}, verified-hand misses ${totalHandMiss}, kinks14 ${totalKinks} across ${files.length} layouts`
);
