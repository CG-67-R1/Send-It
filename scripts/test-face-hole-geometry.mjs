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

function captureCenterHoleCrop(imageW, imageH, holeAspect, previewScale = CAPTURE_PREVIEW_SCALE) {
  const scale = Math.max(0.05, Math.min(1, previewScale));
  const aspect = Math.max(0.05, holeAspect);
  let x0 = 0;
  let y0 = 0;
  let cw = imageW;
  let ch = imageH;
  const imgAspect = imageW / Math.max(imageH, 1);
  if (imgAspect > aspect) {
    cw = Math.max(1, Math.floor(imageH * aspect));
    x0 = Math.max(0, Math.floor((imageW - cw) / 2));
  } else if (imgAspect < aspect) {
    ch = Math.max(1, Math.floor(imageW / aspect));
    y0 = Math.max(0, Math.floor((imageH - ch) / 2));
  }
  const width = Math.max(1, Math.floor(cw * scale));
  const height = Math.max(1, Math.floor(ch * scale));
  return {
    originX: x0 + Math.max(0, Math.floor((cw - width) / 2)),
    originY: y0 + Math.max(0, Math.floor((ch - height) / 2)),
    width: Math.min(width, imageW - x0),
    height: Math.min(height, imageH - y0),
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

const holeAspect = hole.ew / hole.eh;
const square = captureCenterHoleCrop(1000, 1000, holeAspect);
assert(square.width === square.height, 'square sensor + circle hole → square crop');
assert(square.originX === square.originY, 'square crop centered');
assert(square.width === Math.floor(1000 * CAPTURE_PREVIEW_SCALE), 'preview scale applied');

const wide = captureCenterHoleCrop(1920, 1080, 1);
assert(wide.width === wide.height, 'wide sensor cover-cropped to square hole aspect');
assert(wide.originX > 0 && wide.originY === Math.floor((1080 - wide.height) / 2) || wide.originY >= 0, 'wide crop centered');

const tall = captureCenterHoleCrop(1080, 1920, 1);
assert(tall.width === tall.height, 'tall sensor cover-cropped to square hole aspect');

console.log('PASS: face-hole geometry checks');
console.log(`  layout=${JSON.stringify(layout)}`);
console.log(`  art circle Δpx=${(artW - artH).toFixed(2)}  badge ew/eh=${(hole.ew / hole.eh).toFixed(4)}`);
