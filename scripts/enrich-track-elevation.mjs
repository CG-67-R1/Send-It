/**
 * Fill missing/flat GPX elevation from OpenTopoData (Mapzen DEM).
 *
 * Usage:
 *   node scripts/enrich-track-elevation.mjs phillip_island
 *   node scripts/enrich-track-elevation.mjs --all-flat
 *
 * Writes enriched GPX under scripts/track-memory-gpx/ and leaves Desktop sources untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const DEFAULT_GPX_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Desktop',
  'Australian_Track_GPX',
  'gpx'
);

/** Tracks that need DEM because Emtron GPX elevation is missing/zero. */
const DEM_TRACKS = {
  phillip_island: 'Phillip_Island.gpx',
};

const MIN_SPAN_M = 5;
const BATCH = 90;
const SLEEP_MS = 1100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function elevSpan(pts) {
  const eles = pts.map((p) => p.ele).filter((e) => Number.isFinite(e));
  if (!eles.length) return 0;
  return Math.max(...eles) - Math.min(...eles);
}

function parseTrkpts(gpxXml) {
  const pts = [];
  const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let m;
  while ((m = re.exec(gpxXml))) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    const eleM = /<ele>([^<]+)<\/ele>/i.exec(m[3]);
    const ele = eleM ? Number(eleM[1]) : 0;
    pts.push({ lat, lon, ele });
  }
  return pts;
}

async function fetchDem(pts) {
  const out = pts.map((p) => ({ ...p }));
  for (let i = 0; i < pts.length; i += BATCH) {
    const batch = pts.slice(i, i + BATCH);
    const locs = batch.map((p) => `${p.lat},${p.lon}`).join('|');
    const url = `https://api.opentopodata.org/v1/mapzen?locations=${encodeURIComponent(locs)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Send-It-TrackMemory/1.0' } });
    if (!res.ok) throw new Error(`OpenTopoData HTTP ${res.status}`);
    const data = await res.json();
    const results = data.results || [];
    if (results.length !== batch.length) {
      throw new Error(`DEM batch size mismatch ${results.length} vs ${batch.length}`);
    }
    for (let j = 0; j < batch.length; j++) {
      const elev = results[j]?.elevation;
      if (elev == null || !Number.isFinite(elev)) {
        throw new Error(`Missing elevation at index ${i + j}`);
      }
      out[i + j].ele = elev;
    }
    console.log(`  DEM ${Math.min(i + BATCH, pts.length)}/${pts.length}`);
    if (i + BATCH < pts.length) await sleep(SLEEP_MS);
  }
  return out;
}

function toGpx(name, pts) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Send-It DEM enrich">',
    `  <trk><name>${name}</name><trkseg>`,
  ];
  for (const p of pts) {
    lines.push(
      `    <trkpt lat="${p.lat.toFixed(8)}" lon="${p.lon.toFixed(8)}"><ele>${p.ele.toFixed(3)}</ele></trkpt>`
    );
  }
  lines.push('  </trkseg></trk>', '</gpx>', '');
  return lines.join('\n');
}

async function enrichOne(trackId, gpxName) {
  const src = path.join(DEFAULT_GPX_DIR, gpxName);
  if (!fs.existsSync(src)) throw new Error(`GPX not found: ${src}`);
  const xml = fs.readFileSync(src, 'utf8');
  const pts = parseTrkpts(xml);
  if (pts.length < 8) throw new Error(`Too few points in ${gpxName}`);
  const span0 = elevSpan(pts);
  console.log(`${trackId}: ${pts.length} pts, GPX elev span ${span0.toFixed(1)} m`);
  let enriched = pts;
  let source = 'gpx';
  if (span0 < MIN_SPAN_M) {
    console.log(`  fetching Mapzen DEM…`);
    enriched = await fetchDem(pts);
    source = 'dem';
  }
  const span = elevSpan(enriched);
  if (span < MIN_SPAN_M) {
    throw new Error(`${trackId}: elevation still flat after enrich (${span.toFixed(1)} m)`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outName = `${trackId}.gpx`;
  const outPath = path.join(OUT_DIR, outName);
  fs.writeFileSync(outPath, toGpx(trackId, enriched));
  console.log(`  wrote ${outPath} span=${span.toFixed(1)} m source=${source}`);
  return { trackId, outName, span, source };
}

async function main() {
  const arg = process.argv[2];
  const ids =
    arg === '--all-flat'
      ? Object.keys(DEM_TRACKS)
      : arg && DEM_TRACKS[arg]
        ? [arg]
        : null;
  if (!ids) {
    console.error(`Usage: node scripts/enrich-track-elevation.mjs <trackId>|--all-flat`);
    console.error(`Known: ${Object.keys(DEM_TRACKS).join(', ')}`);
    process.exit(1);
  }
  for (const id of ids) {
    await enrichOne(id, DEM_TRACKS[id]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
