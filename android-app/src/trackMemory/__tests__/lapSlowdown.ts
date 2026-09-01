/**
 * Run: npx tsx src/trackMemory/__tests__/lapSlowdown.ts
 */
import { createInitialState, stepGame } from '../physics';
import type { ControlState, TrackMemoryLayout } from '../types';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const layout: TrackMemoryLayout = {
  trackId: 'test-short',
  name: 'Test Short',
  direction: 'clockwise',
  lengthM: 10,
  points: [
    { x: 0, y: 0 },
    { x: 0, y: 10 },
  ],
  corners: [],
};

const controls: ControlState = { left: false, right: false, accel: true, brake: false };
const nowMs = 1_000_000;
const state = createInitialState(null);
state.phase = 'racing';
state.s = 9.9;
state.speed = 20;
state.lapTimeMs = 12_000;
state.slowIds = ['previous-lap-corner'];
state.slowUntilMs = nowMs + 4_000;
state.slowCap = 6;

const next = stepGame(state, layout, controls, 1 / 20, nowMs);

assert('test crosses into lap 2', next.lap === 2, `lap=${next.lap}, s=${next.s}`);
assert('lap boundary clears slowdown timer', next.slowUntilMs === null, String(next.slowUntilMs));
assert('lap boundary clears slowdown cap', next.slowCap === 0, String(next.slowCap));
assert('lap boundary clears slowdown ids', next.slowIds.length === 0, next.slowIds.join(', '));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll Track Memory lap slowdown tests passed.');
