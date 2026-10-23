/**
 * AI route auth/body-parser ordering regression.
 *
 * Run: node scripts/testAiAuthBodyOrder.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = 3127;
const SECRET = 'test-secret';
const BASE_URL = `http://127.0.0.1:${PORT}`;

function startServer() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      PORT: String(PORT),
      APP_API_SECRET: SECRET,
      OPENAI_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return { child, getOutput: () => output };
}

async function waitForHealth(child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(100);
  }
  throw new Error('server did not become ready');
}

async function postLargeChat(headers = {}) {
  const body = JSON.stringify({
    message: 'large upload',
    attachments: [
      {
        type: 'image',
        name: 'oversized.jpg',
        mimeType: 'image/jpeg',
        data: 'a'.repeat(8_500_000),
      },
    ],
  });
  return fetch(`${BASE_URL}/roadrace-ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

const { child, getOutput } = startServer();

try {
  await waitForHealth(child);

  const unauth = await postLargeChat();
  assert.equal(
    unauth.status,
    401,
    'unauthorized oversized AI upload should be rejected before body parsing'
  );
  assert.deepEqual(await unauth.json(), { error: 'Unauthorized' });

  const authed = await postLargeChat({ 'x-app-secret': SECRET });
  assert.equal(authed.status, 413, 'authorized oversized AI upload should still hit JSON limit');
  const errorBody = await authed.json();
  assert.equal(typeof errorBody.error, 'string');
  assert.match(errorBody.error, /photo files are too big/i);

  console.log('PASS  AI routes authenticate before large body parsing');
} catch (err) {
  console.error(getOutput());
  throw err;
} finally {
  if (child.exitCode === null) {
    child.kill('SIGTERM');
  }
}
