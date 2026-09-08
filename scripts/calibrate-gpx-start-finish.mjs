#!/usr/bin/env node
/**
 * Derive per-layout corner-numbering offsets from curated verified hands.
 *
 * No GPX in this catalog carries a start/finish waypoint, so the detector falls
 * back to the longest straight — which is not always the main straight. Corners
 * then land in the right places but carry the wrong numbers. The verified-hand
 * sequence acts as a fingerprint: the rotation that best matches it is the
 * offset between the geometric start and the official Turn 1.
 *
 * Writes curated offsets for the testing harness only. Nothing here is read by
 * the app, and the offsets should be reviewed before they are trusted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GateFailure,
  MIN_VERIFIED_HANDS_FOR_ALIGNMENT,
  MISALIGNED_NUMBERING_GAIN_SHARE,
  RIDER_PROFILE,
  detectCornersFromGpxFile,
} from './lib/gpx-corner-detector.mjs';
import { loadConfirmedShifts } from './lib/start-finish-alignment.mjs';
import { TRACK_DETAILS_EXCLUSIONS } from './lib/track-details-ids.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const DEFAULT_CATALOG = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');
const DEFAULT_VERIFICATION = path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json');
const DEFAULT_OUT = path.join(ROOT, 'scripts', 'data', 'gpx-start-finish-alignment.json');

/**
 * Recording an offset uses the same criterion the detector's misalignment gate
 * applies, so calibration and gating can never disagree about a layout.
 *
 * Hand sequences repeat: Phillip Island's opening right-left-left-right recurs
 * exactly four corners later, so a wrong offset can match the early verified
 * corners by coincidence. Requiring a share rather than a count rejects that.
 */
const MIN_VERIFIED_HANDS = MIN_VERIFIED_HANDS_FOR_ALIGNMENT;
const MIN_SHIFT_GAIN_SHARE = MISALIGNED_NUMBERING_GAIN_SHARE;
/** Minimum share of verified hands the winning offset must explain. */
const MIN_AGREEMENT = 0.75;

function printHelp() {
  console.log(`Derive corner-numbering offsets from curated verified turn hands.

Usage:
  node scripts/calibrate-gpx-start-finish.mjs [options]

Options:
  --gpx-dir <path>      Directory with .gpx files (default: scripts/track-memory-gpx)
  --catalog <path>      Catalog with confirmed counts (default: app/src/data/tracks.json)
  --verification <path> Curated turn verification (default: app/src/data/track_turn_verification.json)
  --out <path>          Alignment file to write (default: scripts/data/gpx-start-finish-alignment.json)
  --dry-run             Report findings without writing
  --help                Show this help

Notes:
  - Offsets are evidence, not truth. Review before relying on them.
  - Layouts without verified hands cannot be aligned and are reported as unknown.
`);
}

