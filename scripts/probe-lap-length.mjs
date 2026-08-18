/**
 * Find the repeating lap length in a GPX trace, independent of the catalog.
 *
 * Used when a catalog lengthKm looks wrong: the bake crops laps against it, so a
 * bad value silently leaves a multi-lap trace uncropped.
 *
 * Usage: node scripts/probe-lap-length.mjs scripts/track-memory-gpx/smp_druitt.gpx
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/probe-lap-length.mjs <gpx path>');
  process.exit(1);
}

const xml = fs.readFileSync(file, 'utf8');
const pts = [];
const re = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/gi;
let m;
while ((m = re.exec(xml))) pts.push({ lat: Number(m[1]), lon: Number(m[2]) });
if (pts.length < 50) {
  console.error(`only ${pts.length} points`);
  process.exit(1);
}

const toRad = (d) => (d * Math.PI) / 180;
const cosLat = Math.cos(toRad(pts[0].lat));
const xy = pts.map((p) => ({
  x: toRad(p.lon - pts[0].lon) * 6371000 * cosLat,
  y: toRad(p.lat - pts[0].lat) * 6371000,
}));

const cum = [0];
for (let i = 1; i < xy.length; i++) {
  cum.push(cum[i - 1] + Math.hypot(xy[i].x - xy[i - 1].x, xy[i].y - xy[i - 1].y));
}
const total = cum[cum.length - 1];
console.log(`${pts.length} points, ${total.toFixed(0)}m of trace`);

/** For a candidate lap length, how well does the trace repeat itself? */
function returnGaps(startIdx) {
  const out = [];
  for (let j = startIdx + 20; j < xy.length; j++) {
    const travel = cum[j] - cum[startIdx];
    if (travel < 800) continue;
    const gap = Math.hypot(xy[j].x - xy[startIdx].x, xy[j].y - xy[startIdx].y);
    if (gap < 40) out.push({ j, travel, gap });
  }
  // Keep the best gap per ~200m travel bucket
  const best = new Map();
  for (const r of out) {
    const key = Math.round(r.travel / 200);
    const cur = best.get(key);
    if (!cur || r.gap < cur.gap) best.set(key, r);
  }
  return [...best.values()].sort((a, b) => a.travel - b.travel);
}

for (const start of [0, Math.round(xy.length * 0.1), Math.round(xy.length * 0.25)]) {
  const gaps = returnGaps(start);
  console.log(
    `\nfrom point ${start}: returns within 40m at ` +
      (gaps.length
        ? gaps.map((g) => `${g.travel.toFixed(0)}m(${g.gap.toFixed(0)}m)`).join('  ')
        : 'never')
  );
}
