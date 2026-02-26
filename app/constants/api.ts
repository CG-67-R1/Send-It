// In dev: use EXPO_PUBLIC_API_URL if set (e.g. your deployed API), so Expo on phone uses same backend as web.
// Otherwise use LAN IP (physical device) or 10.0.2.2 (Android emulator) for local API.
import { Platform } from 'react-native';

const DEV_MACHINE_IP = '192.168.1.13';
const API_PORT = 3001;
const DEFAULT_PRODUCTION_API = 'https://send-it-ke7r.onrender.com';

const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (__DEV__) {
    if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
    return `http://${DEV_MACHINE_IP}:${API_PORT}`;
  }
  return DEFAULT_PRODUCTION_API;
};

export const API_BASE_URL = getApiBaseUrl();
export const HEADLINES_URL = `${API_BASE_URL}/headlines`;
export const SOURCES_URL = `${API_BASE_URL}/sources`;
export const HEADLINES_CUSTOM_URL = `${API_BASE_URL}/headlines/custom`;
export const QA_SEARCH_URL = `${API_BASE_URL}/qa/search`;
export const QA_TRIVIA_URL = `${API_BASE_URL}/qa/trivia`;
export const CALENDAR_URL = `${API_BASE_URL}/calendar`;

// RoadRace AI – Rider Coach & Technical Assistant (configure when ready)
export const ROADRACE_AI_BASE_URL = `${API_BASE_URL}/roadrace-ai`;
export const ROADRACE_CHAT_URL = `${API_BASE_URL}/roadrace-ai/chat`;

// Trackday Rider AI – custom ChatGPT GPT (opens in browser)
export const TRACKDAY_RIDER_AI_URL =
  process.env.EXPO_PUBLIC_TRACKDAY_RIDER_AI_URL ??
  'https://chatgpt.com/g/g-67d6286ffa8c819197902afc89091eeb-trackday-rider-ai';
