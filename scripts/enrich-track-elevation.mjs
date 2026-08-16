/**
 * Fill missing/flat GPX elevation from OpenTopoData (Mapzen DEM).
 *
 * Usage:
 *   node scripts/enrich-track-elevation.mjs baskerville
 *   node scripts/enrich-track-elevation.mjs --all-flat
 *
 * Writes enriched GPX under scripts/track-memory-gpx/<trackId>.gpx.
 * Leaves Desktop Emtron sources untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const ZTRACKS_GPX_DIR = path.join(ROOT, 'scripts', 'track-memory-gpx');
const DEFAULT_GPX_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Desktop',
  'Australian_Track_GPX',
  'gpx'
);

/**
 * Flat Track Memory layouts that need DEM (or already enriched).
 * gpxDir: absolute or repo path; omit → Desktop Emtron folder.
 * skip: true → not included in --all-flat (QR is DEM noise / truly flat).
 */
const DEM_TRACKS = {
  // ztracks centreline (no ele)
  baskerville: { gpxName: 'baskerville.gpx', gpxDir: ZTRACKS_GPX_DIR },
  broadford: { gpxName: 'broadford.gpx', gpxDir: ZTRACKS_GPX_DIR },
  hidden_valley: { gpxName: 'hidden_valley.gpx', gpxDir: ZTRACKS_GPX_DIR },
  mac_park: { gpxName: 'mac_park.gpx', gpxDir: ZTRACKS_GPX_DIR },
  wanneroo: { gpxName: 'wanneroo.gpx', gpxDir: ZTRACKS_GPX_DIR },
  lakeside: { gpxName: 'lakeside.gpx', gpxDir: ZTRACKS_GPX_DIR },
  // Desktop Emtron (ele=0 / noise)
  calder_park: { gpxName: 'Calder_Park_Raceway.gpx' },
  mallala: { gpxName: 'Mallala_Raceway.gpx' },
  morgan_park: { gpxName: 'Morgan_Raceway.gpx' },
  sandown: { gpxName: 'Sandown_Raceway.gpx' },
  smp_druitt: { gpxName: 'Sydney_Motorsport_Park_-_Druitt.gpx' },
  the_bend_gt: { gpxName: 'Tallem_Bend_GT.gpx' },
  the_bend_international: { gpxName: 'Tallem_Bend_International.gpx' },
  winton: { gpxName: 'Winton_Motor_Raceway.gpx' },
  // Already enriched; kept for re-run
  phillip_island: { gpxName: 'phillip_island.gpx', gpxDir: ZTRACKS_GPX_DIR },
  // KB + DEM say flat — skip --all-flat
  queensland_raceway: { gpxName: 'Queensland_Raceway.gpx', skip: true },
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

function resolveSrc(meta) {
  const dir = meta.gpxDir || DEFAULT_GPX_DIR;
  return path.join(dir, meta.gpxName);
}

async function enrichOne(trackId, meta) {
  const src = resolveSrc(meta);
  if (!fs.existsSync(src)) throw new Error(`GPX not found: ${src}`);
  const xml = fs.readFileSync(src, 'utf8');
  const pts = parseTrkpts(xml);
  if (pts.length < 8) throw new Error(`Too few points in ${meta.gpxName}`);
  const span0 = elevSpan(pts);
  console.log(`${trackId}: ${pts.length} pts, GPX elev span ${span0.toFixed(1)} m`);
  let enriched = pts;
  let source = 'gpx';
  if (span0 < MIN_SPAN_M) {
    console.log(`  fetching Mapzen DEM…`);
    enriched = await fetchDem(pts);
    source = 'dem';
  } else {
    console.log(`  already has elevation — writing through`);
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
  let ids = null;
  if (arg === '--all-flat') {
    ids = Object.keys(DEM_TRACKS).filter((id) => !DEM_TRACKS[id].skip);
  } else if (arg && DEM_TRACKS[arg]) {
    ids = [arg];
  }
  if (!ids) {
    console.error(`Usage: node scripts/enrich-track-elevation.mjs <trackId>|--all-flat`);
    console.error(`Known: ${Object.keys(DEM_TRACKS).join(', ')}`);
    process.exit(1);
  }
  const results = [];
  for (const id of ids) {
    results.push(await enrichOne(id, DEM_TRACKS[id]));
  }
  console.log('\nDone:');
  for (const r of results) {
    console.log(`  ${r.trackId}: ${r.span.toFixed(1)} m (${r.source})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
