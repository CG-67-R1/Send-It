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

function checkInterleaveLogic() {
  const LOCAL = [
    'ma_roadrace',
    'mcnews',
    'asbk',
    'amcn_club',
    'amcn_asbk',
  ];
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
    { sourceId: 'asbk' },
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
  const required = [
    'motogpnews',
    'gpone',
    'motor_sport_motogp',
    'ma_roadrace',
    'mcnews',
    'amcn_club',
    'asbk',
  ];
  const ids = BUILTIN_SOURCES.map((s) => s.id);
  for (const id of required) {
    if (!ids.includes(id)) fail(`BUILTIN_SOURCES missing ${id}`);
    else pass(`source registered: ${id}`);
  }
  for (const id of ['bikereview', 'transmoto']) {
    if (ids.includes(id)) fail(`removed source still present: ${id}`);
  }
  const auKeys = ['ma_roadrace', 'mcnews', 'asbk', 'amcn_club', 'amcn_asbk'];
  if (!auKeys.every((id) => AU_SOURCE_IDS.includes(id))) {
    fail(`AU_SOURCE_IDS missing expected keys (got ${AU_SOURCE_IDS.join(', ')})`);
  } else {
    pass('AU_SOURCE_IDS');
  }

  const headlines = await getAllHeadlines(true);
  if (headlines.length < 50) fail(`scraper total too low: ${headlines.length}`);
  else pass(`scrapers returned ${headlines.length} headlines`);

  const bySource = {};
  for (const h of headlines) bySource[h.sourceId] = (bySource[h.sourceId] || 0) + 1;
  for (const id of ['gpone', 'motor_sport_motogp']) {
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
} else {
  console.log('  skip tsc (SKIP_TSC=1)');
}

console.log('\nHeadlines logic');
checkInterleaveLogic();

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

console.log('\nMoMS rule book');
checkMomsCorpus();

console.log('\nAU cache');
checkAuCacheFile();

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
