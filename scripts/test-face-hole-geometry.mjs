#!/usr/bin/env node
/**
 * Unit checks for avatar face-hole crop / layout math (no RN runtime).
 * Mirrors app/src/avatar/faceHoleGeometry.ts + presets constants.
 *
 * Usage: node scripts/test-face-hole-geometry.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAPTURE_PREVIEW_SCALE = 0.42;
const AVATAR_ART_WIDTH = 1024;
const AVATAR_ART_HEIGHT = 1536;

function readDefaultLayout() {
  const src = readFileSync(join(ROOT, 'app/src/avatar/presets.ts'), 'utf8');
  const m = src.match(
    /export const DEFAULT_FACE_HOLE_LAYOUT: FaceHoleLayout = \{[\s\S]*?leftPct:\s*([\d.]+),\s*topPct:\s*([\d.]+),\s*widthPct:\s*([\d.]+),\s*heightPct:\s*([\d.]+),/
  );
  if (!m) throw new Error('parse DEFAULT_FACE_HOLE_LAYOUT failed');
  return {
    leftPct: Number(m[1]),
    topPct: Number(m[2]),
    widthPct: Number(m[3]),
    heightPct: Number(m[4]),
  };
}

function captureHoleFromCoverPreview(imageW, imageH, camW, camH, holeW, holeH) {
  const s = Math.max(camW / Math.max(imageW, 1), camH / Math.max(imageH, 1));
  const dispW = imageW * s;
  const dispH = imageH * s;
  const offX = (camW - dispW) / 2;
  const offY = (camH - dispH) / 2;
  const holeLeft = (camW - holeW) / 2;
  const holeTop = (camH - holeH) / 2;
  const map = (sx, sy) => ({ x: (sx - offX) / s, y: (sy - offY) / s });
  const tl = map(holeLeft, holeTop);
  const br = map(holeLeft + holeW, holeTop + holeH);
  let x0 = Math.min(tl.x, br.x);
  let y0 = Math.min(tl.y, br.y);
  let x1 = Math.max(tl.x, br.x);
  let y1 = Math.max(tl.y, br.y);
  x0 = Math.max(0, Math.min(imageW, x0));
  y0 = Math.max(0, Math.min(imageH, y0));
  x1 = Math.max(0, Math.min(imageW, x1));
  y1 = Math.max(0, Math.min(imageH, y1));
  const originX = Math.floor(x0);
  const originY = Math.floor(y0);
  return {
    originX,
    originY,
    width: Math.max(1, Math.min(Math.floor(x1 - x0), imageW - originX)),
    height: Math.max(1, Math.min(Math.floor(y1 - y0), imageH - originY)),
  };
}

function computeFaceHole(badgeSize, layout) {
  const scale = Math.min(badgeSize / AVATAR_ART_WIDTH, badgeSize / AVATAR_ART_HEIGHT);
  const drawnW = AVATAR_ART_WIDTH * scale;
  const drawnH = AVATAR_ART_HEIGHT * scale;
  const originX = (badgeSize - drawnW) / 2;
  const originY = (badgeSize - drawnH) / 2;
  const left = originX + layout.leftPct * drawnW;
  const top = originY + layout.topPct * drawnH;
  const ew = layout.widthPct * drawnW;
  const eh = layout.heightPct * drawnH;
  return { left, top, ew, eh, cx: left + ew / 2, cy: top + eh / 2 };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const layout = readDefaultLayout();

// Pixel circle in art space → equal hole sides after contain into square badge.
const artW = layout.widthPct * AVATAR_ART_WIDTH;
const artH = layout.heightPct * AVATAR_ART_HEIGHT;
assert(Math.abs(artW - artH) < 3, `layout should be ~pixel circle (Δ=${(artW - artH).toFixed(2)}px)`);

const hole = computeFaceHole(300, layout);
assert(Math.abs(hole.ew - hole.eh) < 1.5, `badge hole should be ~circle (ew=${hole.ew}, eh=${hole.eh})`);

// Cam larger than hole by CAPTURE_PREVIEW_SCALE; hole centered in cam.
const camW = hole.ew / CAPTURE_PREVIEW_SCALE;
const camH = hole.eh / CAPTURE_PREVIEW_SCALE;

// Square frame matching cam aspect → cover is identity scale; hole = center fraction.
const matched = captureHoleFromCoverPreview(1000, 1000, camW, camH, hole.ew, hole.eh);
assert(matched.width === matched.height, 'square frame → square hole crop');
assert(Math.abs(matched.width / 1000 - CAPTURE_PREVIEW_SCALE) < 0.02, 'matched frame → ~preview scale');

// Wide full video (web-style): cover into square-ish cam, hole still centered.
const wide = captureHoleFromCoverPreview(1920, 1080, camW, camH, hole.ew, hole.eh);
assert(wide.width > 0 && wide.height > 0, 'wide frame yields crop');
assert(wide.originX > 0, 'wide frame crops sides');
assert(Math.abs(wide.width / wide.height - hole.ew / hole.eh) < 0.05, 'wide crop keeps hole aspect');

const tall = captureHoleFromCoverPreview(1080, 1920, camW, camH, hole.ew, hole.eh);
assert(tall.width > 0 && tall.height > 0, 'tall frame yields crop');
assert(tall.originY > 0, 'tall frame crops top/bottom');

console.log('PASS: face-hole geometry checks');
console.log(`  layout=${JSON.stringify(layout)}`);
console.log(`  art circle Δpx=${(artW - artH).toFixed(2)}  badge ew/eh=${(hole.ew / hole.eh).toFixed(4)}`);
console.log(`  cover-preview crop wide=${wide.width}x${wide.height} tall=${tall.width}x${tall.height}`);
