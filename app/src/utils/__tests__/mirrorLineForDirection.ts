/**
 * Run: npx tsx src/utils/__tests__/mirrorLineForDirection.ts
 *
 * Opposite-direction racing lines are mirrored through the closed centreline.
 * An open snap skips the join from the last ribbon point back to the first
 * and can throw the guide line off the asphalt.
 */
import macLineJson from '../../data/racingLines/mac_park.json';
import macMapJson from '../../data/gpxTrackMaps/mac_park.json';
import { mirrorLineForDirection as mirrorApp } from '../snapToRibbon';
import { mirrorLineForDirection as mirrorAndroid } from '../../../../android-app/src/utils/snapToRibbon';

const SURFACE_HALF_UNITS = 0.6;

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

type Line = { polyline: number[][]; bands: number[] };

function dist(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Furthest point from the closed ribbon, in map units. */
function maxStray(points: number[][], ribbon: number[][]): number {
  let worst = 0;
  for (const p of points) {
    let best = Infinity;
    for (let i = 0; i < ribbon.length; i += 1) {
      const a = ribbon[i];
      const b = ribbon[(i + 1) % ribbon.length];
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const len2 = abx * abx + aby * aby;
      const t =
        len2 < 1e-12
          ? 0
          : Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2));
      best = Math.min(best, Math.hypot(p[0] - (a[0] + abx * t), p[1] - (a[1] + aby * t)));
    }
    if (best > worst) worst = best;
  }
  return worst;
}

function maxStep(points: number[][]): number {
  let worst = 0;
  for (let i = 1; i < points.length; i += 1) {
    worst = Math.max(worst, dist(points[i - 1], points[i]));
  }
  return worst;
}

/**
 * Clockwise box on the picture, not closed. The guide line sits just outside
 * the missing edge, which is the segment an open snap never sees.
 */
const openBox: number[][] = [
  [0, 0],
  [20, 0],
  [20, 10],
  [0, 10],
];
const outsideMissingEdge: Line = {
  polyline: [
    [-0.4, 2],
    [-0.4, 4],
    [-0.4, 6],
    [-0.4, 8],
  ],
  bands: [0, 0, 1, 1],
};

function checkMirror(label: string, mirror: typeof mirrorApp): void {
  const same = mirror(outsideMissingEdge, openBox, 'clockwise');
  assert(`${label} keeps the GPX direction`, same === outsideMissingEdge);

  const flipped = mirror(outsideMissingEdge, openBox, 'anticlockwise');
  const stray = maxStray(flipped.polyline, openBox);
  assert(
    `${label} opposite direction stays on the asphalt`,
    stray <= SURFACE_HALF_UNITS + 1e-6,
    `stray ${stray.toFixed(3)}`
  );
  assert(
    `${label} opposite direction does not jump`,
    maxStep(flipped.polyline) < 3,
    `step ${maxStep(flipped.polyline).toFixed(3)}`
  );
  assert(
    `${label} brake bands stay with their points`,
    flipped.bands.join(',') === '1,1,0,0'
  );
}

checkMirror('app', mirrorApp);
checkMirror('android', mirrorAndroid);

const macRibbon = macMapJson.polyline;
const macLine: Line = {
  polyline: macLineJson.polyline,
  bands: macLineJson.bands,
};

for (const [label, mirror] of [
  ['app', mirrorApp],
  ['android', mirrorAndroid],
] as const) {
  const flipped = mirror(macLine, macRibbon, 'anticlockwise');
  const stray = maxStray(flipped.polyline, macRibbon);
  const step = maxStep(flipped.polyline);
  assert(
    `${label} Mac Park anticlockwise stays on the asphalt`,
    stray <= SURFACE_HALF_UNITS + 1e-3,
    `stray ${stray.toFixed(3)}`
  );
  assert(
    `${label} Mac Park anticlockwise does not jump the infield`,
    step < 2,
    `step ${step.toFixed(3)}`
  );
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('mirrorLineForDirection ok');
