#!/usr/bin/env node
/**
 * Build a closed GPX centreline from a vector track-map SVG.
 *
 * An SVG is a drawing, not a survey. This flattens the named path, flips
 * screen-Y so +Y is north, then applies a similarity transform from two
 * known GPS anchors (the shared Wanneroo main-straight ends).
 *
 * Usage:
 *   node scripts/svg-track-to-gpx.mjs --track wanneroo
 *   node scripts/svg-track-to-gpx.mjs --track mallala
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { reviewAndRepairGpx } from './lib/gpx-trace-review.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Wanneroo long course. Anchors are the north and south ends of the western
 * main straight, taken from the existing short-circuit GPX which still traces
 * that same piece of asphalt.
 */
const TRACKS = {
  wanneroo: {
    id: 'wanneroo',
    name: 'Wanneroo Raceway (Barbagallo)',
    svg: 'scripts/data/wanneroo-barbagallo-2010.svg',
    pathId: 'path6125',
    layerTranslate: [301.17326, -52.129913],
    spacingM: 6,
    clockwise: true,
    source:
      'Centreline from Will Pittenger, Barbagallo Raceway AKA Wanneroo Park track map, Wikimedia Commons, 2010 (CC BY-SA 3.0). Georeferenced to the shared main-straight ends in the previous Wanneroo GPX.',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Barbagallo_Raceway_AKA_Wanneroo_Park_%28Australia%29_track_map.svg',
    // South end of the western main straight (T7 onto the straight).
    gpsSouth: { lat: -31.6664544, lon: 115.7863253 },
    // North end / T1 (Cat Corner) apex from the short-circuit trace.
    gpsNorth: { lat: -31.6618647, lon: 115.7869648 },
  },
  mallala: {
    id: 'mallala',
    name: 'Mallala Motorsport Park',
    svg: 'scripts/data/mallala-motorsport-park-2010.svg',
    pathId: 'path3122',
    layerTranslate: [131.2105, -42.987801],
    spacingM: 6,
    clockwise: true,
    fitToGpx: 'scripts/track-memory-gpx/mallala.gpx',
    // Red travel arrow on the Will Pittenger map, in layer-1 pixels.
    startSvg: [633.1, 837.1],
    source:
      'Centreline from Will Pittenger, Mallala Motorsport Park in Australia, Wikimedia Commons, 2010 (CC BY-SA 3.0). Georeferenced to the previous Mallala GPX location; the previous trace is not used as the road.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mallala_Motorsport_Park_in_Australia.svg',
  },
};

const R = 6371000;
const rad = Math.PI / 180;

function printHelp() {
  console.log(`Build a closed GPX centreline from a vector track-map SVG.

Usage:
  node scripts/svg-track-to-gpx.mjs --track wanneroo [--write]

Options:
  --track <id>   Layout id (currently: wanneroo, mallala)
  --write        Write scripts/track-memory-gpx/<id>.gpx (default is a dry run)
  --help         Show this help
`);
}

function parseArgs(argv) {
  const args = { track: null, write: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--write') args.write = true;
    else if (token === '--track' && argv[i + 1]) args.track = argv[++i];
    else {
      console.error(`unknown or incomplete option: ${token}`);
      process.exit(2);
    }
  }
  return args;
}

function metres(a, b) {
  const dy = (b.lat - a.lat) * rad * R;
  const dx = (b.lon - a.lon) * rad * R * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(dx, dy);
}

function toLatLon(origin, x, y) {
  return {
    lat: origin.lat + (y / R) * (180 / Math.PI),
    lon: origin.lon + (x / (R * Math.cos(origin.lat * rad))) * (180 / Math.PI),
  };
}

