#!/usr/bin/env node
/**
 * Production smoke probe — cold-start tolerant health + feature flags.
 * Usage: node scripts/verify-production.mjs
 * Env: API_URL (default https://send-it-ke7r.onrender.com)
 */
const API_URL = (process.env.API_URL || 'https://send-it-ke7r.onrender.com').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.PROD_TIMEOUT_MS || 120000);

const failures = [];

function fail(msg) {
  console.error(` FAIL ${msg}`);
  failures.push(msg);
}

function pass(msg) {
  console.log(`  OK  ${msg}`);
}

async function fetchJson(path, label) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    fail(`${label} HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

console.log(`Production verify: ${API_URL}\n`);

try {
  const health = await fetchJson('/health', '/health');
  if (health) {
    pass(`/health ok=${health.ok}`);
    if (health.roadraceAi) pass('roadraceAi enabled');
    else fail('roadraceAi disabled — set OPENAI_API_KEY on Render dashboard');
  }

  const headlines = await fetchJson('/headlines', '/headlines');
  if (headlines?.headlines?.length >= 20) {
    pass(`/headlines: ${headlines.headlines.length} items`);
  } else if (headlines) {
    fail(`/headlines count low: ${headlines.headlines?.length ?? 0}`);
  }

  const calendar = await fetchJson('/calendar', '/calendar');
  if (calendar?.events?.length >= 20) {
    pass(`/calendar: ${calendar.events.length} events`);
  } else if (calendar) {
    fail(`/calendar count low: ${calendar.events?.length ?? 0}`);
  }

  const trivia = await fetchJson('/qa/trivia', '/qa/trivia');
  if (trivia?.question) pass('/qa/trivia returns a question');
  else if (trivia) fail('/qa/trivia missing question');

  const faqs = await fetchJson('/roadrace-ai/faqs', '/roadrace-ai/faqs');
  if (faqs?.coach?.length) pass(`/roadrace-ai/faqs: ${faqs.coach.length} coach FAQs`);
  else if (faqs) fail('/roadrace-ai/faqs empty');
} catch (e) {
  fail(`request failed: ${e.message}`);
}

console.log('');
if (failures.length) {
  console.error(`Production verify FAILED (${failures.length})`);
  process.exit(1);
}
console.log('Production verify passed');
