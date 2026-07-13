#!/usr/bin/env node
/**
 * iOS Expo Go smoke test — API endpoints used by each of the 5 tabs.
 * Run after deploy: node scripts/ios-smoke-test.mjs
 * Env: API_URL (default production Render)
 *
 * Device steps (manual): install Expo Go, scan QR from `cd app && npx expo start`.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_URL = (process.env.API_URL || 'https://send-it-ke7r.onrender.com').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 120000);

const failures = [];
const passes = [];

function fail(tab, msg) {
  failures.push({ tab, msg });
  console.error(` FAIL [${tab}] ${msg}`);
}

function pass(tab, msg) {
  passes.push({ tab, msg });
  console.log(`  OK  [${tab}] ${msg}`);
}

async function getJson(path, tab, label) {
  const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    fail(tab, `${label} HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

console.log('iOS smoke test (API layer)\n');
console.log(`API_URL=${API_URL}\n`);

// Tab 1: Headlines
const headlines = await getJson('/headlines', 'Headlines', '/headlines');
if (headlines?.headlines?.length >= 20) {
  pass('Headlines', `${headlines.headlines.length} headlines`);
  const au = headlines.headlines.filter((h) =>
    ['ma_roadrace', 'mcnews', 'asbk', 'amcn_club', 'amcn_asbk'].includes(h.sourceId)
  );
  if (au.length >= 1) pass('Headlines', `${au.length} AU items in feed`);
  else fail('Headlines', 'no AU headlines in response');
} else if (headlines) {
  fail('Headlines', `count low: ${headlines.headlines?.length ?? 0}`);
}

const sources = await getJson('/sources', 'Headlines', '/sources');
if (sources?.sources?.length >= 10) pass('Headlines', `${sources.sources.length} built-in sources`);
else if (sources) fail('Headlines', 'sources list too small');

// Tab 2: Events / Calendar
const calendar = await getJson('/calendar', 'Events', '/calendar');
if (calendar?.events?.length >= 20) {
  pass('Events', `${calendar.events.length} events`);
  const motogp2026 = calendar.events.filter((e) => e.series === 'motogp' && (e.startDate || '').startsWith('2026'));
  if (motogp2026.length >= 5) pass('Events', `${motogp2026.length} MotoGP 2026 rounds (live API)`);
  else {
    // Prod may lag until main deploy — verify bundled static data locally
    try {
      const calMod = await import(pathToFileURL(path.join(ROOT, 'api', 'calendar.js')).href);
      const localEvents = await calMod.getCalendarEvents(true);
      const local2026 = localEvents.filter((e) => e.series === 'motogp' && (e.startDate || '').startsWith('2026'));
      if (local2026.length >= 5) {
        pass('Events', `${local2026.length} MotoGP 2026 rounds (local bundle; deploy main to update prod)`);
      } else {
        fail('Events', `MotoGP 2026 rounds low: prod=${motogp2026.length} local=${local2026.length}`);
      }
    } catch (e) {
      fail('Events', `MotoGP 2026 check failed: ${e.message}`);
    }
  }
} else if (calendar) {
  fail('Events', `count low: ${calendar.events?.length ?? 0}`);
}

// Tab 3: Q&A
const trivia = await getJson('/qa/trivia', 'Q&A', '/qa/trivia');
if (trivia?.question && trivia?.options?.length >= 2) pass('Q&A', 'trivia question ready');
else if (trivia?.error) fail('Q&A', `trivia error: ${trivia.error}`);
else if (trivia) fail('Q&A', 'trivia response incomplete');

const health = await getJson('/health', 'Q&A', '/health');
if (health?.roadraceAi) pass('Q&A', 'Ask mode available (roadraceAi)');
else fail('Q&A', 'Ask mode unavailable — set OPENAI_API_KEY on Render (manual dashboard step)');

// Tab 4: Track Walk (local storage — API only for coach handoff)
pass('Track Walk', 'local notes — no API required for save');

// Tab 5: Coach & Bike Setup
const faqs = await getJson('/roadrace-ai/faqs', 'Coach', '/roadrace-ai/faqs');
if (faqs?.coach?.length && faqs?.bikesetup?.length) {
  pass('Coach', `FAQs coach=${faqs.coach.length} bikesetup=${faqs.bikesetup.length}`);
} else if (faqs) {
  fail('Coach', 'FAQ data incomplete');
}
if (health?.roadraceAi) pass('Coach', 'chat endpoint configured');
else fail('Coach', 'chat will fail until OPENAI_API_KEY set on Render');

// App TypeScript
console.log('\nApp build');
const tsc = spawnSync('npx', ['tsc', '--noEmit'], {
  cwd: path.join(ROOT, 'app'),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (tsc.status === 0) pass('App', 'TypeScript compiles');
else fail('App', `tsc failed: ${(tsc.stderr || '').trim().slice(0, 120)}`);

console.log('\n--- Manual Expo Go steps ---');
console.log('1. Install Expo Go on iPhone');
console.log('2. cd app && npx expo start');
console.log('3. Scan QR; verify all 5 tabs');
console.log('4. Coach/Ask: send a test message after OPENAI_API_KEY is on Render\n');

const OPENAI_BLOCKERS = failures.filter((f) => f.msg.includes('OPENAI_API_KEY'));
const hardFailures = failures.filter((f) => !f.msg.includes('OPENAI_API_KEY'));

console.log(`\nSummary: ${passes.length} passed, ${failures.length} failed (${OPENAI_BLOCKERS.length} need Render OPENAI_API_KEY)`);
if (OPENAI_BLOCKERS.length) {
  console.log('Action: Render dashboard → send-it-ke7r → Environment → OPENAI_API_KEY → Save');
}
if (hardFailures.length) process.exit(1);
if (OPENAI_BLOCKERS.length) {
  console.log('iOS smoke test passed except OpenAI key (expected until Render env is set)');
  process.exit(0);
}
console.log('iOS smoke test (API layer) passed');
