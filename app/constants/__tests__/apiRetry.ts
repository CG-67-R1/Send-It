/**
 * Run: npx tsx constants/__tests__/apiRetry.ts
 */
import { canRetryApiRequest, normalizedApiMethod, shouldRetryApiStatus } from '../apiRetry';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert('defaults to GET', normalizedApiMethod() === 'GET');
assert('normalizes lowercase methods', normalizedApiMethod({ method: 'post' }) === 'POST');
assert('GET can retry', canRetryApiRequest({ method: 'GET' }));
assert('HEAD can retry', canRetryApiRequest({ method: 'HEAD' }));
assert('OPTIONS can retry', canRetryApiRequest({ method: 'OPTIONS' }));
assert('POST does not retry', !canRetryApiRequest({ method: 'POST' }));
assert('PATCH does not retry', !canRetryApiRequest({ method: 'PATCH' }));
assert('PUT does not retry', !canRetryApiRequest({ method: 'PUT' }));
assert('DELETE does not retry', !canRetryApiRequest({ method: 'DELETE' }));
assert('GET retries 503', shouldRetryApiStatus(503, { method: 'GET' }));
assert('GET does not retry 500', !shouldRetryApiStatus(500, { method: 'GET' }));
assert('POST does not retry 503', !shouldRetryApiStatus(503, { method: 'POST' }));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll apiRetry tests passed.');
