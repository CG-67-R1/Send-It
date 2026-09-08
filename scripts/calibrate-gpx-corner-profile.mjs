#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RIDER_PROFILE,
  detectCornersFromGpxFile,
} from './lib/gpx-corner-detector.mjs';
import { TRACK_DETAILS_EXCLUSIONS } from './lib/track-details-ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const DEFAULT_CATALOG = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const DEFAULT_OUT = path.join(ROOT, 'tests', 'gpx-corner-detector', 'calibration.json');

function printHelp() {
  console.log(`Calibrate rider profile parameters against confirmed corner counts (testing only).

Usage:
  node scripts/calibrate-gpx-corner-profile.mjs [options]

Options:
  --gpx-dir <path>        GPX directory (default: scripts/track-memory-gpx)
  --catalog <path>        Catalog JSON (default: app/src/data/tracks.json)
  --out <path>            JSON output file (default: tests/gpx-corner-detector/calibration.json)
  --top <n>               Number of top profiles to save (default: 10)
  --max-combos <n>        Limit tested combinations after generation
  --help                  Show this help

Notes:
  - Uses confirmed catalog counts only for calibration/evaluation.
  - Detector runtime remains independent from confirmed counts.
`);
}

function parseLengthKm(raw) {
  const m = String(raw || '').match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function parsePositiveInt(raw, flag) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${flag} must be a positive integer, got "${raw}"`);
  }
  return n;
}

function parseArgs(argv) {
  const args = {
    gpxDir: DEFAULT_GPX_DIR,
    catalog: DEFAULT_CATALOG,
    out: DEFAULT_OUT,
    top: 10,
    maxCombos: null,
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
    if (token === '--catalog' && argv[i + 1]) {
      args.catalog = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[++i]);
      continue;
    }
    if (token === '--top' && argv[i + 1]) {
      args.top = parsePositiveInt(argv[++i], '--top');
      continue;
    }
    if (token === '--max-combos' && argv[i + 1]) {
      args.maxCombos = parsePositiveInt(argv[++i], '--max-combos');
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${token}`);
  }
  return args;
}

function getConfirmedCornerCount(track) {
  const nums = (track.corners || [])
    .filter((c) => !c.isFinish && Number.isInteger(c.number))
    .map((c) => c.number);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function loadFixtures(gpxDir, catalogPath) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const byId = new Map((catalog.tracks || []).map((t) => [t.id, t]));
  const gpxFiles = fs
    .readdirSync(gpxDir)
    .filter((f) => f.toLowerCase().endsWith('.gpx'))
    .sort((a, b) => a.localeCompare(b));
  const fixtures = [];
  for (const file of gpxFiles) {
    const id = path.basename(file, '.gpx');
    const track = byId.get(id);
    if (!track) continue;
    const confirmedCorners = getConfirmedCornerCount(track);
    if (!confirmedCorners) continue;
    const km = parseLengthKm(track.lengthKm);
    fixtures.push({
      trackId: id,
      filePath: path.join(gpxDir, file),
      confirmedCorners,
      expectedLengthM: TRACK_DETAILS_EXCLUSIONS[id] ? null : km ? km * 1000 : null,
    });
  }
  return fixtures;
}

function cartesian(grid) {
  const entries = Object.entries(grid);
  let out = [{}];
  for (const [key, values] of entries) {
    const next = [];
    for (const base of out) {
      for (const value of values) {
        next.push({ ...base, [key]: value });
      }
    }
    out = next;
  }
  return out;
}

function scoreProfile(fixtures, params) {
  const profile = { ...RIDER_PROFILE, ...params, id: 'rider-calibration' };
  let exactMatches = 0;
  let totalAbsError = 0;
  let worstAbsError = 0;
  const rows = [];

  for (const fx of fixtures) {
    let result;
    try {
      result = detectCornersFromGpxFile(fx.filePath, {
        profile,
        expectedLengthM: fx.expectedLengthM,
        strictLapIsolation: true,
      });
    } catch (error) {
      return {
        params,
        invalid: true,
        failedTrack: fx.trackId,
        error: error instanceof Error ? error.message : String(error),
        exactMatches: -1,
        totalAbsError: Number.POSITIVE_INFINITY,
        worstAbsError: Number.POSITIVE_INFINITY,
        rows: [],
      };
    }
    const detected = result.cornerDetection.count;
    const delta = detected - fx.confirmedCorners;
    const absError = Math.abs(delta);
    if (absError === 0) exactMatches += 1;
    totalAbsError += absError;
    if (absError > worstAbsError) worstAbsError = absError;
    rows.push({
      trackId: fx.trackId,
      confirmedCorners: fx.confirmedCorners,
      detectedCorners: detected,
      delta,
      absError,
    });
  }

  rows.sort((a, b) => b.absError - a.absError || a.trackId.localeCompare(b.trackId));

  return {
    params,
    invalid: false,
    exactMatches,
    totalAbsError,
    worstAbsError,
    rows,
  };
}

