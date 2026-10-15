/**
 * Fetch a host that may be asleep (Render free tier).
 * Retries connection failures and transient HTTP statuses until budgetMs.
 * Returns the last HTTP response when the server answered.
 * Throws only when no HTTP response arrived.
 */
const TRANSIENT_HTTP = new Set([408, 429, 500, 502, 503, 504]);

export async function fetchLive(url, budgetMs) {
  const deadline = Date.now() + budgetMs;
  let lastResponse = null;
  let lastError = null;

  while (Date.now() < deadline) {
    const slice = Math.min(25_000, Math.max(1, deadline - Date.now()));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(slice) });
      if (res.ok || !TRANSIENT_HTTP.has(res.status)) return res;
      lastResponse = res;
      await res.body?.cancel?.()?.catch?.(() => {});
    } catch (e) {
      lastError = e;
    }
    const pause = Math.min(5_000, deadline - Date.now());
    if (pause <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, pause));
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error(`timeout ${url}`);
}
