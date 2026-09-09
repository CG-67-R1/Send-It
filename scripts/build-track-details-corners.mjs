#!/usr/bin/env node
/**
 * Bake Track Details corners from the same autonomous detector run as
 * scripts/export-gpx-corner-maps.mjs (rider profile, catalog length, your
 * start/finish offsets). Places each turn at the detector index the test PNG
 * used. Does not force the confirmed catalog count.
 *
 * Usage:
 *   node scripts/build-track-details-corners.mjs
 *   node scripts/build-track-details-corners.mjs smp_druitt mallala
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cornerShiftFor, loadCornerShifts } from './lib/start-finish-alignment.mjs';
import {
  detectForTrackDetails,
  fitDetectorToMapUnits,
  pointOnFitted,
  snapToRibbon,
} from './lib/track-details-from-detector.mjs';
import { TRACK_DETAILS_IDS } from './lib/track-details-ids.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const CATALOG_PATH = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const VERIFY_PATH = path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json');
const MAP_DIR = path.join(ROOT, 'app', 'src', 'data', 'gpxTrackMaps');
const APP_OUT = path.join(ROOT, 'app', 'src', 'data', 'trackDetailsCorners');
const ANDROID_OUT = path.join(ROOT, 'android-app', 'src', 'data', 'trackDetailsCorners');

const LABEL_OFFSET = 5.2;

const SHAPE_PHRASE = {
  hairpin: 'hairpin',
  sweeper: 'sweeper',
  kink: 'kink',
  chicane_element: 'chicane',
  triple_apex: 'triple-apex corner',
  double_apex: 'double-apex corner',
  tightening: 'tightening corner',
  opening: 'opening corner',
  constant_radius: 'corner',
};

function printHelp() {
  console.log(`Bake Track Details corners from the test-export detector run.

Usage:
  node scripts/build-track-details-corners.mjs [track-id ...]

Named ids rebuild a subset and leave index.ts alone. No args rebuilds every
Track Details layout and rewrites index.ts.
`);
}

function parseLengthM(lengthKm) {
  const match = String(lengthKm || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) * 1000 : null;
}

function dropClosedDuplicate(pts) {
  if (pts.length < 2) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05) return pts.slice(0, -1);
  return pts;
}

/** Same official count as scripts/export-gpx-corner-maps.mjs. */
function confirmedCorners(track) {
  const numbered = (track?.corners || []).filter((c) => c.number != null && !c.isFinish);
  return numbered.length ? Math.max(...numbered.map((c) => c.number)) : null;
}

function onRibbon(fitted, index, polyline) {
  return snapToRibbon(pointOnFitted(fitted, index), polyline).map(round);
}

