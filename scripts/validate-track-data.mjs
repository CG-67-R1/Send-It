#!/usr/bin/env node
/**
 * Structural validation for Track Walk catalog + geofences.
 * Usage (from repo root): node scripts/validate-track-data.mjs
 * Exit 0 = pass, 1 = fail.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACKS_PATH = path.join(ROOT, 'app/src/data/tracks.json');
const GEOFENCE_PATH = path.join(ROOT, 'app/src/data/catalog_track_geofences.json');
const VERIFY_PATH = path.join(ROOT, 'app/src/data/track_turn_verification.json');

const VALID_CORNER_DIRS = new Set(['left', 'right', 'straight', 'complex']);
const VALID_TRACK_DIRS = new Set(['clockwise', 'anticlockwise', 'unknown']);
const TURNING_SHAPES = /hairpin|sweeper|double-?apex/i;

/** Official Bend lengths (km) — flag catalog mismatches */
const BEND_LENGTH_KM = {
  the_bend_international: 4.95,
  the_bend_gt: 7.77,
  the_bend_west: 3.41,
  the_bend_east: 3.93,
};

const MULTI_LAYOUT_GROUPS = [
  ['the_bend_international', 'the_bend_gt', 'the_bend_west', 'the_bend_east'],
  ['smp_gardner', 'smp_brabham', 'smp_druitt', 'smp_amaroo'],
];

const failures = [];
const warnings = [];

function pass(msg) {
  console.log(`  OK  ${msg}`);
}

function fail(msg) {
  console.error(` FAIL ${msg}`);
  failures.push(msg);
}

function warn(msg) {
  console.warn(` WARN ${msg}`);
  warnings.push(msg);
}

function parseLengthKm(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function coordsKey(feature) {
  const c = feature?.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  return `${Number(c[0]).toFixed(4)},${Number(c[1]).toFixed(4)}`;
}

function balancedParens(s) {
  let n = 0;
  for (const ch of s) {
    if (ch === '(') n += 1;
    if (ch === ')') n -= 1;
    if (n < 0) return false;
  }
  return n === 0;
}

console.log('Send-It track data validation');
console.log(`Repo: ${ROOT}`);
console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);

let turnPolicy = null;
try {
  turnPolicy = JSON.parse(fs.readFileSync(VERIFY_PATH, 'utf8'));
  pass('track_turn_verification.json loads');
} catch (e) {
  fail(`track_turn_verification.json: ${e.message}`);
}

let catalog;
let geofences;
try {
  catalog = JSON.parse(fs.readFileSync(TRACKS_PATH, 'utf8'));
  pass('tracks.json parses');
} catch (e) {
  fail(`tracks.json: ${e.message}`);
  process.exit(1);
}

try {
  geofences = JSON.parse(fs.readFileSync(GEOFENCE_PATH, 'utf8'));
  pass('catalog_track_geofences.json parses');
} catch (e) {
  fail(`catalog_track_geofences.json: ${e.message}`);
  process.exit(1);
}

const tracks = Array.isArray(catalog.tracks) ? catalog.tracks : [];
if (tracks.length === 0) {
  fail('tracks.json has no tracks[]');
} else {
  pass(`${tracks.length} catalog tracks`);
}

const features = Array.isArray(geofences.features) ? geofences.features : [];
if (features.length === 0) {
  fail('geofences has no features[]');
} else {
  pass(`${features.length} geofence features`);
}

const trackIds = new Set();
const geoById = new Map();

for (const f of features) {
  const id = f?.properties?.trackId;
  if (!id) {
    fail('geofence feature missing properties.trackId');
    continue;
  }
  if (geoById.has(id)) fail(`duplicate geofence trackId: ${id}`);
  geoById.set(id, f);
}

