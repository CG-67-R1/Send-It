/**
 * Run: npx tsx constants/__tests__/apiTransport.ts
 */
import { fetchLlmAfterWake } from '../apiTransport';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

async function main(): Promise<void> {
{
  const calls: string[] = [];

  await fetchLlmAfterWake('https://example.test/chat', { method: 'POST', body: '{}' }, {
    wakeApi: async () => {
      calls.push('wake');
    },
    apiFetch: async (_url, init) => {
      calls.push(init.signal ? 'fetch-with-signal' : 'fetch-without-signal');
      return new Response('{}');
    },
    timeoutMs: 90_000,
    createTimeoutSignal: (timeoutMs) => {
      calls.push(`timeout-${timeoutMs}`);
      return new AbortController().signal;
    },
  });

  assert(
    'creates default request timeout after wake completes',
    calls.join(' > ') === 'wake > timeout-90000 > fetch-with-signal',
    calls.join(' > ')
  );
}

{
  const calls: string[] = [];
  const controller = new AbortController();

  await fetchLlmAfterWake('https://example.test/chat', { signal: controller.signal }, {
    wakeApi: async () => {
      calls.push('wake');
    },
    apiFetch: async (_url, init) => {
      calls.push(init.signal === controller.signal ? 'fetch-with-caller-signal' : 'fetch-with-other-signal');
      return new Response('{}');
    },
    timeoutMs: 90_000,
    createTimeoutSignal: () => {
      calls.push('unexpected-timeout');
      return new AbortController().signal;
    },
  });

  assert(
    'preserves an explicit caller signal',
    calls.join(' > ') === 'wake > fetch-with-caller-signal',
    calls.join(' > ')
  );
}
}

main().then(() => {
  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log('\nAll apiTransport tests passed.');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
