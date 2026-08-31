#!/usr/bin/env node
/**
 * Repo health check for Hermes / CI / pre-deploy.
 * Usage (from repo root): node scripts/health-check.mjs
 * Env: API_URL (default http://localhost:3001), SKIP_TSC=1
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const ANDROID_APP_DIR = path.join(ROOT, 'android-app');
const API_DIR = path.join(ROOT, 'api');
const AU_CALENDAR_CACHE = path.join(API_DIR, 'data', 'au-road-race-events.json');

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

function checkAuCalendarCacheFile() {
  if (!fs.existsSync(AU_CALENDAR_CACHE)) {
    fail('api/data/au-road-race-events.json missing (run: cd api && npm run refresh-au-calendar)');
    return;
  }
  const data = JSON.parse(fs.readFileSync(AU_CALENDAR_CACHE, 'utf8'));
  const events = Array.isArray(data) ? data : (data.events || []);
  if (!Array.isArray(events) || events.length < 10) {
    fail(`AU calendar cache too small: ${events.length} events`);
    return;
  }
  pass(`AU calendar cache: ${events.length} events (updated ${data.updatedAt || 'unknown'})`);

  const govOrAgg = events.some((e) =>
    (e.source_id || '').startsWith('gov_') || (e.source_id || '').includes('computime')
  );
  if (!govOrAgg) {
    fail('AU calendar cache: no governing-body or aggregator source events');
  } else {
    pass('AU calendar cache: aggregator/governing-body source present');
  }
}

async function checkCalendarModule() {
  const calendarPath = pathToFileURL(path.join(API_DIR, 'calendar.js')).href;
  const { getCalendarEvents } = await import(calendarPath);
  const events = await getCalendarEvents(true);
  if (!Array.isArray(events) || events.length < 20) {
    fail(`calendar aggregation too few events: ${events?.length ?? 0}`);
  } else {
    pass(`calendar aggregation: ${events.length} events`);
  }
  const auFull = events.filter((e) => e.detailTier === 'full' || ['asbk', 'au_club'].includes(e.series));
  if (auFull.length < 5) {
    fail(`calendar AU full-detail events too few: ${auFull.length}`);
  } else {
    pass(`calendar AU full-detail events: ${auFull.length}`);
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
    try {
      const healthData = await health.json();
      if (healthData.roadraceAi === true) {
        pass('API roadraceAi enabled (OPENAI_API_KEY set)');
      } else {
        fail('API roadraceAi disabled — set OPENAI_API_KEY on Render (Coach/Ask will fail)');
      }
    } catch {
      fail('API /health response not valid JSON');
    }

    const calendarRes = await fetch(`${API_URL}/calendar`, { signal: AbortSignal.timeout(30000) });
    if (!calendarRes.ok) {
      fail(`API /calendar HTTP ${calendarRes.status}`);
      return;
    }
    const calData = await calendarRes.json();
    if (!Array.isArray(calData.events) || calData.events.length < 20) {
      fail(`API /calendar count low: ${calData.events?.length ?? 0}`);
    } else {
      pass(`API /calendar: ${calData.events.length} events`);
    }
  } catch (e) {
    console.log(`  --  API not reachable at ${API_URL} (${e.message}) — start with: cd api && npm start`);
  }
}

console.log('RoadRace health check\n');

console.log('App');
if (process.env.SKIP_TSC !== '1') {
  run('npx', ['tsc', '--noEmit'], APP_DIR, 'TypeScript (app)');
  run('npx', ['tsc', '--noEmit'], ANDROID_APP_DIR, 'TypeScript (android-app)');
} else {
  console.log('  skip tsc (SKIP_TSC=1)');
}

async function checkAskRetrieval() {
  const qaPath = pathToFileURL(path.join(API_DIR, 'qa.js')).href;
  const { retrieveForAsk } = await import(qaPath);
  const { chunks, fromKb } = await retrieveForAsk('motorcycle racing');
  if (!Array.isArray(chunks)) {
    fail('retrieveForAsk did not return chunks array');
    return;
  }
  pass(`retrieveForAsk: ${chunks.length} chunk(s), fromKb=${fromKb}`);
}

/** MoMS road/historic JSON present + edition not overdue (Hermes / annual update reminder). */
function checkMomsCorpus() {
  const qaDir = path.join(ROOT, 'Q&A');
  let files = [];
  try {
    files = fs.readdirSync(qaDir).filter((f) => /^MoMS-.*\.json$/i.test(f) || /moms/i.test(f) && f.endsWith('.json'));
  } catch (e) {
    fail(`MoMS: cannot read Q&A/ (${e.message})`);
    return;
  }
  const momsFiles = files.filter((f) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(qaDir, f), 'utf8'));
      return data.corpus === 'moms' || /moms/i.test(f);
    } catch {
      return false;
    }
  });
  if (momsFiles.length === 0) {
    fail('MoMS: no MoMS-*-road-historic.json — add PDF to Q&A/ and run: cd api && npm run scrape-moms');
    return;
  }
  let best = null;
  for (const f of momsFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(qaDir, f), 'utf8'));
      if (data.corpus !== 'moms' && !/moms/i.test(f)) continue;
      const contentLen = (data.content || '').length;
      if (!best || contentLen > best.contentLen) {
        best = { file: f, data, contentLen };
      }
    } catch (_) {}
  }
  if (!best || best.contentLen < 5000) {
    fail('MoMS: scraped JSON missing or too small — re-run npm run scrape-moms');
    return;
  }
  const edition = String(best.data.edition || '');
  const due = best.data.updatePolicy?.nextReviewDue || (edition ? `${Number(edition) + 1}-01-15` : null);
  pass(`MoMS corpus: ${best.file} (edition ${edition || '?'}, ${best.contentLen} chars)`);
  if (due) {
    const today = new Date().toISOString().slice(0, 10);
    if (today >= due) {
      fail(
        `MoMS update due (nextReviewDue ${due}): replace PDF in Q&A/ with the new MA edition and run cd api && npm run scrape-moms`
      );
    } else {
      pass(`MoMS nextReviewDue ${due} (not overdue)`);
    }
  }
  const full = best.data.scope?.fullChapters || [];
  if (!full.includes(6) || !full.includes(7)) {
    fail('MoMS scope should include full chapters 6 (Road Race) and 7 (Historic)');
  } else {
    pass('MoMS scope includes Road Race + Historic (full)');
  }
}

console.log('\nAPI modules');
run('node', ['--check', 'server.js'], API_DIR, 'server.js syntax');
run('node', ['--check', 'qa.js'], API_DIR, 'qa.js syntax');
run('node', ['--check', 'roadraceAi.js'], API_DIR, 'roadraceAi.js syntax');
try {
  await checkAskRetrieval();
} catch (e) {
  fail(`retrieveForAsk: ${e.message}`);
}

console.log('\nMoMS rule book');
checkMomsCorpus();

console.log('\nAU calendar cache');
checkAuCalendarCacheFile();

console.log('\nCalendar module');
try {
  await checkCalendarModule();
} catch (e) {
  fail(`calendar module: ${e.message}`);
}

console.log('\nLive API (optional)');
await checkLiveApi();

console.log('');
if (failures.length > 0) {
  console.error(`Health check FAILED (${failures.length} issue(s))`);
  process.exit(1);
}
console.log('Health check passed');
