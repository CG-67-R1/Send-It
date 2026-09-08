#!/usr/bin/env node
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

const DEFAULT_GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const DEFAULT_CATALOG = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const DEFAULT_OUT_DIR = path.join(ROOT, 'tests', 'gpx-corner-detector');
const VERIFICATION_PATH = path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json');

function printHelp() {
  console.log(`Compare GPX corner detection against confirmed catalog turn counts (testing harness).

Usage:
  node scripts/compare-gpx-corners-to-catalog.mjs [options]

Options:
  --gpx-dir <path>        Directory with .gpx files (default: scripts/track-memory-gpx)
  --catalog <path>        Catalog file with confirmed corners (default: app/src/data/tracks.json)
  --out-dir <path>        Output folder for test artifacts (default: tests/gpx-corner-detector)
  --strict-mismatch       Exit non-zero when any detected count differs from catalog
  --constrain-to-catalog  Pass the confirmed count in as a target so the detector places
                          exactly that many corners instead of discovering the count.
                          Counts then agree by construction; judge placement, not the count.
  --align                 Apply curated numbering offsets from
                          scripts/data/gpx-start-finish-alignment.json
  --verify-hands          Check numbered hands against curated verifiedHands and fail
                          the gate when the numbering looks systematically misaligned
  --help                  Show this help

Outputs:
  <out-dir>/results/<trackId>.json   detector output per track
  <out-dir>/summary.json             machine-readable comparison summary
  <out-dir>/summary.md               side-by-side comparison table

Notes:
  - This script is for evaluation only.
  - The detector itself does not require confirmed corner counts.

Examples:
  node scripts/compare-gpx-corners-to-catalog.mjs
  node scripts/compare-gpx-corners-to-catalog.mjs --out-dir tests/gpx-corner-detector --strict-mismatch
`);
}

