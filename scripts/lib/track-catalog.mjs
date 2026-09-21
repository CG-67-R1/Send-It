/**
 * AU tracks.json plus bundled pack tracks (UK, …). AU catalog wins on id clash.
 */
import fs from 'node:fs';
import path from 'node:path';

const CATALOG_FILES = [
  'app/src/data/tracks.json',
  'app/src/packs/bundled/uk/tracks/tracks.json',
];

export function loadMergedTracksById(root) {
  const byId = {};
  for (const rel of CATALOG_FILES) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const track of doc.tracks || []) {
      if (!track?.id || byId[track.id]) continue;
      byId[track.id] = track;
    }
  }
  return byId;
}

export function jsIdentFromTrackId(id) {
  return String(id).replace(/[-_]([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function jsKeyFromTrackId(id) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(id) ? id : `'${id}'`;
}
