/**
 * Rides every baked layout through the real physics + projection pipeline and
 * fails on anything the renderer cannot draw: exceptions, non-finite screen
 * coordinates, or an empty road. Run: npx --yes tsx src/trackMemory/__tests__/frames.golden.ts
 */
import { TRACK_MEMORY_TRACK_IDS, getTrackMemoryLayout } from '../layouts';
import { createInitialState, samplePath, stepGame } from '../physics';
import { NATIVE_QUALITY, projectRoad } from '../projectRoad';
import type { ControlState } from '../types';

const WIDTH = 812;
const HEIGHT = 375;
const DT = 1 / 60;
const FRAMES = 60 * 40;
const CONTROLS: ControlState = { left: false, right: false, accel: true, brake: false };

type Failure = { trackId: string; frame: number; detail: string };

function checkFinite(pts: [number, number][]): string | null {
  for (const [x, y] of pts) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return `non-finite point ${x},${y}`;
  }
  return null;
}

const failures: Failure[] = [];

for (const trackId of TRACK_MEMORY_TRACK_IDS) {
  const layout = getTrackMemoryLayout(trackId);
  if (!layout) {
    failures.push({ trackId, frame: -1, detail: 'no layout returned' });
    continue;
  }

  let state = createInitialState(null);
  state.heading = samplePath(layout.points, layout.lengthM, 0).heading;
  let minQuads = Infinity;
  let maxQuads = 0;
  let markerFrames = 0;
  let now = Date.now();

  for (let frame = 0; frame < FRAMES; frame++) {
    now += DT * 1000;
    try {
      state = stepGame(state, layout, CONTROLS, DT, now);
      const projected = projectRoad(
        layout,
        state.s,
        state.lateral,
        WIDTH,
        HEIGHT,
        state.heading,
        NATIVE_QUALITY
      );

      if (!Number.isFinite(state.s) || !Number.isFinite(state.heading)) {
        failures.push({ trackId, frame, detail: `bad state s=${state.s} heading=${state.heading}` });
        break;
      }
      minQuads = Math.min(minQuads, projected.quads.length);
      maxQuads = Math.max(maxQuads, projected.quads.length);
      if (projected.markers.length > 0) markerFrames++;

      let bad: string | null = null;
      for (const q of projected.quads) {
        bad = checkFinite(q.points);
        if (bad) break;
      }
      if (!bad) {
        for (const g of projected.grassQuads) {
          bad = checkFinite(g);
          if (bad) break;
        }
      }
      if (bad) {
        failures.push({ trackId, frame, detail: bad });
        break;
      }
    } catch (err) {
      failures.push({ trackId, frame, detail: `threw: ${(err as Error).message}` });
      break;
    }
  }

  const laps = state.lap;
  const flag = minQuads === 0 ? '  <-- EMPTY ROAD SOME FRAMES' : '';
  console.log(
    `${trackId.padEnd(26)} quads ${String(minQuads).padStart(3)}-${String(maxQuads).padStart(3)}` +
      `  markerFrames ${String(markerFrames).padStart(4)}  lap ${laps}  s=${Math.round(state.s)}${flag}`
  );
  if (minQuads === 0) {
    failures.push({ trackId, frame: -1, detail: 'road had zero quads on at least one frame' });
  }
}

if (failures.length > 0) {
  console.error(`\nFAIL (${failures.length}):`);
  for (const f of failures) {
    console.error(`  ${f.trackId} @frame ${f.frame}: ${f.detail}`);
  }
  process.exit(1);
}
console.log('\nPASS - every layout projects finite, non-empty frames');
