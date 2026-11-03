#!/usr/bin/env node
import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(API_DIR, '..');
const NOTES_FILE = path.join(API_DIR, 'data', 'coach-track-notes.json');
const VERIFICATION_FILE = path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json');

function phrase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHand(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'l' || raw === 'left') return 'left';
  if (raw === 'r' || raw === 'right') return 'right';
  return '';
}

function verificationKey(id, layoutName = '') {
  const layout = phrase(layoutName);
  if (id === 'sydney_motorsport_park') {
    if (layout.includes('gardner')) return 'smp_gardner';
    if (layout.includes('brabham')) return 'smp_brabham';
    if (layout.includes('druitt')) return 'smp_druitt';
  }
  if (id === 'the_bend_motorsport_park') {
    if (layout.includes('gt')) return 'the_bend_gt';
    if (layout.includes('international')) return 'the_bend_international';
  }
  if (id === 'one_raceway' && layout.includes('wakefield')) return 'wakefield_park';
  if (id === 'queensland_raceway_national') return 'queensland_raceway';
  if (id === 'winton_motor_raceway') return 'winton';
  return id;
}

function verifiedHandFor(verification, key, n) {
  if (!key || verification.forceAllComplex?.includes(key)) return '';
  const source = verification.handSources?.[key]?.[String(n)];
  const method = String(source?.method || '');
  const allowed = new Set(verification.allowedSourceMethods || []);
  const banned = new Set(verification.bannedSourceMethods || []);
  const hand = normalizeHand(source?.hand);
  const locked = normalizeHand(verification.verifiedHands?.[key]?.[String(n)]);
  if (!hand || hand !== locked) return '';
  if (!allowed.has(method) || banned.has(method)) return '';
  return hand;
}

const notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')).tracks || [];
const verification = JSON.parse(fs.readFileSync(VERIFICATION_FILE, 'utf8'));

let checked = 0;
for (const track of notes) {
  const key = verificationKey(track.id, track.layout);
  for (const turn of track.turns || []) {
    checked += 1;
    assert.equal(
      turn.hand,
      verifiedHandFor(verification, key, turn.n),
      `${track.id}${track.layout ? `/${track.layout}` : ''} T${turn.n} must use a verified hand`
    );
  }
}

const byId = (id, layout = '') =>
  notes.find((track) => track.id === id && (!layout || track.layout === layout));

assert.equal(byId('phillip_island').turns.find((turn) => turn.n === 5)?.hand, 'left');
assert.equal(byId('phillip_island').turns.find((turn) => turn.n === 9)?.hand, 'right');
assert.equal(byId('sydney_motorsport_park', 'Brabham Extended Circuit').turns.length, 0);
assert.equal(
  notes.filter((track) => track.pack === 'uk').reduce((sum, track) => sum + track.turns.length, 0),
  0,
  'UK Coach notes must not export turn hands until they have verification entries'
);

console.log(`Verified ${checked} Coach track-note hands against track_turn_verification.json`);
