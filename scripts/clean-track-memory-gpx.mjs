#!/usr/bin/env node
/**
 * Reduce a track-memory GPX to one clean closed lap.
 *
 * The catalog GPX comes from two sources and both ship the same defect: a
 * two-point stub segment followed by two complete laps of the circuit. That
 * leaves lap isolation guessing which lap to use, and the stub reads as a
 * 180-degree reversal that can split a straight in two. Winton's start/finish
 * landed on the wrong straight for exactly that reason.
 *
 * Writes nothing unless --write is passed. Run the track gates afterwards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const CATALOG = path.join(ROOT, 'app', 'src', 'data', 'tracks.json');

/** Fewer points than this is a stub, not a lap. */
const MIN_LAP_POINTS = 20;
/** A lap must return to its own start within this to count as closed. */
const MAX_CLOSURE_M = 30;
/** How far a candidate may sit from the catalog length before we refuse to guess. */
const MAX_LENGTH_ERROR = 0.03;

const R = 6371000;
const rad = Math.PI / 180;

function metres(a, b) {
  const dy = (b.lat - a.lat) * rad * R;
  const dx = (b.lon - a.lon) * rad * R * Math.cos(a.lat * rad);
  return Math.hypot(dx, dy);
}

function printHelp() {
  console.log(`Reduce track-memory GPX files to a single clean closed lap.

Usage:
  node scripts/clean-track-memory-gpx.mjs [options]

Options:
  --tracks <a,b,c>   Track ids to process (default: every file in the folder)
  --write            Actually rewrite the files (default is a dry run)
  --help             Show this help

After writing, rebuild and gate:
  node scripts/build-gpx-track-maps.mjs
  node scripts/prove-track-maps.mjs
  node scripts/validate-track-data.mjs
`);
}

function parseArgs(argv) {
  const args = { tracks: null, write: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--write') args.write = true;
    else if (token === '--tracks' && argv[i + 1]) {
      args.tracks = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      console.error(`unknown or incomplete option: ${token}`);
      process.exit(2);
    }
  }
  return args;
}

function catalogLengthKm() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  return new Map(
    catalog.tracks.map((t) => [t.id, Number(String(t.lengthKm || '').match(/[\d.]+/)?.[0]) || null])
  );
}

/** Trackpoints per `<trkseg>`, keeping each point's XML so elevation survives. */
function readSegments(raw) {
  return raw
    .split(/<trkseg>/)
    .slice(1)
    .map((chunk) => {
      const body = chunk.split(/<\/trkseg>/)[0];
      return [...body.matchAll(/<trkpt\b[^>]*?lat="(-?[\d.]+)"[^>]*?lon="(-?[\d.]+)"[\s\S]*?(?:\/>|<\/trkpt>)/g)].map(
        (m) => ({ xml: m[0], lat: Number(m[1]), lon: Number(m[2]) })
      );
    });
}

function measure(points) {
  let lengthM = 0;
  let maxGapM = 0;
  for (let i = 1; i < points.length; i++) {
    const d = metres(points[i - 1], points[i]);
    lengthM += d;
    if (d > maxGapM) maxGapM = d;
  }
  return {
    points,
    lengthM,
    maxGapM,
    closureM: metres(points[0], points[points.length - 1]),
  };
}

/**
 * Split one flattened run of points into laps at each return to the start.
 *
 * The DEM-enriched files hold the same stub-plus-two-laps content as the
 * converter files, just without the segment boundaries to read it from.
 */
