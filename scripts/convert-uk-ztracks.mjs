/**
 * Write map-only UK GPX from packs/regions/uk/tracks/*.ztracks.
 * Picks the .tkk whose centreline length is closest to the pack catalog.
 * Does not bake corners or set turn hands.
 *
 * Usage: node scripts/convert-uk-ztracks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { pathLengthM, tkkName, tkkPoints, toGpx } from './lib/tkk-track.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRACKS_DIR = path.join(ROOT, 'packs', 'regions', 'uk', 'tracks');
const OUT_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');

/** Pack id → catalog metres + zip entries to consider. */
const SELECT = {
  'brands-hatch': { targetM: 3916, zip: 'UK.ztracks', names: [/Brands Hatch GP/i] },
  donington: { targetM: 3190, zip: 'UK.ztracks', names: [/Donington/i] },
  silverstone: { targetM: 2640, zip: 'UK.ztracks', names: [/Silverstone National/i] },
  snetterton: { targetM: 4780, zip: 'UK.ztracks', names: [/Snetterton/i] },
  'oulton-park': { targetM: 4330, zip: 'UK.ztracks', names: [/Oulton/i] },
  thruxton: { targetM: 3790, zip: 'UK.ztracks', names: [/Thruxton/i] },
  knockhill: { targetM: 2090, zip: 'UK.ztracks', names: [/Knockhill/i] },
  anglesey: { targetM: 3380, zip: 'uk-ang.ztracks', names: [/Anglesey International/i] },
  'mallory-park': { targetM: 2180, zip: 'mallory.ztracks', names: [/Mallory/i] },
};

function parseZipLocalFiles(zipBuf) {
  const files = [];
  let offset = 0;
  while (offset + 30 <= zipBuf.length) {
    if (zipBuf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = zipBuf.readUInt16LE(offset + 8);
    const compSize = zipBuf.readUInt32LE(offset + 18);
    const uncompSize = zipBuf.readUInt32LE(offset + 22);
    const nameLen = zipBuf.readUInt16LE(offset + 26);
    const extraLen = zipBuf.readUInt16LE(offset + 28);
    const name = zipBuf.slice(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const stored = zipBuf.slice(dataStart, dataStart + compSize);
    let body;
    if (method === 0) body = stored;
    else if (method === 8) body = inflateRawSync(stored);
    else throw new Error(`${name}: unsupported zip method ${method}`);
    if (uncompSize && body.length !== uncompSize) {
      throw new Error(`${name}: unzip size ${body.length} != ${uncompSize}`);
    }
    files.push({ name, body });
    offset = dataStart + compSize;
  }
  return files;
}

function loadZip(name) {
  const zipPath = path.join(TRACKS_DIR, name);
  return parseZipLocalFiles(fs.readFileSync(zipPath));
}

const zipCache = new Map();
function zipFiles(name) {
  if (!zipCache.has(name)) zipCache.set(name, loadZip(name));
  return zipCache.get(name);
}

function pickLayout(id, spec) {
  const rows = [];
  for (const file of zipFiles(spec.zip)) {
    if (!file.name.endsWith('.tkk')) continue;
    const name = tkkName(file.body);
    if (!spec.names.some((re) => re.test(name))) continue;
    const pts = tkkPoints(file.body);
    if (pts.length < 24) continue;
    const lengthM = pathLengthM(pts);
    rows.push({
      entry: file.name,
      name,
      pts,
      lengthM,
      score: Math.abs(lengthM - spec.targetM),
    });
  }
  rows.sort((a, b) => a.score - b.score);
  return { rows, picked: rows[0] || null };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const written = [];
  const failed = [];
  for (const [id, spec] of Object.entries(SELECT)) {
    const { rows, picked } = pickLayout(id, spec);
    console.log(`\n${id}  target ${spec.targetM} m`);
    for (const row of rows) {
      const mark = picked && row.entry === picked.entry ? '>' : ' ';
      console.log(
        `  ${mark} ${row.lengthM.toFixed(0).padStart(5)} m  ${(row.lengthM / spec.targetM).toFixed(3)}x  ${row.name}  (${row.entry})`
      );
    }
    if (!picked) {
      failed.push(`${id}: no matching .tkk`);
      continue;
    }
    const ratio = picked.lengthM / spec.targetM;
    if (ratio < 0.82 || ratio > 1.18) {
      failed.push(
        `${id}: closest ${picked.name} is ${Math.round(picked.lengthM)} m (${ratio.toFixed(2)}x catalog)`
      );
      continue;
    }
    const dest = path.join(OUT_DIR, `${id}.gpx`);
    fs.writeFileSync(dest, toGpx(id, picked.name, picked.pts));
    written.push({
      id,
      name: picked.name,
      lengthM: Math.round(picked.lengthM),
      pts: picked.pts.length,
      dest: path.relative(ROOT, dest),
    });
  }
  const cadwellSrc = path.join(TRACKS_DIR, 'Cadwell_Park_Full_Circuit.gpx');
  const cadwellDest = path.join(OUT_DIR, 'cadwell-park.gpx');
  if (fs.existsSync(cadwellSrc)) {
    fs.copyFileSync(cadwellSrc, cadwellDest);
    written.push({
      id: 'cadwell-park',
      name: 'Cadwell Park Full Circuit',
      dest: path.relative(ROOT, cadwellDest),
    });
    console.log('\ncadwell-park  copied Cadwell_Park_Full_Circuit.gpx');
  }

  console.log(`\nWrote ${written.length} GPX`);
  for (const row of written) {
    console.log(`  ${row.id}  ${row.lengthM ? `${row.lengthM} m  ${row.pts} pts` : row.name}`);
  }
  if (failed.length) {
    console.error(`\nFAIL ${failed.length}:`);
    for (const line of failed) console.error(`  - ${line}`);
    process.exit(1);
  }
}

main();
