#!/usr/bin/env node
/**
 * Mobile review preflight for Hermes send-it/mobile-review skill.
 * Usage (from repo root): node scripts/mobile-review-preflight.mjs
 * Env: same as health-check.mjs (API_URL, SKIP_TSC, SKIP_SCRAPERS)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const API_DIR = path.join(ROOT, 'api');
const SCREENS_DIR = path.join(APP_DIR, 'src', 'screens');

const failures = [];

function pass(msg) {
  console.log(`  OK  ${msg}`);
}

function fail(msg) {
  console.error(` FAIL ${msg}`);
  failures.push(msg);
}

function run(cmd, args, cwd, label) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status === 0) {
    pass(label);
    return true;
  }
  const err = (r.stderr || r.stdout || '').trim().slice(0, 400);
  fail(`${label}${err ? `: ${err}` : ''}`);
  return false;
}

function section(title) {
  console.log(`\n${title}`);
}

section('Send-It mobile review preflight');
console.log(`Repo: ${ROOT}`);
console.log(`Date: ${new Date().toISOString().slice(0, 10)}`);

section('Screen inventory (audit each in app/src/screens/)');
try {
  const screens = fs
    .readdirSync(SCREENS_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .sort();
  if (screens.length === 0) {
    fail('No screen files found in app/src/screens/');
  } else {
    for (const f of screens) {
      console.log(`  - ${f}`);
    }
    pass(`${screens.length} screens listed`);
  }
} catch (e) {
  fail(`Screen inventory: ${e.message}`);
}

section('App TypeScript');
if (process.env.SKIP_TSC === '1') {
  console.log('  SKIP  TypeScript (SKIP_TSC=1)');
} else {
  run('npx', ['tsc', '--noEmit'], APP_DIR, 'TypeScript (app)');
}

section('API syntax');
run('node', ['--check', 'server.js'], API_DIR, 'server.js syntax');
run('node', ['--check', 'qa.js'], API_DIR, 'qa.js syntax');

section('Track data');
const trackScript = path.join(ROOT, 'scripts', 'validate-track-data.mjs');
const trackVal = spawnSync('node', [trackScript], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (trackVal.stdout) process.stdout.write(trackVal.stdout);
if (trackVal.stderr) process.stderr.write(trackVal.stderr);
if (trackVal.status === 0) {
  pass('validate-track-data.mjs');
} else {
  fail('validate-track-data.mjs (see FAIL lines above)');
}

section('Repo health check');
const healthScript = path.join(ROOT, 'scripts', 'health-check.mjs');
const health = spawnSync('node', [healthScript], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (health.stdout) process.stdout.write(health.stdout);
if (health.stderr) process.stderr.write(health.stderr);
if (health.status === 0) {
  pass('health-check.mjs');
} else {
  fail('health-check.mjs (see FAIL lines above)');
}

section('Preflight summary');
if (failures.length === 0) {
  console.log('\nAll preflight checks passed.');
  process.exit(0);
} else {
  console.error(`\nPreflight finished with ${failures.length} failure(s). Continue audit; record in report.`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
