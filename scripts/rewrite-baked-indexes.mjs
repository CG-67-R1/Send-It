/**
 * Rewrite gpxTrackMaps / racingLines index.ts from the JSON files on disk.
 * Named-id bakes leave index.ts alone; call this after adding layouts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsIdentFromTrackId, jsKeyFromTrackId } from './lib/track-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  {
    dirs: [
      'app/src/data/gpxTrackMaps',
      'android-app/src/data/gpxTrackMaps',
    ],
    typeName: 'GpxTrackMap',
    constName: 'MAPS',
    idsName: 'GPX_TRACK_MAP_IDS',
    getter: 'getGpxTrackMap',
    extra: `
export function listGpxTrackMaps(): { id: string; name: string }[] {
  return GPX_TRACK_MAP_IDS.map((id) => ({ id, name: MAPS[id].name }));
}
`,
  },
  {
    dirs: [
      'app/src/data/racingLines',
      'android-app/src/data/racingLines',
    ],
    typeName: 'RacingLine',
    constName: 'LINES',
    idsName: 'RACING_LINE_IDS',
    getter: 'getRacingLine',
    extra: '',
  },
];

function jsonIds(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -5))
    .sort();
}

function writeIndex(dir, spec) {
  const ids = jsonIds(dir);
  const rows = ids.map((id) => ({
    id,
    varName: jsIdentFromTrackId(id),
    key: jsKeyFromTrackId(id),
  }));
  const imports = rows.map((r) => `import ${r.varName} from './${r.id}.json';`).join('\n');
  const entries = rows.map((r) => `  ${r.key}: ${r.varName} as ${spec.typeName},`).join('\n');
  const typeImport =
    spec.typeName === 'GpxTrackMap' ? "import type { GpxTrackMap } from './types';" : "import type { RacingLine } from './types';";
  const body = `${imports}
${typeImport}

const ${spec.constName}: Record<string, ${spec.typeName}> = {
${entries}
};

export const ${spec.idsName} = Object.keys(${spec.constName});

export function ${spec.getter}(trackId: string): ${spec.typeName} | undefined {
  return ${spec.constName}[trackId];
}
${spec.extra}`;
  fs.writeFileSync(path.join(dir, 'index.ts'), body);
  console.log(`  ${path.relative(ROOT, dir)}  ${ids.length} layouts`);
}

function main() {
  for (const spec of TARGETS) {
    for (const rel of spec.dirs) {
      const dir = path.join(ROOT, rel);
      if (fs.existsSync(dir)) writeIndex(dir, spec);
    }
  }
}

main();
