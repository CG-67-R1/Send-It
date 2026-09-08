/**
 * Corner-numbering offsets per layout, from two sources with a clear precedence.
 *
 * Rider confirmation outranks offsets derived from verified hands, because hand
 * evidence can be perfect and still wrong: Mac Park scored 10/10 on a derived
 * offset that placed start/finish in the infield rather than on a straight.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DERIVED_PATH = path.join(ROOT, 'scripts', 'data', 'gpx-start-finish-alignment.json');
export const CONFIRMED_PATH = path.join(ROOT, 'scripts', 'data', 'gpx-start-finish-confirmed.json');

function readLayouts(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')).layouts || {};
}

export function loadCornerShifts() {
  const shifts = {};
  for (const [id, entry] of Object.entries(readLayouts(DERIVED_PATH))) {
    shifts[id] = { cornerShift: entry.cornerShift, source: 'derived_from_verified_hands' };
  }
  for (const [id, entry] of Object.entries(readLayouts(CONFIRMED_PATH))) {
    shifts[id] = {
      cornerShift: entry.cornerShift,
      source: 'rider_confirmed',
      mainStraight: entry.mainStraight,
    };
  }
  return shifts;
}

/** Rider-confirmed offsets only, for tools that must not treat derived ones as truth. */
export function loadConfirmedShifts() {
  return readLayouts(CONFIRMED_PATH);
}

export function cornerShiftFor(shifts, trackId) {
  return shifts[trackId]?.cornerShift ?? 0;
}
