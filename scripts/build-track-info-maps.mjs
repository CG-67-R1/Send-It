/**
 * Downsample baked Track Memory GPX layouts into compact SVG map polylines.
 *
 * Usage: node scripts/build-track-info-maps.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAYOUT_DIR = path.join(ROOT, 'app', 'src', 'data', 'trackMemory');
const OUT_DIR = path.join(ROOT, 'app', 'src', 'data', 'trackInfo', 'maps');
const STATIONS_PATH = path.join(ROOT, 'app', 'src', 'data', 'trackInfo', 'cornerStations.json');
const STATIONS = JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf8'));

const SISTER_GROUPS = [
  ['smp_gardner', 'smp_brabham', 'smp_druitt'],
  ['the_bend_international', 'the_bend_gt'],
];

const TARGET_POINTS = 320;
const PAD_FRAC = 0.16;

function round(n, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function perpDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function rdp(points, epsilon) {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const d = perpDist(points[i], points[0], points[last]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = rdp(points.slice(0, idx + 1), epsilon);
    const right = rdp(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[last]];
}

function downsample(points) {
  if (points.length <= TARGET_POINTS) return points;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  let epsilon = span / 520;
  let out = rdp(points, epsilon);
  let guard = 0;
  while (out.length > TARGET_POINTS && guard < 12) {
    epsilon *= 1.35;
    out = rdp(points, epsilon);
    guard += 1;
  }
  return out;
}

function cumulative(points) {
  const acc = [0];
  for (let i = 1; i < points.length; i++) {
    acc.push(acc[i - 1] + dist(points[i - 1], points[i]));
  }
  return acc;
}

function interpolateAt(points, acc, sMetres) {
  const total = acc[acc.length - 1] || 1;
  let d = ((sMetres % total) + total) % total;
  for (let i = 1; i < points.length; i++) {
    if (acc[i] >= d) {
      const span = acc[i] - acc[i - 1] || 1;
      const t = (d - acc[i - 1]) / span;
      return {
        x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
      };
    }
  }
  return points[points.length - 1];
}

function headingAt(points, acc, sMetres, lengthM) {
  const a = interpolateAt(points, acc, sMetres);
  const b = interpolateAt(points, acc, sMetres + Math.max(8, lengthM * 0.008));
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function centroid(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n };
}

function loadLayout(trackId) {
  const file = path.join(LAYOUT_DIR, `${trackId}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function groupFor(trackId) {
  return SISTER_GROUPS.find((g) => g.includes(trackId)) ?? [trackId];
}

function makeBounds(allPoints) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of allPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * PAD_FRAC;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = span / 2 + pad;
  return { minX: cx - half, minY: cy - half, size: half * 2 };
}

function toPct(x, y, bounds) {
  const xPct = ((x - bounds.minX) / bounds.size) * 100;
  const yPct = (1 - (y - bounds.minY) / bounds.size) * 100;
  return [round(xPct), round(yPct)];
}

function polylinePct(points, bounds) {
  return downsample(points).map((p) => toPct(p.x, p.y, bounds));
}

function offsetPoint(x, y, heading, distM, awayFrom) {
  const left = {
    x: x + Math.cos(heading + Math.PI / 2) * distM,
    y: y + Math.sin(heading + Math.PI / 2) * distM,
  };
  const right = {
    x: x + Math.cos(heading - Math.PI / 2) * distM,
    y: y + Math.sin(heading - Math.PI / 2) * distM,
  };
  return dist(left, awayFrom) >= dist(right, awayFrom) ? left : right;
}

function offsetPct(x, y, heading, distM, bounds, awayFrom) {
  const chosen = offsetPoint(x, y, heading, distM, awayFrom);
  const [xPct, yPct] = toPct(chosen.x, chosen.y, bounds);
  return { xPct, yPct };
}

function pitLanePolyline(points, acc, lengthM, offsetM, bounds, awayFrom) {
  const samples = [];
  for (let k = 0; k <= 14; k++) {
    const frac = 0.97 + (0.05 * k) / 14;
    const s = (frac % 1) * lengthM;
    const p = interpolateAt(points, acc, s);
    const h = headingAt(points, acc, s, lengthM);
    const o = offsetPoint(p.x, p.y, h, offsetM, awayFrom);
    samples.push(toPct(o.x, o.y, bounds));
  }
  return samples;
}

function stationFor(trackId, cornerId, bakeS) {
  const value = STATIONS[trackId]?.[cornerId];
  return typeof value === 'number' ? value : bakeS;
}

function main() {
  const proof = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'prove-track-maps.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (proof.stdout) process.stdout.write(proof.stdout);
  if (proof.stderr) process.stderr.write(proof.stderr);
  if (proof.status !== 0) {
    console.error(
      'Map rebuild blocked: retrieve official board maps and pit marks, then set mapProof.json status to owner_verified.'
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(LAYOUT_DIR).filter((f) => f.endsWith('.json'));
  const ids = files.map((f) => f.replace(/\.json$/, ''));
  const boundsById = {};

  for (const id of ids) {
    const group = groupFor(id);
    const all = [];
    for (const gid of group) {
      const layout = loadLayout(gid);
      for (const p of layout.points) all.push(p);
    }
    boundsById[id] = makeBounds(all);
  }

  for (const id of ids) {
    const layout = loadLayout(id);
    const bounds = boundsById[id];
    const acc = cumulative(layout.points);
    const c = centroid(layout.points);
    const lengthM = layout.lengthM || acc[acc.length - 1];
    const offsetM = Math.max(28, lengthM * 0.012);

    const corners = (layout.corners || [])
      .filter((corner) => corner.number != null)
      .map((corner) => {
        const sNorm = round(stationFor(id, corner.id, corner.sNorm), 4);
        const p = interpolateAt(layout.points, acc, sNorm * lengthM);
        const [xPct, yPct] = toPct(p.x, p.y, bounds);
        return {
          id: corner.id,
          number: corner.number,
          label: corner.label,
          direction: corner.direction,
          sNorm,
          xPct,
          yPct,
        };
      });

    const start = interpolateAt(layout.points, acc, 0);
    const pitExit = interpolateAt(layout.points, acc, lengthM * 0.02);
    const pitEntry = interpolateAt(layout.points, acc, lengthM * 0.97);
    const hExit = headingAt(layout.points, acc, lengthM * 0.02, lengthM);
    const hEntry = headingAt(layout.points, acc, lengthM * 0.97, lengthM);

    const [sfX, sfY] = toPct(start.x, start.y, bounds);
    const lane = pitLanePolyline(layout.points, acc, lengthM, offsetM, bounds, c);
    const laneMid = lane[Math.floor(lane.length / 2)] ?? [sfX, sfY];

    const sisters = groupFor(id)
      .filter((gid) => gid !== id)
      .map((gid) => {
        const other = loadLayout(gid);
        return { trackId: gid, name: other.name, polyline: polylinePct(other.points, bounds) };
      });

    const out = {
      trackId: id,
      name: layout.name,
      direction: layout.direction,
      lengthM: Math.round(lengthM),
      hasElevation: Boolean(layout.hasElevation),
      elevSpanM: layout.elevSpanM ?? null,
      elevSource: layout.elevSource ?? null,
      polyline: polylinePct(layout.points, bounds),
      sisters,
      corners,
      startFinish: { xPct: sfX, yPct: sfY },
      derivedInfra: [
        {
          id: 'pit_lane',
          kind: 'pit_lane',
          label: 'Pit lane',
          xPct: laneMid[0],
          yPct: laneMid[1],
          polyline: lane,
        },
        { id: 'pit_exit', kind: 'pit_exit', label: 'Pit exit', ...offsetPct(pitExit.x, pitExit.y, hExit, offsetM, bounds, c) },
        { id: 'pit_entry', kind: 'pit_entry', label: 'Pit entry', ...offsetPct(pitEntry.x, pitEntry.y, hEntry, offsetM, bounds, c) },
      ],
    };

    fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), `${JSON.stringify(out, null, 2)}\n`);
    console.log(`  ${id}  pts ${out.polyline.length}  corners ${corners.length}  sisters ${sisters.length}`);
  }

  console.log(`Wrote ${ids.length} maps to ${path.relative(ROOT, OUT_DIR)}`);
}

main();