function compareScores(a, b) {
  if (a.invalid !== b.invalid) return a.invalid ? 1 : -1;
  if (a.exactMatches !== b.exactMatches) return b.exactMatches - a.exactMatches;
  if (a.totalAbsError !== b.totalAbsError) return a.totalAbsError - b.totalAbsError;
  if (a.worstAbsError !== b.worstAbsError) return a.worstAbsError - b.worstAbsError;
  return 0;
}

function summaryMarkdown(payload) {
  const lines = [];
  lines.push('# GPX Corner Profile Calibration');
  lines.push('');
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push(`Combos tested: ${payload.combosTested}`);
  lines.push(`Tracks used: ${payload.trackCount}`);
  lines.push('');
  lines.push('## Best Profile');
  lines.push('');
  lines.push(`- Exact matches: ${payload.best.exactMatches}/${payload.trackCount}`);
  lines.push(`- Total absolute error: ${payload.best.totalAbsError}`);
  lines.push(`- Worst absolute error: ${payload.best.worstAbsError}`);
  lines.push(`- Params: \`${JSON.stringify(payload.best.params)}\``);
  lines.push('');
  lines.push('## Top Profiles');
  lines.push('');
  lines.push('| Rank | Matches | Total Abs Error | Worst Abs Error | Params |');
  lines.push('|---:|---:|---:|---:|---|');
  payload.top.forEach((row, idx) => {
    lines.push(
      `| ${idx + 1} | ${row.exactMatches} | ${row.totalAbsError} | ${row.worstAbsError} | \`${JSON.stringify(row.params)}\` |`
    );
  });
  lines.push('');
  lines.push('## Best Profile Largest Errors');
  lines.push('');
  lines.push('| Track | Confirmed | Detected | Delta |');
  lines.push('|---|---:|---:|---:|');
  payload.best.rows.slice(0, 10).forEach((row) => {
    lines.push(`| ${row.trackId} | ${row.confirmedCorners} | ${row.detectedCorners} | ${row.delta} |`);
  });
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  if (args.help) {
    printHelp();
    return;
  }

  if (!fs.existsSync(args.gpxDir)) throw new Error(`missing gpx dir: ${args.gpxDir}`);
  if (!fs.existsSync(args.catalog)) throw new Error(`missing catalog: ${args.catalog}`);

  const fixtures = loadFixtures(args.gpxDir, args.catalog);
  if (!fixtures.length) throw new Error('no calibration fixtures found');

  const grid = {
    rateFloorDegPerM: [0.08, 0.1, 0.12],
    minSweptDeg: [12, 16, 20, 24],
    mergeGapM: [10, 18, 32],
    minCornerLengthM: [6, 10],
    turnWindowM: [12, 15],
  };
  let combos = cartesian(grid);
  if (args.maxCombos) combos = combos.slice(0, args.maxCombos);

  console.log(`Calibrating GPX corner profile`);
  console.log(`tracks: ${fixtures.length}`);
  console.log(`combos: ${combos.length}`);

  const scores = [];
  for (let i = 0; i < combos.length; i++) {
    const params = combos[i];
    const score = scoreProfile(fixtures, params);
    scores.push(score);
    if ((i + 1) % 20 === 0 || i + 1 === combos.length) {
      const best = [...scores].sort(compareScores).find((s) => !s.invalid);
      if (best) {
        console.log(
          `progress ${i + 1}/${combos.length} best=${best.exactMatches}/${fixtures.length} abs=${best.totalAbsError}`
        );
      } else {
        console.log(`progress ${i + 1}/${combos.length} no valid profile yet`);
      }
    }
  }

  const validScores = scores.filter((s) => !s.invalid);
  if (!validScores.length) {
    throw new Error('all profile combinations failed validation');
  }
  validScores.sort(compareScores);
  const top = validScores.slice(0, Math.min(args.top, validScores.length));
  const payload = {
    generatedAt: new Date().toISOString(),
    trackCount: fixtures.length,
    combosTested: combos.length,
    best: top[0],
    top,
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const mdPath = args.out.replace(/\.json$/i, '.md');
  fs.writeFileSync(mdPath, summaryMarkdown(payload), 'utf8');

  console.log(`Wrote ${args.out}`);
  console.log(
    `Best: matches=${payload.best.exactMatches}/${fixtures.length}, totalAbsError=${payload.best.totalAbsError}, worstAbsError=${payload.best.worstAbsError}`
  );
}

main();
