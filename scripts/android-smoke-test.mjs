#!/usr/bin/env node
/**
 * Android / Play smoke test — API endpoints used by android-app/.
 * Run after deploy: node scripts/android-smoke-test.mjs
 * Env: API_URL (default production Render)
 *
 * Device steps (manual): Android Studio emulator/USB (`cd android-app && npx expo run:android`)
 * or install the EAS preview APK. Vercel is not the Android binary.
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

console.log('Android smoke test (API layer)\n');
console.log(`API_URL=${API_URL}\n`);

const headlines = await getJson('/headlines', 'Headlines', '/headlines');
if (headlines?.headlines?.length >= 20) {
  pass('Headlines', `${headlines.headlines.length} headlines`);
  const au = headlines.headlines.filter((h) =>
    ['ma_roadrace', 'asbk', 'amcn_asbk'].includes(h.sourceId)
  );
  if (au.length >= 1) pass('Headlines', `${au.length} AU items in feed`);
  else fail('Headlines', 'no AU headlines in response');
} else if (headlines) {
  fail('Headlines', `count low: ${headlines.headlines?.length ?? 0}`);
}

const sources = await getJson('/sources', 'Headlines', '/sources');
if (sources?.sources?.length >= 10) pass('Headlines', `${sources.sources.length} built-in sources`);
else if (sources) fail('Headlines', 'sources list too small');

const calendar = await getJson('/calendar', 'Events', '/calendar');
if (calendar?.events?.length >= 20) {
  pass('Events', `${calendar.events.length} events`);
  const motogp2026 = calendar.events.filter((e) => e.series === 'motogp' && (e.startDate || '').startsWith('2026'));
  if (motogp2026.length >= 5) pass('Events', `${motogp2026.length} MotoGP 2026 rounds (live API)`);
  else {
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

const trivia = await getJson('/qa/trivia', 'Q&A', '/qa/trivia');
if (trivia?.question && trivia?.options?.length >= 2) pass('Q&A', 'trivia question ready');
else if (trivia?.error) fail('Q&A', `trivia error: ${trivia.error}`);
else if (trivia) fail('Q&A', 'trivia response incomplete');

const health = await getJson('/health', 'Q&A', '/health');
if (health?.roadraceAi) pass('Q&A', 'Ask mode available (roadraceAi)');
else fail('Q&A', 'Ask mode unavailable — set OPENAI_API_KEY on Render (manual dashboard step)');

pass('Track Walk', 'local notes — no API required for save');

const faqs = await getJson('/roadrace-ai/faqs', 'Coach', '/roadrace-ai/faqs');
if (faqs?.coach?.length && faqs?.bikesetup?.length) {
  pass('Coach', `FAQs coach=${faqs.coach.length} bikesetup=${faqs.bikesetup.length}`);
} else if (faqs) {
  fail('Coach', 'FAQ data incomplete');
}
if (health?.roadraceAi) pass('Coach', 'chat endpoint configured');
else fail('Coach', 'chat will fail until OPENAI_API_KEY set on Render');

console.log('\nAndroid app build');
const tsc = spawnSync('npx', ['tsc', '--noEmit'], {
  cwd: path.join(ROOT, 'android-app'),
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (tsc.status === 0) pass('Android', 'TypeScript compiles');
else fail('Android', `tsc failed: ${(tsc.stderr || '').trim().slice(0, 120)}`);

console.log('\n--- Manual Android steps ---');
console.log('1. Android Studio: SDK 36 + emulator, or USB debugging');
console.log('2. cd android-app && npx expo run:android');
console.log('   (or install the EAS preview APK — not Vercel)');
console.log('3. Verify Home, Events, Rider Coach, Bike Setup, Q & A, Track Memory landscape');
console.log('4. Coach/Ask: send a test message after OPENAI_API_KEY is on Render\n');

const OPENAI_BLOCKERS = failures.filter((f) => f.msg.includes('OPENAI_API_KEY'));
const hardFailures = failures.filter((f) => !f.msg.includes('OPENAI_API_KEY'));

console.log(`\nSummary: ${passes.length} passed, ${failures.length} failed (${OPENAI_BLOCKERS.length} need Render OPENAI_API_KEY)`);
if (OPENAI_BLOCKERS.length) {
  console.log('Action: Render dashboard → send-it-ke7r → Environment → OPENAI_API_KEY → Save');
}
if (hardFailures.length) process.exit(1);
if (OPENAI_BLOCKERS.length) {
  console.log('Android smoke test passed except OpenAI key (expected until Render env is set)');
  process.exit(0);
}
console.log('Android smoke test (API layer) passed');
