#!/usr/bin/env node
/**
 * Export a small batch of layouts for visual corner review.
 *
 * Runs each track twice — once discovering the corner count from the trace, once
 * with the confirmed count and curated numbering offset supplied — and records
 * which corners only appear in the second run. Those are the ones autonomous
 * detection misses, and the renderer draws them in red.
 *
 * Report only. Nothing here is read by the app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GateFailure,
  RIDER_PROFILE,
  detectCornersFromGpxFile,
} from './lib/gpx-corner-detector.mjs';
import { cornerShiftFor, loadCornerShifts } from './lib/start-finish-alignment.mjs';
import { TRACK_DETAILS_EXCLUSIONS } from './lib/track-details-ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const CATALOG = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const DEFAULT_OUT = path.join(ROOT, 'tests', 'gpx-corner-maps');

/** Two big deficits, one single miss, and the worst absolute case. */
const DEFAULT_TRACKS = ['baskerville', 'broadford', 'mac_park', 'the_bend_gt'];

/** Shortest gap between corners worth naming as a straight. */
const MIN_STRAIGHT_M = 60;


function printHelp() {
  console.log(`Export layouts for visual corner review (diagnostic only).

Usage:
  node scripts/export-gpx-corner-maps.mjs [options]

Options:
  --tracks <a,b,c>   Track ids to export (default: ${DEFAULT_TRACKS.join(',')})
  --all              Every catalog layout that has a repo GPX
  --out-dir <path>   Output folder (default: tests/gpx-corner-maps)
  --help             Show this help

Then render the images:
  python scripts/render-gpx-corner-maps.py
`);
}

function parseArgs(argv) {
  const args = { tracks: DEFAULT_TRACKS, all: false, outDir: DEFAULT_OUT, help: false };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--all') args.all = true;
    else if (token === '--tracks' && argv[i + 1]) {
      args.tracks = argv[++i]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (token === '--out-dir' && argv[i + 1]) args.outDir = path.resolve(argv[++i]);
    else {
      console.error(`unknown or incomplete option: ${token}`);
      process.exit(2);
    }
  }
  return args;
}

function confirmedCorners(track) {
  const numbered = (track.corners || []).filter((c) => c.number != null && !c.isFinish);
  return numbered.length ? Math.max(...numbered.map((c) => c.number)) : null;
}

function expectedLengthM(track, id) {
  if (TRACK_DETAILS_EXCLUSIONS[id]) return null;
  const match = String(track.lengthKm || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) * 1000 : null;
}

/**
 * Straights between consecutive corners, labelled longest first.
 *
 * GPX carries no start/finish marker, so the detector infers one from the
 * longest straight — which on some layouts is the back straight, not the main
 * straight. Labelling the straights lets a rider name the right one, and the
 * corner that follows it is then Turn 1.
 */
function findStraights(corners, pointCount, perPointM, minLengthM) {
  const straights = [];
  for (let i = 0; i < corners.length; i++) {
    const current = corners[i];
    const next = corners[(i + 1) % corners.length];
    const gapPoints = (((next.startIndex - current.endIndex) % pointCount) + pointCount) % pointCount;
    const lengthM = gapPoints * perPointM;
    if (lengthM < minLengthM) continue;
    straights.push({
      afterCorner: current.number,
      beforeCorner: next.number,
      lengthM: Math.round(lengthM),
      startIndex: current.endIndex,
      endIndex: next.startIndex,
      midIndex: (current.endIndex + Math.floor(gapPoints / 2)) % pointCount,
    });
  }
  return straights
    .sort((a, b) => b.lengthM - a.lengthM)
    .map((straight, i) => ({ label: String.fromCharCode(65 + i), ...straight }));
}

function cornerShape(corner) {
  return {
    number: corner.number,
    direction: corner.direction,
    classification: corner.classification,
    startIndex: corner.sourceEvent.startIndex,
    apexIndex: corner.sourceEvent.apexIndex,
    endIndex: corner.sourceEvent.endIndex,
    lengthM: corner.lengthM,
    minimumRadiusM: corner.minimumRadiusM,
    headingChangeDeg: corner.headingChangeDeg,
  };
}

/** Circular distance in metres between two sample indices. */
function apexGapM(a, b, pointCount, perPointM) {
  const raw = Math.abs(a - b) % pointCount;
  return Math.min(raw, pointCount - raw) * perPointM;
}

/**
 * Numbering offset that starts a run at whichever corner begins nearest `anchor`.
 *
 * A curated offset is an index into one run's corner order, so it cannot be
 * reused by a run that found a different number of corners. Anchoring on the
 * position of Turn 1 instead survives the count changing.
 */