function centroid(pts) {
  const ring = dropClosedDuplicate(pts);
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

function outward(point, centre, distance) {
  const dx = point[0] - centre[0];
  const dy = point[1] - centre[1];
  const n = Math.hypot(dx, dy) || 1;
  return [
    round(clampMap(point[0] + (dx / n) * distance)),
    round(clampMap(point[1] + (dy / n) * distance)),
  ];
}

function clampMap(n) {
  return Math.min(98, Math.max(2, n));
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function shapePhrase(classification) {
  return SHAPE_PHRASE[classification] || classification.replaceAll('_', ' ');
}

function verifiedHand(verify, trackId, number, countsMatch) {
  if (!countsMatch) return null;
  const hand = verify.verifiedHands?.[trackId]?.[String(number)];
  return hand === 'left' || hand === 'right' ? hand : null;
}

function summaryFor(corner, hand) {
  const shape = shapePhrase(corner.classification);
  const named = hand ? `${hand} ${shape}` : shape;
  const lead =
    corner.previousStraightM >= 80
      ? ` after a ${Math.round(corner.previousStraightM)} m straight`
      : corner.previousStraightM >= 25
        ? ` after a ${Math.round(corner.previousStraightM)} m run`
        : '';
  return (
    `Turn ${corner.number} is a ${named}${lead}. ` +
    `About ${Math.round(corner.headingChangeDeg)}° of heading change, ` +
    `${Math.round(corner.minimumRadiusM)} m minimum radius.`
  );
}

function approachFor(corner) {
  if (corner.number === 1) return 'start/finish straight';
  return `T${corner.number - 1} exit`;
}

function toCamel(id) {
  return id.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function writeIndex(outDir, ids) {
  const imports = ids
    .map((id) => `import ${toCamel(id)} from './${id}.json';`)
    .join('\n');
  const entries = ids.map((id) => `  ${id}: ${toCamel(id)} as TrackDetailsCorners,`).join('\n');
  const body = `${imports}
import type { TrackDetailsCorners } from './types';

const LAYOUTS: Record<string, TrackDetailsCorners> = {
${entries}
};

export const TRACK_DETAILS_CORNER_IDS = Object.keys(LAYOUTS);

export function getTrackDetailsCorners(trackId: string): TrackDetailsCorners | undefined {
  return LAYOUTS[trackId];
}
`;
  fs.writeFileSync(path.join(outDir, 'index.ts'), body);
}

function writeTypes(outDir) {
  const types = `export type TrackDetailsCorner = {
  id: string;
  number: number;
  apex: [number, number];
  label: [number, number];
  entry: [number, number];
  exit: [number, number];
  classification: string;
  headingChangeDeg: number;
  minimumRadiusM: number;
  lengthM: number;
  previousStraightM: number;
  /** Verified hand only, and only when the official count still matches. */
  direction: 'left' | 'right' | null;
  summary: string;
  approachFrom: string;
};

export type TrackDetailsCorners = {
  trackId: string;
  name: string;
  lengthM: number;
  startFinish: [number, number];
  countSource: 'autonomous' | 'constrained_to_target';
  corners: TrackDetailsCorner[];
};
`;
  fs.writeFileSync(path.join(outDir, 'types.ts'), types);
}

function buildOne(id, catalog, verify, shifts) {
  const gpxPath = path.join(GPX_DIR, `${id}.gpx`);
  const mapPath = path.join(MAP_DIR, `${id}.json`);
  if (!fs.existsSync(gpxPath)) throw new Error(`missing GPX ${path.relative(ROOT, gpxPath)}`);
  if (!fs.existsSync(mapPath)) {
    throw new Error(`missing map ${path.relative(ROOT, mapPath)}; run build-gpx-track-maps.mjs first`);
  }

  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const track = (catalog.tracks || []).find((t) => t.id === id);
  const detected = detectForTrackDetails(gpxPath, {
    expectedLengthM: parseLengthM(track?.lengthKm),
    startFinishCornerShift: cornerShiftFor(shifts, id),
  });

  const lapM = detected.track.lengthM;
  const fitted = fitDetectorToMapUnits(detected.geometry.points);
  const centre = centroid(map.polyline);
  const startFinish = onRibbon(fitted, detected.startFinish.index, map.polyline);
  const countsMatch = confirmedCorners(track) === detected.corners.length;

  const corners = detected.corners.map((corner) => {
    const apex = onRibbon(fitted, corner.sourceEvent.apexIndex, map.polyline);
    const entry = onRibbon(fitted, corner.sourceEvent.startIndex, map.polyline);
    const exit = onRibbon(fitted, corner.sourceEvent.endIndex, map.polyline);
    const hand = verifiedHand(verify, id, corner.number, countsMatch);
    return {
      id: `${id}_t${corner.number}`,
      number: corner.number,
      apex,
      label: outward(apex, centre, LABEL_OFFSET),
      entry,
      exit,
      classification: corner.classification,
      headingChangeDeg: corner.headingChangeDeg,
      minimumRadiusM: corner.minimumRadiusM,
      lengthM: corner.lengthM,
      previousStraightM: corner.previousStraightM,
      direction: hand,
      summary: summaryFor(corner, hand),
      approachFrom: approachFor(corner),
    };
  });

  return {
    trackId: id,
    name: track?.name || map.name || id,
    lengthM: Math.round(lapM * 10) / 10,
    startFinish,
    countSource: detected.cornerDetection.countSource,
    corners,
  };
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const ids = requested.length ? requested : TRACK_DETAILS_IDS;
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const verify = JSON.parse(fs.readFileSync(VERIFY_PATH, 'utf8'));
  const shifts = loadCornerShifts();

  fs.mkdirSync(APP_OUT, { recursive: true });
  fs.mkdirSync(ANDROID_OUT, { recursive: true });

  const layouts = [];
  const failures = [];
  for (const id of ids) {
    try {
      layouts.push(buildOne(id, catalog, verify, shifts));
    } catch (err) {
      failures.push(`${id}: ${err.message}`);
    }
  }
  if (failures.length) {
    console.error(`\nFAIL ${failures.length} layout(s), nothing written:`);
    for (const line of failures) console.error(`  - ${line}`);
    process.exit(1);
  }

  writeTypes(APP_OUT);
  writeTypes(ANDROID_OUT);
  for (const layout of layouts) {
    const json = `${JSON.stringify(layout, null, 2)}\n`;
    fs.writeFileSync(path.join(APP_OUT, `${layout.trackId}.json`), json);
    fs.writeFileSync(path.join(ANDROID_OUT, `${layout.trackId}.json`), json);
    const hands = layout.corners.some((c) => c.direction) ? 'verified-hands' : 'hands-open';
    console.log(
      `  ${layout.trackId}  ${layout.corners.length} corners  ${layout.countSource}  ${hands}  ${(layout.lengthM / 1000).toFixed(3)} km`
    );
  }

  if (requested.length) {
    console.log(`Rebuilt ${layouts.length} layout(s); index.ts left as is`);
    return;
  }
  writeIndex(APP_OUT, ids);
  writeIndex(ANDROID_OUT, ids);
  console.log(`Wrote ${layouts.length} corner overlays to ${path.relative(ROOT, APP_OUT)}`);
}

main();
