/**
 * Build mobile-optimized catalog_track_geofences.geojson from the full source file.
 * Usage: node scripts/build-catalog-track-geofences.mjs [sourcePath]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const defaultSource = 'C:/australian_motorsport_tracks_1km_geofences.geojson';
const sourcePath = process.argv[2] || defaultSource;
const tracksPath = path.join(repoRoot, 'app/src/data/tracks.json');
const outPath = path.join(repoRoot, 'app/src/data/catalog_track_geofences.geojson');

/** Source GeoJSON feature `name` → app trackId */
const SOURCE_NAME_TO_TRACK_ID = {
  'Phillip Island Grand Prix Circuit': 'phillip_island',
  'Mallala Motorsport Park': 'mallala',
  'McNamara Park (Mac Park)': 'mac_park',
  'Morgan Park Raceway': 'morgan_park',
  'One Raceway': 'wakefield_park',
  'Wanneroo Raceway': 'wanneroo',
  'The Bend Motorsport Park': 'the_bend',
  'Sydney Motorsport Park': 'sydney_motorsport_park',
  'Queensland Raceway': 'queensland_raceway',
  'Broadford State Motorcycle Complex': 'broadford',
};

const ALIASES_BY_TRACK_ID = {
  wakefield_park: ['One Raceway', 'Wakefield Park', 'Wakefield'],
};

if (!fs.existsSync(sourcePath)) {
  console.error(`Source not found: ${sourcePath}`);
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
const nameById = Object.fromEntries(catalog.tracks.map((t) => [t.id, t.name]));

const features = [];
const missing = [];

for (const [sourceName, trackId] of Object.entries(SOURCE_NAME_TO_TRACK_ID)) {
  const feat = source.features.find((f) => f.properties?.name === sourceName);
  if (!feat) {
    missing.push(sourceName);
    continue;
  }
  const lat = feat.properties.centre_latitude;
  const lng = feat.properties.centre_longitude;
  const radius = feat.properties.trigger_radius_m ?? 1000;
  const canonicalName = nameById[trackId];
  if (!canonicalName) {
    console.error(`No catalog name for trackId: ${trackId}`);
    process.exit(1);
  }

  const props = {
    trackId,
    name: canonicalName,
    radius_m: radius,
  };
  const aliases = ALIASES_BY_TRACK_ID[trackId];
  if (aliases?.length) props.aliases = aliases;

  features.push({
    type: 'Feature',
    properties: props,
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  });
}

if (missing.length) {
  console.error('Missing source features:', missing.join(', '));
  process.exit(1);
}

const out = {
  type: 'FeatureCollection',
  name: 'RoadRacer_Catalog_Track_Geofences',
  metadata: {
    version: 1,
    feature_count: features.length,
    detection: 'haversine_point_radius',
    source: path.basename(sourcePath),
  },
  features,
};

fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${features.length} features (${fs.statSync(outPath).size} bytes) → ${outPath}`);
