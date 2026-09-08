#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GateFailure,
  RIDER_PROFILE,
  detectCornersFromGpxFile,
} from './lib/gpx-corner-detector.mjs';
import { TRACK_DETAILS_EXCLUSIONS } from './lib/track-details-ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`Run fail-fast stage gates over GPX files.

Usage:
  node scripts/gate-gpx-corner-detector.mjs [options]

Options:
  --gpx-dir <path>        Directory containing .gpx files (default: scripts/track-memory-gpx)
  --out-dir <path>        Optional directory for detector JSON outputs
  --allow-ambiguous-lap   Disable strict lap-isolation ambiguity gate
  --use-catalog-lengths   Enable optional lap-length gate from catalog data (testing mode)
  --catalog <path>        Catalog path for --use-catalog-lengths (default: app/src/data/tracks.json)
  --profile <id>          Counting profile (supported: rider)
  --max-files <n>         Limit how many GPX files are processed
  --help                  Show this help

Behavior:
  - Fail fast: stops on the first failing gate
  - Prints per-file PASS lines with core metrics
  - Autonomous by default: no dependency on confirmed catalog corner counts/lengths
  - Strict lap-isolation ambiguity gate is ON by default
  - Exits 0 only if every processed file passes

Examples:
  node scripts/gate-gpx-corner-detector.mjs
  node scripts/gate-gpx-corner-detector.mjs --out-dir tmp/gpx-corner-tests
  node scripts/gate-gpx-corner-detector.mjs --allow-ambiguous-lap
  node scripts/gate-gpx-corner-detector.mjs --use-catalog-lengths --catalog app/src/data/tracks.json
  node scripts/gate-gpx-corner-detector.mjs --gpx-dir scripts/track-memory-gpx --max-files 5