function parseLengthKm(raw) {
  const match = String(raw || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseArgs(argv) {
  const args = {
    gpxDir: DEFAULT_GPX_DIR,
    catalogPath: DEFAULT_CATALOG,
    outDir: DEFAULT_OUT_DIR,
    strictMismatch: false,
    constrainToCatalog: false,
    align: false,
    verifyHands: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--strict-mismatch') {
      args.strictMismatch = true;
      continue;
    }
    if (token === '--constrain-to-catalog') {
      args.constrainToCatalog = true;
      continue;
    }
    if (token === '--align') {
      args.align = true;
      continue;
    }
    if (token === '--verify-hands') {
      args.verifyHands = true;
      continue;
    }
    if (token === '--gpx-dir' && argv[i + 1]) {
      args.gpxDir = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--catalog' && argv[i + 1]) {
      args.catalogPath = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--out-dir' && argv[i + 1]) {
      args.outDir = path.resolve(argv[++i]);
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${token}`);
  }
  return args;
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getConfirmedCornerCount(track) {
  const numbered = (track.corners || [])
    .filter((c) => !c.isFinish && Number.isInteger(c.number))
    .map((c) => c.number)
    .sort((a, b) => a - b);
  if (!numbered.length) return null;
  return Math.max(...numbered);
}

function printGateReport(report) {
  for (const gate of report || []) {
    if (gate.status === 'pass') {
      const details = gate.details ? ` ${JSON.stringify(gate.details)}` : '';
      console.error(`PASS ${gate.stage}${details}`);
    } else {
      console.error(`FAIL ${gate.stage} ${gate.error || 'unknown error'}`);
    }
  }
}

function toSummaryMarkdown(rows, createdAt, outDir) {
  const lines = [];
  lines.push('# GPX Corner Count Comparison');
  lines.push('');
  lines.push(`Generated: ${createdAt}`);
  lines.push(`Output folder: ${outDir}`);
  lines.push('');
  lines.push('| Track | Confirmed corners | Detected corners | Delta | Status |');
  lines.push('|---|---:|---:|---:|---|');
  for (const row of rows) {
    lines.push(
      `| ${row.trackId} | ${row.confirmedCorners ?? '-'} | ${row.detectedCorners ?? '-'} | ${row.delta ?? '-'} | ${row.status} |`
    );
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('Example: node scripts/compare-gpx-corners-to-catalog.mjs --out-dir tests/gpx-corner-detector');
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  assertFileExists(args.gpxDir, 'GPX directory');
  assertFileExists(args.catalogPath, 'Catalog file');

  const catalog = readJson(args.catalogPath);
  const tracksById = new Map((catalog.tracks || []).map((t) => [t.id, t]));
  const gpxFiles = fs
    .readdirSync(args.gpxDir)
    .filter((name) => name.toLowerCase().endsWith('.gpx'))
    .sort((a, b) => a.localeCompare(b));

  if (!gpxFiles.length) {
    throw new Error(`no .gpx files found in ${args.gpxDir}`);
  }

  const alignment = args.align ? loadCornerShifts() : {};
  const verifiedHandsByTrack = args.verifyHands
    ? readJson(VERIFICATION_PATH).verifiedHands || {}
    : {};

  const resultsDir = path.join(args.outDir, 'results');
  fs.mkdirSync(resultsDir, { recursive: true });

  const rows = [];

  for (const fileName of gpxFiles) {
    const trackId = path.basename(fileName, '.gpx');
    const gpxPath = path.join(args.gpxDir, fileName);
    const catalogTrack = tracksById.get(trackId);
    if (!catalogTrack) {
      throw new Error(`catalog track missing for GPX: ${trackId}`);
    }

    const confirmedCorners = getConfirmedCornerCount(catalogTrack);
    const lengthKm = parseLengthKm(catalogTrack.lengthKm);
    const expectedLengthM = lengthKm ? lengthKm * 1000 : null;
    const excluded = TRACK_DETAILS_EXCLUSIONS[trackId] || null;

    try {
      const output = detectCornersFromGpxFile(gpxPath, {
        profile: RIDER_PROFILE,
        expectedLengthM: excluded ? null : expectedLengthM,
        targetCornerCount: args.constrainToCatalog ? confirmedCorners : null,
        startFinishCornerShift: cornerShiftFor(alignment, trackId),
        verifiedHands: verifiedHandsByTrack[trackId] || null,
      });

      const detectedCorners = output.cornerDetection.count;
      const delta =
        confirmedCorners == null ? null : detectedCorners - confirmedCorners;
      const status = delta === 0 ? 'MATCH' : 'MISMATCH';

      const constraint = output.cornerDetection.countConstraint || null;
      const row = {
        trackId,
        confirmedCorners,
        detectedCorners,
        delta,
        status,
        countSource: output.cornerDetection.countSource,
        startFinishSource: output.startFinish.source,
        detectorConfidence: output.cornerDetection.confidence,
        excludedTrackDetailsLayout: Boolean(excluded),
        ...(constraint
          ? {
              autonomousCount: constraint.autonomousCount,
              constraintActions: constraint.actions,
            }
          : {}),
        ...(output.turnHandCheck
          ? {
              handsChecked: output.turnHandCheck.checked,
              handsAgreed: output.turnHandCheck.agreed,
              handMismatches: output.turnHandCheck.mismatches,
            }
          : {}),
      };
      rows.push(row);

      fs.writeFileSync(
        path.join(resultsDir, `${trackId}.json`),
        `${JSON.stringify(output, null, 2)}\n`,
        'utf8'
      );

      const note = constraint
        ? ` [constrained from ${constraint.autonomousCount}: ` +
          `${constraint.actions.filter((a) => a.type === 'split').length} split, ` +
          `${constraint.actions.filter((a) => a.type === 'merge').length} merge]`
        : '';
      const hands = output.turnHandCheck
        ? ` hands=${output.turnHandCheck.agreed}/${output.turnHandCheck.checked}`
        : '';
      const shifted = output.startFinish.cornerShift
        ? ` shift=${output.startFinish.cornerShift}`
        : '';
      console.log(
        `${status} ${trackId} confirmed=${confirmedCorners ?? '-'} detected=${detectedCorners} delta=${delta ?? '-'}${shifted}${hands}${note}`
      );
    } catch (error) {
      if (error instanceof GateFailure) {
        console.error(`FAIL ${trackId} stage=${error.stage}: ${error.message}`);
        if (error.report?.length) printGateReport(error.report);
      } else {
        console.error(`FAIL ${trackId}: ${error.message}`);
      }
      console.error('Fail-fast stop: fix the issue and rerun comparison.');
      process.exit(1);
    }
  }

  const mismatches = rows.filter((r) => r.status === 'MISMATCH');
  const createdAt = new Date().toISOString();

  const summary = {
    generatedAt: createdAt,
    profile: RIDER_PROFILE.id,
    mode: args.constrainToCatalog ? 'constrained_to_catalog' : 'autonomous',
    gpxDir: args.gpxDir,
    catalogPath: args.catalogPath,
    totalTracks: rows.length,
    matchedTracks: rows.length - mismatches.length,
    mismatchedTracks: mismatches.length,
    rows,
  };

  fs.writeFileSync(
    path.join(args.outDir, 'summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(args.outDir, 'summary.md'),
    toSummaryMarkdown(rows, createdAt, args.outDir),
    'utf8'
  );

  console.log('');
  console.log(`Wrote ${args.outDir}`);
  console.log(
    `Tracks: ${rows.length} | Matches: ${rows.length - mismatches.length} | Mismatches: ${mismatches.length}`
  );

  const handRows = rows.filter((r) => r.handsChecked);
  if (handRows.length) {
    const checked = handRows.reduce((n, r) => n + r.handsChecked, 0);
    const agreed = handRows.reduce((n, r) => n + r.handsAgreed, 0);
    console.log(
      `Verified hands: ${agreed}/${checked} (${((100 * agreed) / checked).toFixed(0)}%) across ${handRows.length} layouts`
    );
  }

  if (args.strictMismatch && mismatches.length) {
    console.error('Strict mismatch mode: failing because mismatches were found.');
    process.exit(1);
  }
}

main();
