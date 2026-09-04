#!/usr/bin/env node
/**
 * Inventory every turn listed on Track Details maps, plus current catalog
 * shape / approachFrom when the corner id matches.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPS_DIR = path.join(ROOT, 'app/src/data/trackInfo/maps');
const CATALOG_PATH = path.join(ROOT, 'packs/regions/au/tracks/tracks.json');
const OUT_DIR = path.join(ROOT, 'docs/reviews/track-turn-gpt-review');
const OUT_PATH = path.join(OUT_DIR, 'inventory.json');

function catalogById(catalog) {
  const tracks = new Map();
  const corners = new Map();
  for (const track of catalog.tracks ?? []) {
    tracks.set(track.id, track);
    for (const corner of track.corners ?? []) {
      corners.set(corner.id, corner);
    }
  }
  return { tracks, corners };
}

const maps = [];
for (const file of (await readdir(MAPS_DIR)).filter((f) => f.endsWith('.json')).sort()) {
  maps.push(JSON.parse(await readFile(path.join(MAPS_DIR, file), 'utf8')));
}
const catalog = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
const { tracks: catTracks, corners: catCorners } = catalogById(catalog);

const inventory = {
  generatedAt: new Date().toISOString(),
  source: 'app/src/data/trackInfo/maps',
  trackCount: maps.length,
  turnCount: 0,
  tracks: [],
};

for (const map of maps) {
  const cat = catTracks.get(map.trackId);
  const turns = (map.corners ?? []).map((corner) => {
    const catCorner = catCorners.get(corner.id);
    return {
      id: corner.id,
      number: corner.number,
      label: corner.label,
      direction: corner.direction,
      catalogMatch: Boolean(catCorner),
      current: {
        shape: catCorner?.shape ?? null,
        approachFrom: catCorner?.approachFrom ?? null,
        orientation: catCorner?.orientation ?? null,
        catalogLabel: catCorner?.label ?? null,
        catalogDirection: catCorner?.direction ?? null,
      },
    };
  });
  inventory.tracks.push({
    trackId: map.trackId,
    name: map.name,
    direction: map.direction,
    lengthM: map.lengthM,
    catalogName: cat?.name ?? null,
    catalogCornerCount: cat?.corners?.filter((c) => !c.isFinish).length ?? 0,
    mapCornerCount: turns.length,
    turns,
  });
  inventory.turnCount += turns.length;
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_PATH, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(
  `Wrote ${inventory.turnCount} turns across ${inventory.trackCount} tracks → ${path.relative(ROOT, OUT_PATH)}`
);
for (const t of inventory.tracks) {
  const unmatched = t.turns.filter((c) => !c.catalogMatch).length;
  console.log(
    `  ${t.trackId.padEnd(26)} map=${String(t.mapCornerCount).padStart(2)} catalog=${String(t.catalogCornerCount).padStart(2)} unmatched=${unmatched}`
  );
}
