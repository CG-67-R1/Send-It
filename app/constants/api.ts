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
export const HEADLINES_URL = `${API_BASE_URL}/headlines`;
export const SOURCES_URL = `${API_BASE_URL}/sources`;
export const HEADLINES_CUSTOM_URL = `${API_BASE_URL}/headlines/custom`;
export const QA_TRIVIA_URL = `${API_BASE_URL}/qa/trivia`;
export const CALENDAR_URL = `${API_BASE_URL}/calendar`;

// RoadRace AI – Rider Coach & Technical Assistant (configure when ready)
export const ROADRACE_AI_BASE_URL = `${API_BASE_URL}/roadrace-ai`;
export const ROADRACE_CHAT_URL = `${API_BASE_URL}/roadrace-ai/chat`;
export const ROADRACE_ASK_URL = `${API_BASE_URL}/roadrace-ai/ask`;
export const ROADRACE_FAQS_URL = `${API_BASE_URL}/roadrace-ai/faqs`;
