#!/usr/bin/env node
/**
 * Repo health check for Hermes / CI / pre-deploy.
 * Usage (from repo root): node scripts/health-check.mjs
 * Env: API_URL (default http://localhost:3001), SKIP_TSC=1, SKIP_SCRAPERS=1
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const API_DIR = path.join(ROOT, 'api');
const AU_CACHE = path.join(API_DIR, 'data', 'au-headlines.json');

const API_URL = process.env.API_URL || 'http://localhost:3001';
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
  fail(`${label}${r.stderr ? `: ${r.stderr.trim().slice(0, 200)}` : ''}`);
  return false;
}

function checkInterleaveLogic() {
  const LOCAL = ['mcnews', 'amcn', 'asbk'];
  const interleave = (headlines, auIds, everyN = 4) => {
    const au = headlines.filter((h) => auIds.includes(h.sourceId));
    const rest = headlines.filter((h) => !auIds.includes(h.sourceId));
    if (au.length === 0) return rest;
    if (rest.length === 0) return au;
    const out = [];
    let ai = 0;
    let ri = 0;
    const worldChunk = Math.max(1, everyN - 1);
    while (ri < rest.length || ai < au.length) {
      for (let i = 0; i < worldChunk && ri < rest.length; i++) out.push(rest[ri++]);
      if (ai < au.length) out.push(au[ai++]);
      else if (ri < rest.length) out.push(rest[ri++]);
    }
    return out;
  };

  const sample = [
    { sourceId: 'motogp' },
    { sourceId: 'motogp' },
    { sourceId: 'motogp' },
    { sourceId: 'mcnews' },
    { sourceId: 'gpone' },
    { sourceId: 'amcn' },
  ];
  const mixed = interleave(sample, LOCAL, 4);
  const auCount = mixed.filter((h) => LOCAL.includes(h.sourceId)).length;
  const ratio = auCount / mixed.length;
  if (mixed[3]?.sourceId === 'mcnews' && ratio >= 0.25) {
    pass('AU interleave logic (1-in-4 pattern)');
  } else {
    fail(`AU interleave logic (got ratio ${ratio.toFixed(2)}, expected >= 0.25)`);
  }
}

async function checkScrapers() {
  const scrapersPath = pathToFileURL(path.join(API_DIR, 'scrapers.js')).href;
  const { getAllHeadlines, BUILTIN_SOURCES, AU_SOURCE_IDS } = await import(scrapersPath);
  const required = ['motogpnews', 'peterbom', 'gpone', 'motor_sport_motogp', 'mcnews', 'amcn', 'asbk'];
  const ids = BUILTIN_SOURCES.map((s) => s.id);
  for (const id of required) {
    if (!ids.includes(id)) fail(`BUILTIN_SOURCES missing ${id}`);
    else pass(`source registered: ${id}`);
  }
  for (const id of ['bikereview', 'transmoto']) {
    if (ids.includes(id)) fail(`removed source still present: ${id}`);
  }
  if (!AU_SOURCE_IDS.every((id) => ['mcnews', 'amcn', 'asbk'].includes(id))) {
    fail('AU_SOURCE_IDS should be mcnews, amcn, asbk only');
  } else {
    pass('AU_SOURCE_IDS');
  }

  const headlines = await getAllHeadlines(true);
  if (headlines.length < 50) fail(`scraper total too low: ${headlines.length}`);
  else pass(`scrapers returned ${headlines.length} headlines`);

  const bySource = {};
  for (const h of headlines) bySource[h.sourceId] = (bySource[h.sourceId] || 0) + 1;
  for (const id of ['peterbom', 'gpone', 'motor_sport_motogp']) {
    if (!bySource[id]) fail(`scraper ${id} returned 0 items`);
    else pass(`scraper ${id}: ${bySource[id]} items`);
  }
  const withImages = headlines.filter((h) => h.imageUrl).length;
  if (withImages < 10) fail(`few thumbnails: ${withImages}`);
  else pass(`thumbnails present: ${withImages}/${headlines.length}`);
}

function checkAuCacheFile() {
  if (!fs.existsSync(AU_CACHE)) {
    fail('api/data/au-headlines.json missing (run: cd api && npm run refresh-au-headlines)');
    return;
  }
  const data = JSON.parse(fs.readFileSync(AU_CACHE, 'utf8'));
  if (!Array.isArray(data.headlines) || data.headlines.length < 10) {
    fail(`AU cache too small: ${data.headlines?.length ?? 0} items`);
  } else {
    pass(`AU cache file: ${data.headlines.length} headlines (updated ${data.updatedAt || 'unknown'})`);
  }
}

async function checkLiveApi() {
  try {
    const health = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(8000) });
    if (!health.ok) {
      fail(`API /health HTTP ${health.status} at ${API_URL}`);
      return;
    }
    pass(`API /health at ${API_URL}`);

    const headlinesRes = await fetch(`${API_URL}/headlines`, { signal: AbortSignal.timeout(90000) });
    if (!headlinesRes.ok) {
      fail(`API /headlines HTTP ${headlinesRes.status}`);
      return;
    }
    const data = await headlinesRes.json();
    if (!Array.isArray(data.headlines) || data.headlines.length < 20) {
      fail(`API /headlines count low: ${data.headlines?.length ?? 0}`);
    } else {
      pass(`API /headlines: ${data.headlines.length} items`);
    }
  } catch (e) {
    console.log(`  --  API not reachable at ${API_URL} (${e.message}) — start with: cd api && npm start`);
  }
}

console.log('RoadRace health check\n');

console.log('App');
if (process.env.SKIP_TSC !== '1') {
  run('npx', ['tsc', '--noEmit'], APP_DIR, 'TypeScript (app)');
} else {
  console.log('  skip tsc (SKIP_TSC=1)');
}

console.log('\nHeadlines logic');
checkInterleaveLogic();

console.log('\nAPI modules');
run('node', ['--check', 'server.js'], API_DIR, 'server.js syntax');
run('node', ['--check', 'qa.js'], API_DIR, 'qa.js syntax');

console.log('\nAPI scrapers');
if (process.env.SKIP_SCRAPERS !== '1') {
  try {
    await checkScrapers();
  } catch (e) {
    fail(`scraper import/run: ${e.message}`);
  }
} else {
  console.log('  skip scrapers (SKIP_SCRAPERS=1)');
}

console.log('\nAU cache');
checkAuCacheFile();

console.log('\nLive API (optional)');
await checkLiveApi();

console.log('');
if (failures.length > 0) {
  console.error(`Health check FAILED (${failures.length} issue(s))`);
  process.exit(1);
}
console.log('Health check passed');
