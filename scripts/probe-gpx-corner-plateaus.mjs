#!/usr/bin/env node
/**
 * Diagnostic: how well does a curvature-plateau step predict a corner split?
 *
 * Measured answer across this catalog: badly on its own. At a 1.5 radius ratio
 * the rule recovers all 11 missing corners but also splits 72 events on tracks
 * whose counts are already correct, and no threshold separates the two. The
 * ranking is still what the detector uses to choose *where* a split goes once a
 * corner count is known, so this probe exists to re-measure that ranking.
 *
 * Report only. Nothing here feeds the app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GateFailure,
  RIDER_PROFILE,
  detectCornersFromGpxFile,
  plateauSplitReport,
} from './lib/gpx-corner-detector.mjs';
import { TRACK_DETAILS_EXCLUSIONS } from './lib/track-details-ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const DEFAULT_CATALOG = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const SWEEP_RATIOS = [1.2, 1.3, 1.4, 1.5, 1.75, 2, 2.5, 3];

function printHelp() {
  console.log(`Probe curvature plateaus inside detected corner events (diagnostic only).

Usage:
  node scripts/probe-gpx-corner-plateaus.mjs [options]

Options:
  --gpx-dir <path>     Directory with .gpx files (default: scripts/track-memory-gpx)
  --catalog <path>     Catalog with confirmed corner counts (default: app/src/data/tracks.json)
  --ratio <n>          Radius ratio that counts as a real step (default: 1.5)
  --min-reduction <n>  Minimum explained-variance gain of the two-plateau fit (default: 0.2)
  --verbose            List every split candidate per track
  --help               Show this help
`);
}

function parseArgs(argv) {
  const args = {
    gpxDir: DEFAULT_GPX_DIR,
    catalogPath: DEFAULT_CATALOG,
    ratio: 1.5,
    minReduction: 0.2,
    verbose: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--verbose') args.verbose = true;
    else if (token === '--gpx-dir' && argv[i + 1]) args.gpxDir = path.resolve(argv[++i]);
    else if (token === '--catalog' && argv[i + 1]) args.catalogPath = path.resolve(argv[++i]);
    else if (token === '--ratio' && argv[i + 1]) args.ratio = Number(argv[++i]);
    else if (token === '--min-reduction' && argv[i + 1]) args.minReduction = Number(argv[++i]);
    else {
      console.error(`unknown or incomplete option: ${token}`);
      process.exit(2);
    }
  }
  return args;
}

function confirmedCorners(track) {
  const numbered = (track.corners || []).filter((c) => c.number != null && !c.isFinish);
  if (!numbered.length) return null;
  return Math.max(...numbered.map((c) => c.number));
}

function expectedLengthM(track, id) {
  if (TRACK_DETAILS_EXCLUSIONS[id]) return null;
  const match = String(track.lengthKm || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) * 1000 : null;
}

function qualifies(candidate, ratio, minReduction) {
  return (
    candidate.viable &&
    Number.isFinite(candidate.ratio) &&
    candidate.ratio >= ratio &&
    candidate.reduction >= minReduction
  );
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(args.catalogPath, 'utf8'));
  const tracks = new Map(catalog.tracks.map((t) => [t.id, t]));
  const files = fs
    .readdirSync(args.gpxDir)
    .filter((f) => f.toLowerCase().endsWith('.gpx'))
    .sort();

  console.log('Curvature-plateau probe (diagnostic only)');
  console.log(`gpx_dir: ${args.gpxDir}`);
  console.log(`ratio: ${args.ratio}  min_reduction: ${args.minReduction}\n`);

  const rows = [];
  for (const file of files) {
    const id = file.replace(/\.gpx$/i, '');
    const track = tracks.get(id);
    if (!track) continue;
    const confirmed = confirmedCorners(track);
    if (confirmed == null) continue;

    let result;
    try {
      result = detectCornersFromGpxFile(path.join(args.gpxDir, file), {
        profile: RIDER_PROFILE,
        expectedLengthM: expectedLengthM(track, id),
        strictLapIsolation: false,
        includeGeometry: true,
      });
    } catch (error) {
      const stage = error instanceof GateFailure ? ` stage=${error.stage}` : '';
      console.log(`SKIP ${id}${stage}: ${error.message}`);
      continue;
    }

    const candidates = plateauSplitReport(result.geometry, RIDER_PROFILE);
    const deficit = confirmed - result.cornerDetection.count;
    const qualifying = candidates.filter((c) => qualifies(c, args.ratio, args.minReduction));
    rows.push({ id, confirmed, deficit, candidates, qualifying });

    const flag = deficit > 0 ? 'SHORT' : deficit < 0 ? 'OVER ' : 'EXACT';
    console.log(
      `${flag} ${id.padEnd(24)} confirmed=${String(confirmed).padStart(2)} detected=${String(
        result.cornerDetection.count
      ).padStart(2)} deficit=${String(deficit).padStart(2)} plateau_candidates=${qualifying.length}`
    );

    if (args.verbose) {
      for (const c of qualifying) {
        console.log(
          `        ${c.hand.padEnd(5)} len=${Math.round(c.lengthM)}m  ` +
            `${Math.round(c.leftRadiusM)}m/${Math.round(c.rightRadiusM)}m radius  ` +
            `ratio=${c.ratio.toFixed(2)}  sides=${c.leftLenM}/${c.rightLenM}m  ` +
            `varGain=${(c.reduction * 100).toFixed(0)}%  peaks=${c.peaks}`
        );
      }
    }
  }

  const short = rows.filter((r) => r.deficit > 0);
  const exact = rows.filter((r) => r.deficit === 0);
  const totalDeficit = short.reduce((n, r) => n + r.deficit, 0);

  console.log('\nSeparation sweep: can one radius-ratio threshold recover the deficit cleanly?');
  console.log('ratio  recoverable  needed  false_splits_on_exact_tracks');
  for (const ratio of SWEEP_RATIOS) {
    const recoverable = short.reduce(
      (n, r) =>
        n +
        Math.min(r.deficit, r.candidates.filter((c) => qualifies(c, ratio, args.minReduction)).length),
      0
    );
    const falseSplits = exact.reduce(
      (n, r) => n + r.candidates.filter((c) => qualifies(c, ratio, args.minReduction)).length,
      0
    );
    console.log(
      `${ratio.toFixed(2).padStart(5)}  ${String(recoverable).padStart(11)}  ${String(
        totalDeficit
      ).padStart(6)}  ${String(falseSplits).padStart(28)}`
    );
  }

  console.log(
    `\nTracks: ${rows.length} | short: ${short.length} | exact: ${exact.length} | total deficit: ${totalDeficit}`
  );
}

main();