function parseArgs(argv) {
  const args = {
    gpxDir: DEFAULT_GPX_DIR,
    catalogPath: DEFAULT_CATALOG,
    verificationPath: DEFAULT_VERIFICATION,
    outPath: DEFAULT_OUT,
    dryRun: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--gpx-dir' && argv[i + 1]) args.gpxDir = path.resolve(argv[++i]);
    else if (token === '--catalog' && argv[i + 1]) args.catalogPath = path.resolve(argv[++i]);
    else if (token === '--verification' && argv[i + 1]) args.verificationPath = path.resolve(argv[++i]);
    else if (token === '--out' && argv[i + 1]) args.outPath = path.resolve(argv[++i]);
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

/** Rotation of the detected sequence that best explains the verified hands. */
function bestOffset(corners, verifiedHands) {
  const count = corners.length;
  const wanted = Object.entries(verifiedHands)
    .map(([number, hand]) => ({ number: Number(number), hand }))
    .filter((e) => Number.isInteger(e.number) && e.number >= 1 && e.number <= count);
  if (!wanted.length) return null;

  const handAt = (i) => corners[((i % count) + count) % count].direction;
  const scoreAt = (shift) => wanted.filter((e) => handAt(e.number - 1 + shift) === e.hand).length;

  const span = Math.floor(count / 2);
  let best = { shift: 0, agreed: scoreAt(0) };
  for (let shift = -span; shift <= span; shift++) {
    const agreed = scoreAt(shift);
    // Prefer the smallest rotation that explains the most hands.
    if (agreed > best.agreed || (agreed === best.agreed && Math.abs(shift) < Math.abs(best.shift))) {
      best = { shift, agreed };
    }
  }
  return { ...best, checked: wanted.length, baseAgreed: scoreAt(0) };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(args.catalogPath, 'utf8'));
  const verification = JSON.parse(fs.readFileSync(args.verificationPath, 'utf8'));
  const verifiedHands = verification.verifiedHands || {};
  const confirmedShifts = loadConfirmedShifts();
  const tracks = new Map(catalog.tracks.map((t) => [t.id, t]));
  const files = fs
    .readdirSync(args.gpxDir)
    .filter((f) => f.toLowerCase().endsWith('.gpx'))
    .sort();

  console.log('Start/finish alignment calibration');
  console.log(`gpx_dir: ${args.gpxDir}`);
  console.log(`verification: ${args.verificationPath}\n`);

  const layouts = {};
  const unknown = [];
  const needsReview = [];
  let checkedTotal = 0;
  let baseTotal = 0;
  let alignedTotal = 0;

  for (const file of files) {
    const id = file.replace(/\.gpx$/i, '');
    const track = tracks.get(id);
    if (!track) continue;

    const hands = verifiedHands[id];
    if (!hands || !Object.keys(hands).length) {
      unknown.push(id);
      continue;
    }

    const confirmed = confirmedCorners(track);
    let result;
    try {
      result = detectCornersFromGpxFile(path.join(args.gpxDir, file), {
        profile: RIDER_PROFILE,
        expectedLengthM: expectedLengthM(track, id),
        strictLapIsolation: false,
        targetCornerCount: confirmed,
      });
    } catch (error) {
      const stage = error instanceof GateFailure ? ` stage=${error.stage}` : '';
      console.log(`SKIP  ${id}${stage}: ${error.message}`);
      continue;
    }

    const best = bestOffset(result.corners, hands);
    if (!best) {
      unknown.push(id);
      continue;
    }

    checkedTotal += best.checked;
    baseTotal += best.baseAgreed;
    alignedTotal += best.agreed;

    const share = best.agreed / best.checked;
    const gainShare = (best.agreed - best.baseAgreed) / best.checked;

    let verdict;
    if (best.checked < MIN_VERIFIED_HANDS) verdict = { label: 'WEAK ', reason: 'too few verified hands' };
    else if (share < MIN_AGREEMENT)
      verdict = { label: 'WEAK ', reason: 'no offset explains most verified hands' };
    else if (best.shift === 0) verdict = { label: 'OK   ', reason: null };
    else if (gainShare < MIN_SHIFT_GAIN_SHARE)
      verdict = { label: 'ALIAS', reason: `offset ${best.shift} gains only ${best.agreed - best.baseAgreed} hands; likely a repeating hand pattern` };
    else verdict = { label: 'SHIFT', reason: null };

    const confirmedShift = confirmedShifts[id]?.cornerShift;
    if (!verdict.reason && confirmedShift != null && confirmedShift !== best.shift) {
      verdict = {
        label: 'CONFL',
        reason: `rider confirmed offset ${confirmedShift}, hands suggest ${best.shift}`,
      };
    }

    // Verified hands cannot see the road, so ask the detector to actually place
    // start/finish at this offset. Mac Park and Broadford both scored well on
    // hands while naming a Turn 1 with no straight in front of it.
    if (!verdict.reason && best.shift !== 0) {
      try {
        detectCornersFromGpxFile(path.join(args.gpxDir, file), {
          profile: RIDER_PROFILE,
          expectedLengthM: expectedLengthM(track, id),
          strictLapIsolation: false,
          targetCornerCount: confirmed,
          startFinishCornerShift: best.shift,
        });
      } catch (error) {
        verdict = { label: 'NOGAP', reason: error.message };
      }
    }

    console.log(
      `${verdict.label} ${id.padEnd(24)} corners=${String(result.corners.length).padStart(2)} ` +
        `verified=${String(best.checked).padStart(2)} as_numbered=${best.baseAgreed}/${best.checked} ` +
        `aligned=${best.agreed}/${best.checked} shift=${best.shift}` +
        (verdict.reason ? `  <- ${verdict.reason}` : '')
    );

    if (verdict.reason) {
      needsReview.push({ id, suggestedShift: best.shift, reason: verdict.reason });
      alignedTotal -= best.agreed - best.baseAgreed;
      continue;
    }

    layouts[id] = {
      cornerShift: best.shift,
      verifiedHands: best.checked,
      agreementAsNumbered: `${best.baseAgreed}/${best.checked}`,
      agreementAligned: `${best.agreed}/${best.checked}`,
    };
  }

  if (needsReview.length) {
    console.log(`\nNot recorded, needs human review (${needsReview.length}):`);
    for (const item of needsReview) {
      console.log(`  ${item.id.padEnd(24)} suggested shift ${item.suggestedShift}: ${item.reason}`);
    }
  }

  if (unknown.length) {
    console.log(`\nNo verified hands, alignment unknown (${unknown.length}): ${unknown.join(', ')}`);
  }

  const pct = (n) => (checkedTotal ? `${((100 * n) / checkedTotal).toFixed(0)}%` : 'n/a');
  console.log(
    `\nVerified hands explained: as-numbered ${baseTotal}/${checkedTotal} (${pct(baseTotal)}) ` +
      `-> with recorded offsets ${alignedTotal}/${checkedTotal} (${pct(alignedTotal)})`
  );

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    note:
      'Testing-only. Corner-numbering offsets derived from verifiedHands in ' +
      'app/src/data/track_turn_verification.json. Not read by the app. Review before trusting.',
    source: path.relative(ROOT, args.verificationPath).replace(/\\/g, '/'),
    minVerifiedHands: MIN_VERIFIED_HANDS,
    minAgreement: MIN_AGREEMENT,
    minShiftGainShare: MIN_SHIFT_GAIN_SHARE,
    layouts,
    needsReview,
    alignmentUnknown: unknown,
  };

  if (args.dryRun) {
    console.log('\nDry run: nothing written.');
    return;
  }

  fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
  fs.writeFileSync(args.outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`\nWrote ${args.outPath} (${Object.keys(layouts).length} layouts)`);
}

main();
