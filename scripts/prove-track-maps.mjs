/**
 * Proof gate for Track Details maps.
 *
 * A layout may be baked or rebuilt only when mapProof.json status is
 * owner_verified. Until then this script exits 1 and prints what to retrieve.
 *
 * Usage:
 *   node scripts/prove-track-maps.mjs
 *   node scripts/prove-track-maps.mjs phillip_island
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alignCornersToEvents,
  expandCornerSlots,
  turnEvents,
} from './lib/track-geometry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROOF_PATH = path.join(ROOT, 'app/src/data/trackInfo/mapProof.json');
const CATALOG_PATH = path.join(ROOT, 'app/src/data/tracks.json');
const VERIFY_PATH = path.join(ROOT, 'app/src/data/track_turn_verification.json');
const BAKE_DIR = path.join(ROOT, 'app/src/data/trackMemory');
const MAP_DIR = path.join(ROOT, 'app/src/data/trackInfo/maps');

const only = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;

function numberedCorners(track) {
  return (track.corners || []).filter((c) => c.number != null);
}

function alignmentIssues(track, bake, verifiedHands) {
  const events = turnEvents(bake.points, bake.lengthM);
  const hands = verifiedHands?.[track.id] ?? {};
  const { playable, slots } = expandCornerSlots(track.corners, hands);
  const alignment = alignCornersToEvents(slots, events);
  const issues = [];
  if (!alignment) {
    issues.push('geometry could not align catalog slots to turn events');
    return issues;
  }
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].primary) continue;
    const c = playable[slots[i].cornerIndex];
    const ev = alignment.pairs.get(i);
    const b = bake.corners.find((x) => x.id === c.id);
    if (!ev) {
      issues.push(`T${c.number} UNMATCHED (no geometry turn)`);
      continue;
    }
    if (b && Math.abs(ev.sNorm - b.sNorm) > 0.04) {
      issues.push(
        `T${c.number} SHIFT bake=${b.sNorm.toFixed(3)} geom=${ev.sNorm.toFixed(3)} (${ev.hand})`
      );
    }
  }
  return issues;
}

function pitIsHeuristic(map) {
  const pits = (map.derivedInfra || []).filter((f) =>
    ['pit_lane', 'pit_entry', 'pit_exit'].includes(f.kind)
  );
  return pits.length > 0;
}

const proof = JSON.parse(fs.readFileSync(PROOF_PATH, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const verified = JSON.parse(fs.readFileSync(VERIFY_PATH, 'utf8'));

const bakeIds = fs
  .readdirSync(BAKE_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((id) => !only || id === only);

if (only && !bakeIds.includes(only)) {
  console.error(` FAIL no bake for ${only}`);
  process.exit(1);
}

const failures = [];
const retrieve = [];

console.log('Track Details map proof');
console.log(`Repo: ${ROOT}`);
console.log(proof.rule);
console.log('');

for (const id of bakeIds) {
  const track = catalog.tracks.find((t) => t.id === id);
  const entry = proof.layouts?.[id];
  const mapPath = path.join(MAP_DIR, `${id}.json`);
  const bake = JSON.parse(fs.readFileSync(path.join(BAKE_DIR, `${id}.json`), 'utf8'));
  const dots = track ? numberedCorners(track).length : 0;
  const live = track ? alignmentIssues(track, bake, verified.verifiedHands) : ['missing catalog row'];
  const lines = [];

  if (!entry) {
    lines.push('no mapProof.json entry');
  } else if (entry.status !== 'owner_verified') {
    lines.push(`status=${entry.status} (not owner_verified)`);
    if (entry.publishedBoardCount != null && dots !== entry.publishedBoardCount) {
      lines.push(
        `catalog dots ${dots} vs published boards ${entry.publishedBoardCount}`
      );
    }
    if (entry.pitPlacement === 'unverified_heuristic') {
      lines.push('pit entry/lane/exit invented at s=0.97–0.02, not from a venue map');
    }
    for (const item of entry.retrieve || []) retrieve.push(`${id}: ${item}`);
  } else {
    if (entry.ownerBoardCount == null || !entry.ownerBoardSource) {
      lines.push('owner_verified but missing ownerBoardCount / ownerBoardSource');
    } else if (dots !== entry.ownerBoardCount) {
      lines.push(`catalog dots ${dots} != ownerBoardCount ${entry.ownerBoardCount}`);
    }
    if (!entry.pitVerified) {
      lines.push('owner_verified but pitVerified is not true');
    }
  }

  if (!fs.existsSync(mapPath)) {
    lines.push('compact map JSON missing');
  } else {
    const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (!entry?.pitVerified && pitIsHeuristic(map)) {
      lines.push('map still carries heuristic pit marks');
    }
  }

  for (const issue of live) lines.push(issue);

  const ok = entry?.status === 'owner_verified' && lines.length === 0;
  if (ok) {
    console.log(`  OK  ${id}`);
  } else {
    console.error(` FAIL ${id}`);
    for (const line of lines) console.error(`      ${line}`);
    failures.push(id);
  }
}

if (retrieve.length) {
  console.error('\nRETRIEVE (do not bake or rebuild maps until these are in hand):');
  for (const item of retrieve) console.error(`  - ${item}`);
}

console.log('');
if (failures.length) {
  console.error(
    `Map proof FAILED for ${failures.length} layout(s). Official board map + pit marks required before bake/build.`
  );
  process.exit(1);
}
console.log('Map proof passed');
