#!/usr/bin/env node
/**
 * HTTP probe for Vercel web deploy (Expo export).
 * Usage: node scripts/vercel-deploy-check.mjs
 * Env: VERCEL_APP_URL (default https://send-it-cg-67-r1s-projects.vercel.app)
 */
const APP_URL = (process.env.VERCEL_APP_URL || 'https://send-it-cg-67-r1s-projects.vercel.app').replace(
  /\/$/,
  ''
);

const failures = [];

function pass(msg) {
  console.log(`  OK  ${msg}`);
}

function fail(msg) {
  console.error(` FAIL ${msg}`);
  failures.push(msg);
}

async function probe(path = '/') {
  const url = `${APP_URL}${path}`;
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
  const html = await res.text();
  return { url, status: res.status, html };
}

console.log(`Vercel deploy check: ${APP_URL}\n`);

try {
  const root = await probe('/');
  if (root.status !== 200) fail(`GET / HTTP ${root.status}`);
  else pass(`GET / HTTP ${root.status}`);

  const titleMatch = root.html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? '(no title)';
  console.log(`  --  Page title: ${title}`);

  if (/log in to vercel/i.test(title) || /login.*vercel/i.test(root.html.slice(0, 8000))) {
    fail('Vercel login wall detected — disable Deployment Protection and use production URL');
  } else if (/_expo|expo-router|roadrace/i.test(root.html)) {
    pass('Expo web bundle markers present');
  } else {
    fail('Page does not look like Expo web export');
  }

  const index = await probe('/index.html');
  if (index.status === 200) pass('GET /index.html');
  else fail(`GET /index.html HTTP ${index.status}`);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

console.log('');
if (failures.length === 0) {
  console.log('All Vercel deploy checks passed.');
  process.exit(0);
} else {
  console.error(`Vercel deploy check finished with ${failures.length} failure(s).`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