function parsePathD(d) {
  const tokens = [];
  const re = /([MmCcZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
  let m;
  let cmd = null;
  let nums = [];
  const flush = () => {
    if (!cmd || !nums.length) return;
    const arity = cmd === 'c' || cmd === 'C' ? 6 : 2;
    for (let i = 0; i + arity <= nums.length; i += arity) {
      tokens.push({ cmd, nums: nums.slice(i, i + arity) });
    }
    nums = [];
  };
  while ((m = re.exec(d))) {
    if (m[1]) {
      flush();
      cmd = m[1];
      if (cmd === 'z' || cmd === 'Z') tokens.push({ cmd, nums: [] });
    } else {
      nums.push(Number(m[2]));
    }
  }
  flush();
  return tokens;
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0],
    u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1],
  ];
}

function flatEnough(p0, p1, p2, p3, tol) {
  const chord = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) || 1;
  const d1 = Math.abs((p3[0] - p0[0]) * (p0[1] - p1[1]) - (p3[1] - p0[1]) * (p0[0] - p1[0])) / chord;
  const d2 = Math.abs((p3[0] - p0[0]) * (p0[1] - p2[1]) - (p3[1] - p0[1]) * (p0[0] - p2[0])) / chord;
  return Math.max(d1, d2) <= tol;
}

function flattenCubic(p0, p1, p2, p3, out, tol = 0.35) {
  const stack = [[p0, p1, p2, p3]];
  while (stack.length) {
    const [a, b, c, d] = stack.pop();
    if (flatEnough(a, b, c, d, tol)) {
      out.push(d);
      continue;
    }
    const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
    const cd = [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2];
    const abc = [(ab[0] + bc[0]) / 2, (ab[1] + bc[1]) / 2];
    const bcd = [(bc[0] + cd[0]) / 2, (bc[1] + cd[1]) / 2];
    const mid = [(abc[0] + bcd[0]) / 2, (abc[1] + bcd[1]) / 2];
    stack.push([mid, bcd, cd, d], [a, ab, abc, mid]);
  }
}

function pathToPolyline(d, translate) {
  const tokens = parsePathD(d);
  const pts = [];
  let x = 0;
  let y = 0;
  let start = [0, 0];
  for (const tok of tokens) {
    if (tok.cmd === 'M' || tok.cmd === 'm') {
      if (tok.cmd === 'm') {
        x += tok.nums[0];
        y += tok.nums[1];
      } else {
        x = tok.nums[0];
        y = tok.nums[1];
      }
      start = [x, y];
      pts.push([x, y]);
    } else if (tok.cmd === 'c' || tok.cmd === 'C') {
      const p0 = [x, y];
      const p1 =
        tok.cmd === 'c'
          ? [x + tok.nums[0], y + tok.nums[1]]
          : [tok.nums[0], tok.nums[1]];
      const p2 =
        tok.cmd === 'c'
          ? [x + tok.nums[2], y + tok.nums[3]]
          : [tok.nums[2], tok.nums[3]];
      const p3 =
        tok.cmd === 'c'
          ? [x + tok.nums[4], y + tok.nums[5]]
          : [tok.nums[4], tok.nums[5]];
      flattenCubic(p0, p1, p2, p3, pts);
      x = p3[0];
      y = p3[1];
    } else if (tok.cmd === 'z' || tok.cmd === 'Z') {
      if (Math.hypot(x - start[0], y - start[1]) > 1e-6) pts.push(start);
      x = start[0];
      y = start[1];
    }
  }
  return pts.map(([px, py]) => [px + translate[0], py + translate[1]]);
}

function extractPath(svg, pathId) {
  const re = new RegExp(`<path\\b[^>]*\\bid="${pathId}"[^>]*\\bd="([^"]+)"`);
  const byIdFirst = svg.match(re);
  if (byIdFirst) return byIdFirst[1];
  const alt = svg.match(new RegExp(`<path\\b[^>]*\\bd="([^"]+)"[^>]*\\bid="${pathId}"`));
  if (!alt) throw new Error(`no path id="${pathId}"`);
  return alt[1];
}