`);
}

function parsePositiveInt(raw, flag) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer, got "${raw}"`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    gpxDir: path.join(ROOT, 'scripts', 'track-memory-gpx'),
    outDir: '',
    catalog: path.join(ROOT, 'app', 'src', 'data', 'tracks.json'),
    strictLapIsolation: true,
    useCatalogLengths: false,
    profile: RIDER_PROFILE.id,
    maxFiles: null,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--gpx-dir' && argv[i + 1]) {
      args.gpxDir = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--out-dir' && argv[i + 1]) {
      args.outDir = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--catalog' && argv[i + 1]) {
      args.catalog = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--use-catalog-lengths') {
      args.useCatalogLengths = true;
      continue;
    }
    if (token === '--allow-ambiguous-lap') {
      args.strictLapIsolation = false;
      continue;
    }
    if (token === '--profile' && argv[i + 1]) {
      args.profile = String(argv[++i]).trim();
      continue;
    }
    if (token === '--max-files' && argv[i + 1]) {
      args.maxFiles = parsePositiveInt(argv[++i], '--max-files');
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${token}`);
  }

  if (args.profile !== 'rider') {
    throw new Error(`unsupported --profile "${args.profile}". Available: rider`);
  }
  return args;
}

function parseLengthKm(raw) {
  const match = String(raw || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function loadExpectedLengths(catalogPath) {
  if (!fs.existsSync(catalogPath)) return new Map();
  try {
    const doc = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const map = new Map();
    for (const track of doc.tracks || []) {
      const km = parseLengthKm(track.lengthKm);
      if (km && track.id) map.set(track.id, km * 1000);
    }
    return map;
  } catch {
    return new Map();
  }
}

function assertSequential(corners) {
  for (let i = 0; i < corners.length; i++) {
    if (corners[i].number !== i + 1) {
      throw new Error(`numbering gate failed at corner index ${i}`);
    }
  }
}

function assertAscendingApex(corners) {
  for (let i = 1; i < corners.length; i++) {
    if (corners[i].apexDistanceM <= corners[i - 1].apexDistanceM) {
      throw new Error(`apex distance gate failed between T${corners[i - 1].number} and T${corners[i].number}`);
    }
  }
}

function applyPostDetectionGates(result, expectedLengthM, fileName) {
  if (result.cornerDetection.count < 2) {
    throw new Error(`${fileName}: expected at least 2 corners, got ${result.cornerDetection.count}`);
  }
  if (result.startFinish.confidence < 0.5) {
    throw new Error(`${fileName}: start/finish confidence too low (${result.startFinish.confidence})`);
  }
  if (expectedLengthM) {
    const ratio = result.track.lengthM / expectedLengthM;
    if (ratio < 0.85 || ratio > 1.15) {
      throw new Error(
        `${fileName}: lap length gate failed ${Math.round(result.track.lengthM)}m vs expected ${Math.round(expectedLengthM)}m (${ratio.toFixed(2)}x)`
      );
    }
  }
  assertSequential(result.corners);
  assertAscendingApex(result.corners);
}

function printGateReport(report) {
  for (const gate of report || []) {
    if (gate.status === 'pass') {
      const detail = gate.details ? ` ${JSON.stringify(gate.details)}` : '';
      console.error(`PASS ${gate.stage}${detail}`);
    } else {
      console.error(`FAIL ${gate.stage} ${gate.error || 'unknown error'}`);
    }
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('Example: node scripts/gate-gpx-corner-detector.mjs --out-dir tmp/gpx-corner-tests');
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(args.gpxDir)) {
    console.error(`Error: GPX directory not found: ${args.gpxDir}`);
    process.exit(1);
  }
  if (args.useCatalogLengths && !fs.existsSync(args.catalog)) {
    console.error(`Error: catalog not found for --use-catalog-lengths: ${args.catalog}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(args.gpxDir)
    .filter((name) => name.toLowerCase().endsWith('.gpx'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.error(`Error: no .gpx files found in ${args.gpxDir}`);
    process.exit(1);
  }

  const expectedLengths = args.useCatalogLengths ? loadExpectedLengths(args.catalog) : new Map();
  const selected = args.maxFiles ? files.slice(0, args.maxFiles) : files;

  if (args.outDir) fs.mkdirSync(args.outDir, { recursive: true });

  console.log(`GPX corner detector gate run`);
  console.log(`gpx_dir: ${args.gpxDir}`);
  console.log(`files: ${selected.length}`);
  console.log(`profile: rider`);
  console.log(`catalog_length_gate: ${args.useCatalogLengths ? 'on' : 'off'}`);
  console.log(`lap_ambiguity_gate: ${args.strictLapIsolation ? 'strict' : 'allow_ambiguous'}`);

  for (const fileName of selected) {
    const filePath = path.join(args.gpxDir, fileName);
    const trackId = path.basename(fileName, '.gpx');
    const expectedLengthM = args.useCatalogLengths ? expectedLengths.get(trackId) ?? null : null;
    const excludedReason =
      args.useCatalogLengths ? TRACK_DETAILS_EXCLUSIONS[trackId] || null : null;
    const effectiveExpectedLengthM =
      args.useCatalogLengths && excludedReason ? null : expectedLengthM;

    try {
      const result = detectCornersFromGpxFile(filePath, {
        profile: RIDER_PROFILE,
        expectedLengthM: effectiveExpectedLengthM,
        strictLapIsolation: args.strictLapIsolation,
      });
      applyPostDetectionGates(result, effectiveExpectedLengthM, fileName);

      if (args.outDir) {
        const outPath = path.join(args.outDir, `${trackId}.json`);
        fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
      }

      console.log(
        `PASS ${trackId} corners=${result.cornerDetection.count} lengthM=${Math.round(result.track.lengthM)} start=${result.startFinish.source} confidence=${result.cornerDetection.confidence}` +
          (args.useCatalogLengths && excludedReason ? ` note=excluded_track_details_layout` : '')
      );
    } catch (error) {
      if (error instanceof GateFailure) {
        console.error(`FAIL ${trackId} stage=${error.stage}: ${error.message}`);
        if (Array.isArray(error.report) && error.report.length) {
          printGateReport(error.report);
        }
      } else {
        console.error(`FAIL ${trackId}: ${error.message}`);
      }
      console.error('Fail-fast stop: fix the reported gate, then re-run.');
      process.exit(1);
    }
  }

  console.log(`PASS all ${selected.length} GPX files`);
}

main();