function splitAtReturns(points) {
  const start = points[0];
  const laps = [];
  let from = 0;
  for (let i = MIN_LAP_POINTS; i < points.length; i++) {
    if (metres(start, points[i]) >= MAX_CLOSURE_M || i - from < MIN_LAP_POINTS) continue;
    // First crossing is often still approaching; take the closest point in the
    // cluster so the join is a gap, not a 20m sideways hairpin.
    let best = i;
    let bestD = metres(start, points[i]);
    for (let j = i + 1; j < points.length && j - i <= 8; j++) {
      const d = metres(start, points[j]);
      if (d >= MAX_CLOSURE_M) break;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    laps.push(points.slice(from, best + 1));
    from = best;
    i = best;
  }
  if (points.length - from >= MIN_LAP_POINTS) laps.push(points.slice(from));
  return laps.length > 1 ? laps : [points];
}

function candidatesFor(segments) {
  const laps = segments.filter((s) => s.length >= MIN_LAP_POINTS);
  const stubs = segments.length - laps.length;
  if (laps.length > 1) return { candidates: laps, stubs, source: 'segments' };
  if (laps.length === 1) {
    const split = splitAtReturns(laps[0]);
    return { candidates: split, stubs, source: split.length > 1 ? 'split at returns' : 'single lap' };
  }
  return { candidates: [], stubs, source: 'none' };
}

/**
 * Best lap is the highest-resolution one that closes and matches the catalog.
 *
 * Resolution decides rather than length, because a lap drawn from more points
 * cuts fewer corners on the map, and every candidate that gets this far is
 * already within a few per cent of the real circuit.
 *
 * A length that misses the catalog is reported rather than fatal: it means the
 * source traces the wrong distance, which cleaning cannot fix and must not hide.
 */
function pickLap(candidates, catKm) {
  const scored = candidates.map(measure).map((lap) => ({
    ...lap,
    lengthError: catKm ? Math.abs(lap.lengthM / 1000 / catKm - 1) : 0,
  }));
  const closed = scored.filter((lap) => lap.closureM <= MAX_CLOSURE_M);
  if (!closed.length) return { chosen: null, scored };
  const onLength = closed.filter((lap) => lap.lengthError <= MAX_LENGTH_ERROR);
  const pool = [...(onLength.length ? onLength : closed)].sort(
    (a, b) => b.points.length - a.points.length
  );
  return { chosen: pool[0], scored, offLength: onLength.length === 0 };
}

function rebuild(raw, name, points) {
  const head = raw.slice(0, raw.indexOf('<trk>'));
  const body = points.map((p) => `    ${p.xml}`).join('\n');
  return `${head}<trk><name>${name}</name><trkseg>\n${body}\n  </trkseg></trk>\n</gpx>\n`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const lengths = catalogLengthKm();
  const files = fs
    .readdirSync(GPX_DIR)
    .filter((f) => f.toLowerCase().endsWith('.gpx'))
    .sort()
    .filter((f) => !args.tracks || args.tracks.includes(f.replace(/\.gpx$/i, '')));

  if (!files.length) {
    console.error('no matching GPX files');
    process.exit(2);
  }

  let changed = 0;
  let failed = 0;
  let warned = 0;
  for (const file of files) {
    const id = file.replace(/\.gpx$/i, '');
    const gpxPath = path.join(GPX_DIR, file);
    const raw = fs.readFileSync(gpxPath, 'utf8');

    if (/<wpt\b/.test(raw)) {
      console.error(`FAIL ${id}: file carries waypoints, which this tool would discard`);
      failed++;
      continue;
    }

    const segments = readSegments(raw);
    const total = segments.reduce((n, s) => n + s.length, 0);
    const { candidates, stubs, source } = candidatesFor(segments);
    const catKm = lengths.get(id);
    const { chosen, scored, offLength } = pickLap(candidates, catKm);

    if (!chosen) {
      console.error(
        `FAIL  ${id}: no lap closes within ${MAX_CLOSURE_M}m, so the laps in this file cannot be told apart ` +
          `(${scored
            .map((s) => `${s.points.length}pts/${(s.lengthM / 1000).toFixed(2)}km/closure ${s.closureM.toFixed(0)}m`)
            .join(', ')})`
      );
      failed++;
      continue;
    }

    const already = candidates.length === 1 && stubs === 0;
    console.log(
      `${already ? 'CLEAN' : 'FIX  '} ${id.padEnd(22)} ${String(total).padStart(4)} pts -> ${String(chosen.points.length).padStart(4)} ` +
        `(${stubs} stub seg, ${candidates.length} lap${candidates.length === 1 ? '' : 's'} by ${source})  ` +
        `${(chosen.lengthM / 1000).toFixed(3)}km vs ${catKm}km, closure ${chosen.closureM.toFixed(1)}m, max gap ${chosen.maxGapM.toFixed(0)}m`
    );
    if (offLength || (already && chosen.lengthError > MAX_LENGTH_ERROR)) {
      console.log(
        `      WARN  every lap here is ${(chosen.lengthError * 100).toFixed(1)}% off the catalog's ${catKm}km, ` +
          `which is a source problem cleaning cannot fix`
      );
      warned++;
    }

    if (already || !args.write) continue;
    fs.writeFileSync(gpxPath, rebuild(raw, id, chosen.points), 'utf8');
    changed++;
  }

  if (!args.write) console.log('\nDry run. Pass --write to rewrite the files.');
  else console.log(`\nRewrote ${changed} file(s).`);
  if (warned) console.log(`${warned} file(s) carry a length mismatch to review.`);
  if (failed) {
    console.error(`${failed} file(s) could not be reduced safely.`);
    process.exit(1);
  }
}

main();
