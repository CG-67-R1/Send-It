#!/usr/bin/env node
/**
 * Build a closed GPX centreline from an Emtron-style track GeoJSON.
 *
 * Those files mix a centreline with start/finish ticks, sector ticks, corner
 * ticks, and an outer edge. Concatenating every LineString produced the old
 * Druitt GPX (one open 10 km scribble). This keeps the named centreline only
 * and promotes the start tick to a waypoint.
 *
 * Usage:
 *   node scripts/geojson-track-to-gpx.mjs --track smp_druitt
 *   node scripts/geojson-track-to-gpx.mjs --track smp_druitt --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TRACKS = {
  smp_druitt: {
    id: 'smp_druitt',
    name: 'Sydney Motorsport Park (Druitt Circuit)',
    geojson: 'scripts/data/smp-druitt.geojson',
    centreline: 'trackinner',
    startName: 'start',
    spacingM: 6,
    source:
      'Centreline from Emtron Australia Sydney Motorsport Park Druitt GeoJSON (trackinner only). Start/finish is the official start tick projected onto that line. Outer edge, sector ticks, and corner ticks are not the road.',
    sourceUrl:
      'https://docs.emtronaustralia.com.au/tracks/AUS/Sydney%20Motorsport%20Park%20-%20Druitt.geojson',
  },
};

const R = 6371000;
const rad = Math.PI / 180;

function printHelp() {
  console.log(`Build a closed GPX centreline from an Emtron-style track GeoJSON.

Usage:
  node scripts/geojson-track-to-gpx.mjs --track smp_druitt [--write]

Options:
  --track <id>   Layout id (currently: ${Object.keys(TRACKS).join(', ')})
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

function toPoint(coord) {
  return { lon: coord[0], lat: coord[1] };
}

function dropClosedDuplicate(points) {
  if (points.length < 2) return points;
  if (metres(points[0], points[points.length - 1]) < 1) return points.slice(0, -1);
  return points;
}

function interpolate(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

function projectToSegment(p, a, b) {
  const midLat = (a.lat + b.lat) / 2;
  const ax = 0;
  const ay = 0;
  const bx = (b.lon - a.lon) * rad * R * Math.cos(midLat * rad);
  const by = (b.lat - a.lat) * rad * R;
  const px = (p.lon - a.lon) * rad * R * Math.cos(midLat * rad);
  const py = (p.lat - a.lat) * rad * R;
  const den = bx * bx + by * by;
  const t = den <= 1e-12 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / den));
  const snapped = interpolate(a, b, t);
  return { t, point: snapped, distM: metres(p, snapped) };
}

function nearestOnPath(points, target) {
  let best = { i: 0, t: 0, point: points[0], distM: Infinity };
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const hit = projectToSegment(target, a, b);
    if (hit.distM < best.distM) best = { i, t: hit.t, point: hit.point, distM: hit.distM };
  }
  return best;
}

function insertProjected(points, hit) {
  if (hit.t <= 1e-6) return { points, index: hit.i };
  if (hit.t >= 1 - 1e-6) return { points, index: (hit.i + 1) % points.length };
  const next = [...points];
  next.splice(hit.i + 1, 0, hit.point);
  return { points: next, index: hit.i + 1 };
}

function rotateToStart(points, index) {
  return [...points.slice(index), ...points.slice(0, index)];
}

function pathLength(points, closed = false) {
  let n = 0;
  const last = closed ? points.length : points.length - 1;
  for (let i = 0; i < last; i++) {
    n += metres(points[i], points[(i + 1) % points.length]);
  }
  return n;
}

function signedArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.lon * q.lat - q.lon * p.lat;
  }
  return a / 2;
}

function resampleClosed(points, spacingM) {
  const total = pathLength(points, true);
  const count = Math.max(80, Math.round(total / spacingM));
  const out = [];
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    let acc = 0;
    for (let s = 0; s < points.length; s++) {
      const a = points[s];
      const b = points[(s + 1) % points.length];
      const d = metres(a, b);
      if (acc + d >= target || s === points.length - 1) {
        const t = d <= 1e-9 ? 0 : (target - acc) / d;
        out.push(interpolate(a, b, t));
        break;
      }
      acc += d;
    }
  }
  return { points: out, lengthM: total };
}

function writeGpx(cfg, points, waypoint) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="Send-It GeoJSON centreline" xmlns="http://www.topografix.com/GPX/1/1">`,
    '  <metadata>',
    `    <name>${cfg.name}</name>`,
    `    <desc>${cfg.source}</desc>`,
    `    <link href="${cfg.sourceUrl}" />`,
    '  </metadata>',
    `  <wpt lat="${waypoint.lat.toFixed(8)}" lon="${waypoint.lon.toFixed(8)}">`,
    '    <name>start/finish</name>',
    '    <cmt>Official start tick projected onto the inner centreline</cmt>',
    '  </wpt>',
    `  <trk><name>${cfg.id}</name><trkseg>`,
  ];
  for (const p of points) {
    lines.push(`    <trkpt lat="${p.lat.toFixed(8)}" lon="${p.lon.toFixed(8)}"></trkpt>`);
  }
  const first = points[0];
  lines.push(`    <trkpt lat="${first.lat.toFixed(8)}" lon="${first.lon.toFixed(8)}"></trkpt>`);
  lines.push('  </trkseg></trk>', '</gpx>', '');
  return lines.join('\n');
}

function featureByName(geo, name) {
  const feature = (geo.features || []).find((f) => f?.properties?.name === name);
  if (!feature) throw new Error(`GeoJSON has no feature named "${name}"`);
  if (feature.geometry?.type !== 'LineString') {
    throw new Error(`feature "${name}" is ${feature.geometry?.type}, not LineString`);
  }
  return feature.geometry.coordinates.map(toPoint);
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

  const geo = JSON.parse(fs.readFileSync(path.join(ROOT, cfg.geojson), 'utf8'));
  const inner = dropClosedDuplicate(featureByName(geo, cfg.centreline));
  if (inner.length < 40) throw new Error(`${cfg.centreline} flattened to ${inner.length} points`);

  const startTick = featureByName(geo, cfg.startName);
  const startMid = {
    lat: (startTick[0].lat + startTick[startTick.length - 1].lat) / 2,
    lon: (startTick[0].lon + startTick[startTick.length - 1].lon) / 2,
  };

  const hit = nearestOnPath(inner, startMid);
  if (hit.distM > 25) {
    throw new Error(
      `start tick is ${hit.distM.toFixed(1)}m from ${cfg.centreline}; expected it on the road`
    );
  }
  const inserted = insertProjected(inner, hit);
  const started = rotateToStart(inserted.points, inserted.index);
  if (signedArea(started) < 0) {
    throw new Error(`${cfg.id} centreline is clockwise after rotation; Druitt must stay CCW`);
  }

  const sampled = resampleClosed(started, cfg.spacingM);
  const first = sampled.points[0];
  const second = sampled.points[1];
  const towardWest = second.lon < first.lon;
  if (!towardWest) {
    throw new Error(
      `${cfg.id} leaves start/finish heading east; expected west toward Turn 1`
    );
  }

  console.log(
    `${cfg.id}: ${inner.length} ${cfg.centreline} pts -> ${sampled.points.length} gpx pts, ` +
      `${(sampled.lengthM / 1000).toFixed(3)} km, S/F snap ${hit.distM.toFixed(1)}m`
  );
  console.log(`  start ${first.lat.toFixed(6)},${first.lon.toFixed(6)}`);

  const outPath = path.join(ROOT, 'scripts', 'track-memory-gpx', `${cfg.id}.gpx`);
  if (!args.write) {
    console.log(`Dry run. Pass --write to replace ${path.relative(ROOT, outPath)}`);
    return;
  }
  fs.writeFileSync(outPath, writeGpx(cfg, sampled.points, first), 'utf8');
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
}

main();