function shiftToAnchor(corners, anchorIndex, pointCount) {
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const raw = Math.abs(corners[i].sourceEvent.startIndex - anchorIndex) % pointCount;
    const gap = Math.min(raw, pointCount - raw);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

/**
 * Corners in the reference run with no counterpart in the autonomous run.
 *
 * Closest pairs are matched first across the whole lap, so every autonomous
 * corner accounts for exactly one reference corner. Whatever is left over is
 * what autonomous detection missed, and the leftover count therefore always
 * equals the shortfall rather than depending on a distance threshold.
 */
function findAddedCorners(autonomous, reference, pointCount, perPointM) {
  const pairs = [];
  for (let i = 0; i < autonomous.length; i++) {
    for (let j = 0; j < reference.length; j++) {
      pairs.push({
        i,
        j,
        gapM: apexGapM(autonomous[i].apexIndex, reference[j].apexIndex, pointCount, perPointM),
      });
    }
  }
  pairs.sort((a, b) => a.gapM - b.gapM);

  const usedAuto = new Set();
  const usedRef = new Set();
  let worstMatchM = 0;
  for (const pair of pairs) {
    if (usedAuto.has(pair.i) || usedRef.has(pair.j)) continue;
    usedAuto.add(pair.i);
    usedRef.add(pair.j);
    worstMatchM = Math.max(worstMatchM, pair.gapM);
  }

  return {
    added: reference.filter((_, j) => !usedRef.has(j)).map((corner) => corner.number),
    worstMatchM: Math.round(worstMatchM),
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const tracks = new Map(catalog.tracks.map((t) => [t.id, t]));
  const shifts = loadCornerShifts();

  fs.mkdirSync(args.outDir, { recursive: true });
  const written = [];
  const failures = [];

  const wanted = args.all
    ? catalog.tracks
        .filter((t) => confirmedCorners(t) && fs.existsSync(path.join(GPX_DIR, `${t.id}.gpx`)))
        .map((t) => t.id)
    : args.tracks;

  for (const id of wanted) {
    const track = tracks.get(id);
    if (!track) {
      console.error(`FAIL ${id}: not in catalog`);
      process.exit(1);
    }
    const gpxPath = path.join(GPX_DIR, `${id}.gpx`);
    if (!fs.existsSync(gpxPath)) {
      console.error(`FAIL ${id}: no GPX at ${gpxPath}`);
      process.exit(1);
    }

    const confirmed = confirmedCorners(track);
    const shared = {
      profile: RIDER_PROFILE,
      expectedLengthM: expectedLengthM(track, id),
      strictLapIsolation: false,
    };

    const shift = cornerShiftFor(shifts, id);
    let autonomous;
    let reference;
    try {
      autonomous = detectCornersFromGpxFile(gpxPath, {
        ...shared,
        includeGeometry: true,
        startFinishCornerShift: shift,
      });
      // Both runs must number from the same place on the track, and the two runs
      // find different corner counts, so anchor the second on the first's Turn 1.
      const anchorIndex = autonomous.corners[0].sourceEvent.startIndex;
      const probe = detectCornersFromGpxFile(gpxPath, { ...shared, targetCornerCount: confirmed });
      reference = detectCornersFromGpxFile(gpxPath, {
        ...shared,
        targetCornerCount: confirmed,
        startFinishCornerShift: shiftToAnchor(
          probe.corners,
          anchorIndex,
          probe.track.sampledPointCount
        ),
      });
    } catch (error) {
      // Keep going so one bad layout still yields a full preview batch, but
      // record it and exit non-zero so the failure cannot pass unnoticed.
      const stage = error instanceof GateFailure ? ` stage=${error.stage}` : '';
      console.error(`FAIL ${id}${stage}: ${error.message}`);
      failures.push(id);
      continue;
    }

    const { points, pointCount, lapLengthM } = autonomous.geometry;
    const perPointM = lapLengthM / pointCount;
    const autoCorners = autonomous.corners.map(cornerShape);
    const refCorners = reference.corners.map(cornerShape);
    const { added, worstMatchM } = findAddedCorners(autoCorners, refCorners, pointCount, perPointM);

    const payload = {
      trackId: id,
      trackName: track.name || id,
      lapLengthM,
      pointCount,
      perPointM,
      confirmedCorners: confirmed,
      cornerShift: shift,
      cornerShiftSource: shifts[id]?.source || 'none',
      mainStraight: shifts[id]?.mainStraight || null,
      polyline: points,
      autonomous: {
        count: autoCorners.length,
        startFinishIndex: autonomous.startFinish.index,
        corners: autoCorners,
        straights: findStraights(autoCorners, pointCount, perPointM, MIN_STRAIGHT_M),
      },
      reference: {
        count: refCorners.length,
        startFinishIndex: reference.startFinish.index,
        corners: refCorners,
        addedCornerNumbers: added,
        worstMatchedApexShiftM: worstMatchM,
      },
    };

    const outPath = path.join(args.outDir, `${id}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(payload)}\n`, 'utf8');
    written.push(outPath);

    console.log(
      `${id.padEnd(16)} confirmed=${String(confirmed).padStart(2)} ` +
        `autonomous=${String(autoCorners.length).padStart(2)} reference=${String(refCorners.length).padStart(2)} ` +
        `missed=[${added.join(', ')}] worst_matched_apex_shift=${worstMatchM}m ` +
        `turn1=${payload.cornerShiftSource}`
    );
    for (const straight of payload.autonomous.straights) {
      // Circular containment: the straight holding start/finish wraps the lap
      // seam, so a plain range test never matches it.
      const span = (((straight.endIndex - straight.startIndex) % pointCount) + pointCount) % pointCount;
      const offset =
        (((autonomous.startFinish.index - straight.startIndex) % pointCount) + pointCount) % pointCount;
      const inferred = offset <= span;
      console.log(
        `    straight ${straight.label}  ${String(straight.lengthM).padStart(4)}m  ` +
          `T${straight.afterCorner} exit -> T${straight.beforeCorner} entry` +
          (inferred ? '   <- detector put start/finish here' : '')
      );
    }
  }

  console.log(`\nWrote ${written.length} files to ${args.outDir}`);
  console.log('Render with: python scripts/render-gpx-corner-maps.py');
  if (failures.length) {
    console.error(`\n${failures.length} layout(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main();
