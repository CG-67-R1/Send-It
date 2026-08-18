/**
 * One-off sanity check: does a positive turn rate mean a right-hand turn?
 *
 * Aligns verified hands against the geometry both ways round. The convention
 * that satisfies more human-verified hands is the correct one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alignCornersToEvents,
  expandCornerSlots,
  scoreAlignment,
  turnEvents,
} from './lib/track-geometry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layoutDir = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'app', 'src', 'data', 'tracks.json'), 'utf8'));
const verif = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json'), 'utf8')
);

let asIs = { checked: 0, agreed: 0 };
let flipped = { checked: 0, agreed: 0 };

for (const trackId of Object.keys(verif.verifiedHands || {})) {
  const file = path.join(layoutDir, `${trackId}.json`);
  if (!fs.existsSync(file)) continue;
  const layout = JSON.parse(fs.readFileSync(file, 'utf8'));
  const track = catalog.tracks.find((t) => t.id === trackId);
  if (!track) continue;

  const events = turnEvents(layout.points, layout.lengthM);
  const { slots } = expandCornerSlots(track.corners, verif.verifiedHands[trackId]);

  const a = alignCornersToEvents(slots, events);
  const flipEvents = events.map((e) => ({ ...e, hand: e.hand === 'left' ? 'right' : 'left' }));
  const b = alignCornersToEvents(slots, flipEvents);

  const sa = a ? scoreAlignment(slots, a.pairs) : { checked: 0, agreed: 0 };
  const sb = b ? scoreAlignment(slots, b.pairs) : { checked: 0, agreed: 0 };
  asIs.checked += sa.checked;
  asIs.agreed += sa.agreed;
  flipped.checked += sb.checked;
  flipped.agreed += sb.agreed;
  console.log(
    `${trackId.padEnd(24)} as-is ${sa.agreed}/${sa.checked} (cost ${a ? a.cost.toFixed(1) : '-'})` +
      `   flipped ${sb.agreed}/${sb.checked} (cost ${b ? b.cost.toFixed(1) : '-'})`
  );
}

console.log(`\nTOTAL as-is ${asIs.agreed}/${asIs.checked}   flipped ${flipped.agreed}/${flipped.checked}`);
console.log(
  asIs.agreed >= flipped.agreed
    ? 'positive turn rate = RIGHT hand (convention as written is correct)'
    : 'CONVENTION IS INVERTED — positive turn rate is a LEFT hand'
);
