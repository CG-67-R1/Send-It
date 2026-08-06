/**
 * Copy active pack runtime slices into app/src/packs/bundled for Metro bundling.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PACKS = path.join(ROOT, 'packs');
const OUT = path.join(ROOT, 'app', 'src', 'packs', 'bundled');

const active = JSON.parse(fs.readFileSync(path.join(PACKS, 'active.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(PACKS, 'registry.json'), 'utf8'));

function copyJson(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'active.json'), JSON.stringify(active, null, 2) + '\n');
fs.writeFileSync(
  path.join(OUT, 'registry.json'),
  JSON.stringify(
    {
      version: registry.version,
      nodes: registry.nodes.filter((n) => active.packs.includes(n.packId)),
    },
    null,
    2
  ) + '\n'
);

const slices = [
  'manifest.json',
  'competitions/series.json',
  'headlines/sources.json',
  'onboarding/areas.json',
  'tracks/tracks.json',
  'i18n/strings.json',
  'ai/prompts.json',
];

for (const packId of active.packs) {
  const srcRoot = path.join(PACKS, 'regions', packId);
  for (const rel of slices) {
    const src = path.join(srcRoot, rel);
    if (!fs.existsSync(src)) continue;
    copyJson(src, path.join(OUT, packId, rel));
  }
}

console.log(`sync-app-packs: bundled [${active.packs.join(', ')}] → app/src/packs/bundled`);
