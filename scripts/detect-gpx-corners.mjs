#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import {
  GateFailure,
  RIDER_PROFILE,
  detectCornersFromGpxFile,
} from './lib/gpx-corner-detector.mjs';

const DEFAULT_PROFILE = RIDER_PROFILE.id;

function printHelp() {
  console.log(`Detect and number corners from one GPX file.

Usage:
  node scripts/detect-gpx-corners.mjs --gpx <path> [options]

Options:
  --gpx <path>            GPX file path (required)
  --out <path>            Write output JSON file
  --profile <id>          Counting profile (supported: rider)
  --length-m <number>     Expected lap length in metres (optional)
  --length-km <number>    Expected lap length in kilometres (optional)
  --allow-ambiguous-lap   Disable strict lap-isolation ambiguity gate
  --expect-corners <n>    Testing-only gate: fail when detected count is not n
  --target-corners <n>    Place exactly n corners instead of discovering the count.
                          Use when n is confirmed elsewhere; geometry then only
                          decides where the boundaries fall.
  --corner-shift <n>      Rotate numbering by n corners, moving start/finish so
                          Turn 1 is the corner the curated offset names
  --pretty                Pretty-print JSON output
  --stdout                Print JSON to stdout even when --out is used
  --help                  Show this help

Notes:
  - This tool runs without confirmed corner counts by default.
  - Confirmed counts are optional and intended only for test validation.
  - Strict lap-isolation ambiguity gate is ON by default.

Examples:
  node scripts/detect-gpx-corners.mjs --gpx scripts/track-memory-gpx/baskerville.gpx --pretty
  node scripts/detect-gpx-corners.mjs --gpx scripts/track-memory-gpx/mallala.gpx --length-km 2.601 --out tmp/gpx-corner-tests/mallala.json --pretty
  node scripts/detect-gpx-corners.mjs --gpx scripts/track-memory-gpx/mac_park.gpx --expect-corners 12
`);
}

function parsePositiveNumber(raw, flag) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flag} must be a positive number, got "${raw}"`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    gpx: '',
    out: '',
    profile: DEFAULT_PROFILE,
    expectedLengthM: null,
    strictLapIsolation: true,
    expectCorners: null,
    targetCorners: null,
    cornerShift: 0,
    pretty: false,
    stdout: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--pretty') {
      args.pretty = true;
      continue;
    }
    if (token === '--stdout') {
      args.stdout = true;
      continue;
    }
    if (token === '--gpx' && argv[i + 1]) {
      args.gpx = argv[++i];
      continue;
    }
    if (token === '--out' && argv[i + 1]) {
      args.out = argv[++i];
      continue;
    }
    if (token === '--profile' && argv[i + 1]) {
      args.profile = String(argv[++i]).trim();
      continue;
    }
    if (token === '--length-m' && argv[i + 1]) {
      args.expectedLengthM = parsePositiveNumber(argv[++i], '--length-m');
      continue;
    }
    if (token === '--length-km' && argv[i + 1]) {
      args.expectedLengthM = parsePositiveNumber(argv[++i], '--length-km') * 1000;
      continue;
    }
    if (token === '--expect-corners' && argv[i + 1]) {
      const count = Number(argv[++i]);
      if (!Number.isInteger(count) || count < 1) {
        throw new Error(`--expect-corners must be a positive integer, got "${argv[i]}"`);
      }
      args.expectCorners = count;
      continue;
    }
    if (token === '--target-corners' && argv[i + 1]) {
      const count = Number(argv[++i]);
      if (!Number.isInteger(count) || count < 1) {
        throw new Error(`--target-corners must be a positive integer, got "${argv[i]}"`);
      }
      args.targetCorners = count;
      continue;
    }
    if (token === '--corner-shift' && argv[i + 1]) {
      const shift = Number(argv[++i]);
      if (!Number.isInteger(shift)) {
        throw new Error(`--corner-shift must be an integer, got "${argv[i]}"`);
      }
      args.cornerShift = shift;
      continue;
    }
    if (token === '--allow-ambiguous-lap') {
      args.strictLapIsolation = false;
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${token}`);
  }

  if (!args.help && !args.gpx) {
    throw new Error('missing required --gpx argument');
  }
  if (args.profile !== 'rider') {
    throw new Error(`unsupported --profile "${args.profile}". Available: rider`);
  }
  return args;
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
    console.error('Example: node scripts/detect-gpx-corners.mjs --gpx scripts/track-memory-gpx/baskerville.gpx --pretty');
    process.exit(1);
  }

  if (args.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(args.gpx)) {
    console.error(`Error: GPX file not found: ${args.gpx}`);
    process.exit(1);
  }

  try {
    const result = detectCornersFromGpxFile(args.gpx, {
      profile: RIDER_PROFILE,
      expectedLengthM: args.expectedLengthM,
      strictLapIsolation: args.strictLapIsolation,
      targetCornerCount: args.targetCorners,
      startFinishCornerShift: args.cornerShift,
    });

    if (args.expectCorners != null && result.cornerDetection.count !== args.expectCorners) {
      throw new Error(
        `corner count gate failed: expected ${args.expectCorners}, detected ${result.cornerDetection.count}`
      );
    }

    const body = args.pretty
      ? JSON.stringify(result, null, 2)
      : JSON.stringify(result);

    if (args.out) {
      const outPath = path.resolve(args.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${body}\n`, 'utf8');
      console.log(`status: ok`);
      console.log(`gpx: ${path.resolve(args.gpx)}`);
      console.log(`out: ${outPath}`);
      console.log(`corners: ${result.cornerDetection.count}`);
      console.log(`count_source: ${result.cornerDetection.countSource}`);
      console.log(`start_finish_source: ${result.startFinish.source}`);
      if (args.stdout) process.stdout.write(`${body}\n`);
      return;
    }

    process.stdout.write(`${body}\n`);
  } catch (error) {
    if (error instanceof GateFailure) {
      console.error(`Gate failure at stage "${error.stage}": ${error.message}`);
      if (Array.isArray(error.report) && error.report.length) {
        printGateReport(error.report);
      }
      console.error(
        'Fix the failing stage and re-run. Example: node scripts/detect-gpx-corners.mjs --gpx <file> --pretty'
      );
      process.exit(1);
    }

    console.error(`Error: ${error.message}`);
    console.error(
      'Example: node scripts/detect-gpx-corners.mjs --gpx scripts/track-memory-gpx/baskerville.gpx --pretty'
    );
    process.exit(1);
  }
}

main();
