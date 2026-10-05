const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

export function normalizedApiMethod(init: Pick<RequestInit, 'method'> = {}): string {
  return String(init.method ?? 'GET').toUpperCase();
}

export function canRetryApiRequest(init: Pick<RequestInit, 'method'> = {}): boolean {
  return RETRYABLE_METHODS.has(normalizedApiMethod(init));
}

export function shouldRetryApiStatus(status: number, init: Pick<RequestInit, 'method'> = {}): boolean {
  return canRetryApiRequest(init) && RETRYABLE_STATUSES.has(status);
}