for (const t of tracks) {
  if (!t?.id) {
    fail('track missing id');
    continue;
  }
  if (trackIds.has(t.id)) fail(`duplicate catalog trackId: ${t.id}`);
  trackIds.add(t.id);

  if (!VALID_TRACK_DIRS.has(t.direction)) {
    fail(`${t.id}: invalid track direction "${t.direction}"`);
  }

  const corners = Array.isArray(t.corners) ? t.corners : [];
  if (corners.length < 2) {
    fail(`${t.id}: fewer than 2 corners (${corners.length})`);
  }

  const finishCount = corners.filter((c) => c?.isFinish || c?.label === 'T-Finish').length;
  if (finishCount !== 1) {
    fail(`${t.id}: expected exactly 1 T-Finish, found ${finishCount}`);
  }

  const cornerIds = new Set();
  for (const c of corners) {
    if (!c?.id) {
      fail(`${t.id}: corner missing id`);
      continue;
    }
    if (cornerIds.has(c.id)) fail(`${t.id}: duplicate corner id ${c.id}`);
    cornerIds.add(c.id);

    if (!VALID_CORNER_DIRS.has(c.direction)) {
      fail(`${t.id}/${c.id}: invalid corner direction "${c.direction}"`);
    }

    const label = c.label || '';
    if (/\s{2,}/.test(label)) {
      fail(`${t.id}/${c.id}: double spaces in label "${label}"`);
    }
    if (!balancedParens(label)) {
      fail(`${t.id}/${c.id}: unbalanced parentheses in label "${label}"`);
    }
    if (c.shape && TURNING_SHAPES.test(c.shape) && c.direction === 'straight') {
      fail(`${t.id}/${c.id}: shape "${c.shape}" cannot be direction "straight"`);
    }
  }

  if (!geoById.has(t.id)) {
    fail(`${t.id}: in catalog but missing from geofences`);
  }

  const expectedBend = BEND_LENGTH_KM[t.id];
  if (expectedBend != null) {
    const actual = parseLengthKm(t.lengthKm);
    if (actual == null) {
      fail(`${t.id}: missing lengthKm (expected ~${expectedBend} km)`);
    } else if (Math.abs(actual - expectedBend) > 0.15) {
      fail(`${t.id}: lengthKm "${t.lengthKm}" != official ${expectedBend} km`);
    } else {
      pass(`${t.id} length ~${expectedBend} km`);
    }
  }
}

for (const id of geoById.keys()) {
  if (!trackIds.has(id)) {
    fail(`${id}: in geofences but missing from catalog`);
  }
}

for (const group of MULTI_LAYOUT_GROUPS) {
  const present = group.filter((id) => geoById.has(id));
  if (present.length < 2) continue;
  const keys = present.map((id) => coordsKey(geoById.get(id)));
  const unique = new Set(keys.filter(Boolean));
  if (unique.size > 1) {
    fail(`multi-layout group centres differ: ${present.join(', ')} → ${[...unique].join(' | ')}`);
  } else {
    pass(`shared geofence centre: ${present.join(', ')}`);
  }
}

// Soft expectations for planned layouts (warn only)
for (const id of ['the_bend_east', 'the_bend_west', 'smp_amaroo', 'collingrove_hillclimb']) {
  if (!trackIds.has(id)) {
    warn(`planned layout not in catalog yet: ${id}`);
  }
}

