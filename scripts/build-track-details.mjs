#!/usr/bin/env node
/**
 * Rebuild Track Details from repo GPX and the bake tools.
 *
 * Order: GPX map ribbon, then numbered corners, then (optional) racing line.
 * The detector and racing-line solver stay in scripts/; the app only reads JSON.
 *
 * Usage:
 *   node scripts/build-track-details.mjs
 *   node scripts/build-track-details.mjs smp_druitt
 *   node scripts/build-track-details.mjs --with-lines
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function printHelp() {
  console.log(`Rebuild Track Details from GPX + bake tools.

Usage:
  node scripts/build-track-details.mjs [track-id ...] [--with-lines]

  --with-lines   Also run the racing-line solver (slow; ~1–2 min per layout)
`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }
  const withLines = argv.includes('--with-lines');
  const ids = argv.filter((a) => !a.startsWith('-'));

  console.log('1/3  GPX ribbon maps');
  run('node', ['scripts/build-gpx-track-maps.mjs', ...ids]);

  console.log('2/3  Corner numbers from the locked detector');
  run('node', ['scripts/build-track-details-corners.mjs', ...ids]);

  if (withLines) {
    console.log('3/3  Racing lines');
    run('python', ['scripts/build-racing-lines.py', ...ids]);
  } else {
    console.log('3/3  Racing lines skipped (pass --with-lines to rebuild)');
  }
}

main();
