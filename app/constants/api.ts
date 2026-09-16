// Use your machine's LAN IP when testing on a physical device (e.g. 'http://192.168.1.13:3001')
// Android emulator: 'http://10.0.2.2:3001' (do not use expo-constants isDevice — removed in SDK 50+)
import { Platform } from 'react-native';

const PRODUCTION_API_URL = 'https://send-it-ke7r.onrender.com';
const API_PORT = 3001;

/** Best-effort: AVD / emulator images usually expose model/fingerprint hints. */
function isLikelyAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  if (process.env.EXPO_PUBLIC_ANDROID_EMULATOR_HOST === '1') return true;
  if (process.env.EXPO_PUBLIC_ANDROID_USE_LAN === '1') return false;
  const c = Platform.constants as Record<string, unknown> | undefined;
  const model = String(c?.Model ?? c?.model ?? '');
  const fingerprint = String(c?.Fingerprint ?? c?.fingerprint ?? '');
  return /sdk|google_sdk|Emulator|generic|gphone|android_sdk|unknown/i.test(
    `${model} ${fingerprint}`
  );
}

const getApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (__DEV__) {
    if (Platform.OS === 'android' && isLikelyAndroidEmulator()) {
      return `http://10.0.2.2:${API_PORT}`;
    }
    // Default dev (Expo Go, iOS testers): hosted API — no local `npm start` required.
    return PRODUCTION_API_URL;
  }
  return PRODUCTION_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();
export const QA_TRIVIA_URL = `${API_BASE_URL}/qa/trivia`;
export const CALENDAR_URL = `${API_BASE_URL}/calendar`;

// RoadRace AI – Rider Coach & Technical Assistant (configure when ready)
export const ROADRACE_AI_BASE_URL = `${API_BASE_URL}/roadrace-ai`;
export const ROADRACE_CHAT_URL = `${API_BASE_URL}/roadrace-ai/chat`;
export const ROADRACE_ASK_URL = `${API_BASE_URL}/roadrace-ai/ask`;
export const ROADRACE_FAQS_URL = `${API_BASE_URL}/roadrace-ai/faqs`;

/** Public legal pages on the marketing site. */
export const PRIVACY_POLICY_URL = 'https://roadracer.info/privacy.html';
export const TERMS_OF_USE_URL = 'https://roadracer.info/terms.html';

/** Default for callers that do not pass `signal`. LLM routes should pass a longer timeout. */
export const DEFAULT_API_TIMEOUT_MS = 60_000;
export const LLM_API_TIMEOUT_MS = 90_000;
/** Render free/idle instances often need 15–60s before /health returns. */
export const WAKE_API_TIMEOUT_MS = 75_000;
export const REQUEST_TIMEOUT_MESSAGE = 'Request timed out — please retry';
export const PHOTOS_TOO_LARGE_MESSAGE =
  'The photo files are too big to send (file size, not how far the camera is from the tyre). Use one or two photos, or pick smaller images.';
export const HTML_API_RESPONSE_MESSAGE =
  'Coach could not reach the server. Try again in a moment.';
export const NETWORK_FETCH_MESSAGE =
  'Could not reach the server. After idle the API can take about a minute to wake — try again.';

export function isRequestTimeoutError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = 'name' in error ? String(error.name) : '';
  if (name === 'TimeoutError' || name === 'AbortError') return true;
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return message.includes('timeout') || message.includes('timed out');
}

/** Safari/RN surface a dropped Render connection as "Failed to fetch". */
export function isNetworkFetchError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  return /failed to fetch|network request failed|networkerror|load failed|err_connection|econnreset|socket/.test(
    message
  );
}

function isLocalApiHost(url: string): boolean {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(url);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

/**
 * Cheap GET /health with no auth headers (no CORS preflight).
 * Starts a sleeping Render instance before the JSON POST that Safari otherwise drops.
 */
export async function wakeApi(timeoutMs = WAKE_API_TIMEOUT_MS): Promise<boolean> {
  if (isLocalApiHost(API_BASE_URL)) return true;
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** HTML error pages start with `<` — Safari/RN then throw "Unexpected character: <". */
export function isHtmlOrJsonParseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /JSON Parse error|Unexpected token|Unexpected character|is not valid JSON|failed to parse|<!doctype|<html/i.test(
    message
  );
}

export function apiErrorMessage(error: unknown, fallback = 'Network error'): string {
  if (isRequestTimeoutError(error)) return REQUEST_TIMEOUT_MESSAGE;
  if (isHtmlOrJsonParseError(error)) return HTML_API_RESPONSE_MESSAGE;
  if (isNetworkFetchError(error)) return NETWORK_FETCH_MESSAGE;
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function readApiJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const raw = await res.text();
  const trimmed = raw.trim();
  if (!trimmed) return {} as T;
  if (trimmed.startsWith('<')) {
    throw new Error(res.status === 413 ? PHOTOS_TOO_LARGE_MESSAGE : HTML_API_RESPONSE_MESSAGE);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(res.status === 413 ? PHOTOS_TOO_LARGE_MESSAGE : HTML_API_RESPONSE_MESSAGE);
  }
}

/**
 * fetch() for RoadRacer API routes. Injects x-app-secret when
 * EXPO_PUBLIC_APP_API_SECRET is set (must match server APP_API_SECRET).
 * Applies a 60s timeout unless the caller already passed `signal`.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const secret = process.env.EXPO_PUBLIC_APP_API_SECRET?.trim();
  if (secret) {
    headers.set('x-app-secret', secret);
  }
  const signal = init.signal ?? AbortSignal.timeout(DEFAULT_API_TIMEOUT_MS);
  const attempt = () => fetch(url, { ...init, headers, signal });

  try {
    const res = await attempt();
    if (isRetryableStatus(res.status)) {
      await delay(800);
      return attempt();
    }
    return res;
  } catch (error) {
    if (signal.aborted || isRequestTimeoutError(error) || !isNetworkFetchError(error)) {
      throw error;
    }
    await delay(800);
    return attempt();
  }
}

/** Wake a sleeping Render instance, then call the LLM route. */
export async function apiFetchLlm(url: string, init: RequestInit = {}): Promise<Response> {
  await wakeApi();
  return apiFetch(url, init);
}