// Turn-hand integrity: left|right only if listed in track_turn_verification.json
// with an allowed handSources method (never GPX / CW-CCW inference alone).
if (turnPolicy) {
  const forceAll = new Set(turnPolicy.forceAllComplex || []);
  const verifiedHands = turnPolicy.verifiedHands || {};
  const handSources = turnPolicy.handSources || {};
  const trackDir = turnPolicy.trackDirection || {};
  const allowedMethods = new Set(
    turnPolicy.allowedSourceMethods || ['rider', 'official_map', 'authoritative_preview', 'legacy_lock']
  );
  const bannedMethods = new Set(
    turnPolicy.bannedSourceMethods || [
      'gpx_bearing',
      'ccw_inference',
      'clockwise_inference',
      'kb_extract_alone',
    ]
  );
  let unverifiedLR = 0;
  let verifiedOk = 0;
  let sourceGaps = 0;

  for (const [id, dir] of Object.entries(trackDir)) {
    const t = tracks.find((x) => x.id === id);
    if (t && t.direction !== dir) {
      fail(`${id}: track direction "${t.direction}" must be "${dir}" per verification policy`);
    }
  }

  // Hard lock: known bad inference that shipped before (PI T1 left from CCW).
  const pi = tracks.find((x) => x.id === 'phillip_island');
  if (pi) {
    const t1 = (pi.corners || []).find((c) => c.number === 1);
    if (t1 && t1.direction === 'left') {
      fail(
        'phillip_island T1: Doohan Corner must not be "left" (anticlockwise does not imply T1 left; verified hand is right)'
      );
    }
  }

  for (const [trackId, hands] of Object.entries(verifiedHands)) {
    const sourcesForTrack = handSources[trackId] || {};
    for (const [num, wantHand] of Object.entries(hands)) {
      const src = sourcesForTrack[num];
      if (!src) {
        fail(`${trackId} T${num}: verifiedHands entry missing handSources — add evidence or demote to complex`);
        sourceGaps += 1;
        continue;
      }
      if (src.hand && src.hand !== wantHand) {
        fail(`${trackId} T${num}: handSources.hand "${src.hand}" != verifiedHands "${wantHand}"`);
        sourceGaps += 1;
      }
      const method = src.method || '';
      if (bannedMethods.has(method)) {
        fail(`${trackId} T${num}: banned source method "${method}" (never lock from GPX/CW-CCW/KB-alone)`);
        sourceGaps += 1;
      } else if (!allowedMethods.has(method)) {
        fail(`${trackId} T${num}: unknown source method "${method}"`);
        sourceGaps += 1;
      }
    }
  }

  for (const t of tracks) {
    const verified = verifiedHands[t.id] || {};
    const wipe = forceAll.has(t.id);
    for (const c of t.corners || []) {
      if (c.isFinish || c.number == null) continue;
      const key = String(c.number);
      const hand = c.direction;
      if (hand !== 'left' && hand !== 'right') continue;
      if (wipe) {
        fail(`${t.id} T${c.number}: left|right not allowed on forceAllComplex track (got "${hand}")`);
        unverifiedLR += 1;
        continue;
      }
      const want = verified[key];
      if (!want) {
        fail(`${t.id} T${c.number}: "${hand}" is not in verifiedHands — use complex until rider/map lock`);
        unverifiedLR += 1;
      } else if (want !== hand) {
        fail(`${t.id} T${c.number}: direction "${hand}" != verified "${want}"`);
        unverifiedLR += 1;
      } else {
        verifiedOk += 1;
      }
    }
  }
  if (unverifiedLR === 0 && sourceGaps === 0) {
    pass(`turn-hand policy: ${verifiedOk} verified left|right with sources, 0 unverified`);
  }
}

console.log('\nMap proof (owner-verified boards + pits)');
{
  const proofScript = path.join(ROOT, 'scripts', 'prove-track-maps.mjs');
  const proof = spawnSync(process.execPath, [proofScript], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (proof.stdout) process.stdout.write(proof.stdout);
  if (proof.stderr) process.stderr.write(proof.stderr);
  if (proof.status === 0) {
    pass('prove-track-maps.mjs');
  } else {
    fail('prove-track-maps.mjs — retrieve official board maps and pit marks before baking or rebuilding Track Details');
  }
}

console.log('\nSummary');
if (failures.length === 0) {
  console.log(`All track data checks passed (${warnings.length} warning(s)).`);
  for (const w of warnings) console.log(`  - ${w}`);
  process.exit(0);
}

console.error(`\nTrack data validation finished with ${failures.length} failure(s), ${warnings.length} warning(s).`);
for (const f of failures) console.error(`  - ${f}`);
for (const w of warnings) console.warn(`  - ${w}`);
process.exit(1);