function dropClose(points, minPx = 0.4) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= minPx) out.push(b);
  }
  return out;
}

function signedArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Ends of the westernmost N-S run — Wanneroo's main straight in this drawing. */
function westernStraightEnds(points) {
  const xs = points.map((p) => p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const band = minX + (maxX - minX) * 0.14;
  const west = points.filter((p) => p[0] <= band);
  if (west.length < 4) throw new Error('could not find a western main straight in the SVG');
  let south = west[0];
  let north = west[0];
  for (const p of west) {
    if (p[1] < south[1]) south = p;
    if (p[1] > north[1]) north = p;
  }
  return { south, north, count: west.length };
}

function resample(points, spacingM, origin, scale) {
  const closed = [...points, points[0]];
  let total = 0;
  const seg = [];
  for (let i = 1; i < closed.length; i++) {
    const d = Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]) * scale;
    seg.push(d);
    total += d;
  }
  const count = Math.max(80, Math.round(total / spacingM));
  const out = [];
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    let acc = 0;
    for (let s = 0; s < seg.length; s++) {
      if (acc + seg[s] >= target || s === seg.length - 1) {
        const t = seg[s] <= 1e-9 ? 0 : (target - acc) / seg[s];
        const a = closed[s];
        const b = closed[s + 1];
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        out.push(toLatLon(origin, x, y));
        break;
      }
      acc += seg[s];
    }
  }
  return { points: out, lengthM: total };
}

function similarityFromAnchors(svgA, svgB, gpsA, gpsB) {
  const svgDx = svgB[0] - svgA[0];
  const svgDy = svgB[1] - svgA[1];
  const svgLen = Math.hypot(svgDx, svgDy);
  const gpsDx = (gpsB.lon - gpsA.lon) * rad * R * Math.cos(gpsA.lat * rad);
  const gpsDy = (gpsB.lat - gpsA.lat) * rad * R;
  const gpsLen = Math.hypot(gpsDx, gpsDy);
  if (svgLen < 1e-6 || gpsLen < 1e-6) throw new Error('anchors are coincident');
  const scale = gpsLen / svgLen;
  const svgAng = Math.atan2(svgDy, svgDx);
  const gpsAng = Math.atan2(gpsDy, gpsDx);
  const rot = gpsAng - svgAng;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const map = (p) => {
    const x0 = (p[0] - svgA[0]) * scale;
    const y0 = (p[1] - svgA[1]) * scale;
    return {
      x: x0 * cos - y0 * sin,
      y: x0 * sin + y0 * cos,
    };
  };
  return { scale, rot, origin: gpsA, map };
}

function rotateToStart(points, index) {
  return [...points.slice(index), ...points.slice(0, index)];
}

