#!/usr/bin/env node
/**
 * Daily gate for Hermes send-it/rr-app-expert cron.
 * Silent on success (stdout empty, exit 0). Prints summary only on failure.
 *
 * Usage (from repo root):
 *   node scripts/hermes-daily-gate.mjs
 *
 * Env: API_URL (default production Render), SKIP_TSC, SKIP_SCRAPERS
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

if (!process.env.API_URL) {
  process.env.API_URL = 'https://send-it-ke7r.onrender.com';
}

const preflight = spawnSync('node', ['scripts/mobile-review-preflight.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  env: { ...process.env },
});

const lines = `${preflight.stdout || ''}${preflight.stderr || ''}`.split(/\r?\n/);
const fails = lines.filter((l) => l.includes(' FAIL '));

if (preflight.status === 0 && fails.length === 0) {
  process.exit(0);
}

console.log('Send-It daily gate FAILED');
console.log(`API_URL=${process.env.API_URL}`);
for (const f of fails) console.log(f.trim());
if (fails.length === 0 && preflight.status !== 0) {
  console.log('Preflight exited non-zero; see Hermes terminal log for full output.');
}
process.exit(preflight.status || 1);