function writeGpx(cfg, points, waypoint) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="Send-It SVG centreline" xmlns="http://www.topografix.com/GPX/1/1">`,
    '  <metadata>',
    `    <name>${cfg.name}</name>`,
    `    <desc>${cfg.source}</desc>`,
    `    <link href="${cfg.sourceUrl}" />`,
    '  </metadata>',
  ];
  if (waypoint) {
    lines.push(
      `  <wpt lat="${waypoint.lat.toFixed(8)}" lon="${waypoint.lon.toFixed(8)}">`,
      '    <name>start/finish</name>',
      '    <cmt>Checkered line on the source track map</cmt>',
      '  </wpt>'
    );
  }
  lines.push(`  <trk><name>${cfg.id}</name><trkseg>`);
  for (const p of points) {
    lines.push(`    <trkpt lat="${p.lat.toFixed(8)}" lon="${p.lon.toFixed(8)}"></trkpt>`);
  }
  const first = points[0];
  lines.push(`    <trkpt lat="${first.lat.toFixed(8)}" lon="${first.lon.toFixed(8)}"></trkpt>`);
  lines.push('  </trkseg></trk>', '</gpx>', '');
  return lines.join('\n');
}

function readFitGpx(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const repaired = reviewAndRepairGpx(raw);
  return repaired.points.map((p) => ({ lat: p.lat, lon: p.lon }));
}

function resampleRing(points, count) {
  const closed = [...points, points[0]];
  const seg = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    const d = Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]);
    seg.push(d);
    total += d;
  }
  const out = [];
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    let acc = 0;
    for (let s = 0; s < seg.length; s++) {
      if (acc + seg[s] >= target || s === seg.length - 1) {
        const t = seg[s] <= 1e-9 ? 0 : (target - acc) / seg[s];
        const a = closed[s];
        const b = closed[s + 1];
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        break;
      }
      acc += seg[s];
    }
  }
  return out;
}

function gpxToLocal(points) {
  const origin = points[0];
  return points.map((p) => [
    (p.lon - origin.lon) * rad * R * Math.cos(origin.lat * rad),
    (p.lat - origin.lat) * rad * R,
  ]);
}

function similarityRms(src, dst) {
  const n = src.length;
  const cs = [0, 0];
  const cd = [0, 0];
  for (let i = 0; i < n; i++) {
    cs[0] += src[i][0];
    cs[1] += src[i][1];
    cd[0] += dst[i][0];
    cd[1] += dst[i][1];
  }
  cs[0] /= n;
  cs[1] /= n;
  cd[0] /= n;
  cd[1] /= n;
  let dot = 0;
  let cross = 0;
  let nrmSrc = 0;
  let nrmDst = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i][0] - cs[0];
    const sy = src[i][1] - cs[1];
    const dx = dst[i][0] - cd[0];
    const dy = dst[i][1] - cd[1];
    dot += sx * dx + sy * dy;
    cross += sx * dy - sy * dx;
    nrmSrc += sx * sx + sy * sy;
    nrmDst += dx * dx + dy * dy;
  }
  const scale = Math.sqrt(nrmDst / Math.max(nrmSrc, 1e-9));
  const ang = Math.atan2(cross, dot);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i][0] - cs[0];
    const sy = src[i][1] - cs[1];
    const x = sx * scale * cos - sy * scale * sin + cd[0];
    const y = sx * scale * sin + sy * scale * cos + cd[1];
    sse += (x - dst[i][0]) ** 2 + (y - dst[i][1]) ** 2;
  }
  return {
    rms: Math.sqrt(sse / n),
    scale,
    ang,
    map(p) {
      const sx = p[0] - cs[0];
      const sy = p[1] - cs[1];
      return {
        x: sx * scale * cos - sy * scale * sin + cd[0],
        y: sx * scale * sin + sy * scale * cos + cd[1],
      };
    },
    origin: null,
  };
}

function fitSvgToGpx(svgPts, gpxPts) {
  const dst = gpxToLocal(gpxPts);
  const samples = 180;
  const src0 = resampleRing(svgPts, samples);
  const dst0 = resampleRing(dst, samples);
  let best = null;
  for (const reverse of [false, true]) {
    const srcBase = reverse ? src0.slice().reverse() : src0;
    for (let shift = 0; shift < samples; shift += 1) {
      const src = [...srcBase.slice(shift), ...srcBase.slice(0, shift)];
      const fit = similarityRms(src, dst0);
      if (!best || fit.rms < best.rms) best = { ...fit, reverse, shift };
    }
  }
  const origin = gpxPts[0];
  best.origin = origin;
  best.toLatLon = (p) => {
    const m = best.map(p);
    return {
      lat: origin.lat + (m.y / R) * (180 / Math.PI),
      lon: origin.lon + (m.x / (R * Math.cos(origin.lat * rad))) * (180 / Math.PI),
    };
  };
  return best;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.track) {
    printHelp();
    if (!args.track && !args.help) process.exit(2);
    return;
  }
  const cfg = TRACKS[args.track];
  if (!cfg) {
    console.error(`unknown track ${args.track}; known: ${Object.keys(TRACKS).join(', ')}`);
    process.exit(2);
  }

  const svg = fs.readFileSync(path.join(ROOT, cfg.svg), 'utf8');
  const raw = dropClose(pathToPolyline(extractPath(svg, cfg.pathId), cfg.layerTranslate));
  if (raw.length < 40) throw new Error(`path ${cfg.pathId} flattened to ${raw.length} points`);

  let local;
  let fitMeta;
  let origin;
  if (cfg.fitToGpx) {
    const fitPath = path.join(ROOT, cfg.fitToGpx);
    const gpxPts = readFitGpx(fitPath);
    const fit = fitSvgToGpx(raw, gpxPts);
    local = raw.map((p) => {
      const m = fit.map(p);
      return [m.x, m.y];
    });
    origin = fit.origin;
    fitMeta = {
      scale: fit.scale,
      rot: fit.ang,
      rms: fit.rms,
      reverse: fit.reverse,
    };
  } else {
    // Screen Y grows down. Flip so +Y is north before measuring headings.
    const northUp = raw.map(([x, y]) => [x, -y]);
    const straight = westernStraightEnds(northUp);
    const fit = similarityFromAnchors(straight.south, straight.north, cfg.gpsSouth, cfg.gpsNorth);
    local = northUp.map((p) => {
      const m = fit.map(p);
      return [m.x, m.y];
    });
    origin = fit.origin;
    fitMeta = { scale: fit.scale, rot: fit.rot, rms: null, reverse: false };
  }

  // Clockwise in north-up local metres has negative signed area (y north).
  const area = signedArea(local);
  const oriented = area < 0 === cfg.clockwise ? local : local.slice().reverse();
  const rawOriented = area < 0 === cfg.clockwise ? raw : raw.slice().reverse();

  let start = 0;
  if (cfg.startSvg) {
    let best = Infinity;
    for (let i = 0; i < rawOriented.length; i++) {
      const d = Math.hypot(rawOriented[i][0] - cfg.startSvg[0], rawOriented[i][1] - cfg.startSvg[1]);
      if (d < best) {
        best = d;
        start = i;
      }
    }
  } else {
    // Wanneroo: start on the main straight, just south of mid-straight, heading north to T1.
    let best = Infinity;
    for (let i = 0; i < oriented.length; i++) {
      const p = oriented[i];
      const d = Math.hypot(p[0], p[1] + 80);
      if (d < best) {
        best = d;
        start = i;
      }
    }
  }
  const started = rotateToStart(oriented, start);
  const sampled = resample(started, cfg.spacingM, origin, 1);

  let length = 0;
  for (let i = 1; i < sampled.points.length; i++) {
    length += metres(sampled.points[i - 1], sampled.points[i]);
  }
  length += metres(sampled.points[sampled.points.length - 1], sampled.points[0]);

  console.log(
    `${cfg.id}: ${raw.length} svg pts -> ${sampled.points.length} gpx pts, ` +
      `${(length / 1000).toFixed(3)} km, scale ${fitMeta.scale.toFixed(3)} m/px, ` +
      `rotation ${((fitMeta.rot * 180) / Math.PI).toFixed(1)} deg` +
      (fitMeta.rms != null ? `, fit RMS ${fitMeta.rms.toFixed(1)}m` : '')
  );
  console.log(`  start ${sampled.points[0].lat.toFixed(6)},${sampled.points[0].lon.toFixed(6)}`);

  const outPath = path.join(ROOT, 'scripts', 'track-memory-gpx', `${cfg.id}.gpx`);
  if (!args.write) {
    console.log(`Dry run. Pass --write to replace ${path.relative(ROOT, outPath)}`);
    return;
  }
  fs.writeFileSync(outPath, writeGpx(cfg, sampled.points, sampled.points[0]), 'utf8');
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
}

main();
