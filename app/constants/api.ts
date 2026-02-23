// Use your machine's LAN IP when testing on a physical device (e.g. 'http://192.168.1.100:3001')
// For Android emulator use 'http://10.0.2.2:3001', for iOS simulator 'http://localhost:3001'
// For deployed PoC: set EXPO_PUBLIC_API_URL at build time (e.g. in Vercel/Netlify env vars)
import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (__DEV__) {
    // Emulator/Simulator
    if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
    return 'http://localhost:3001';
  }
  // Production / PoC: use env var so you can set it per deployment
  return process.env.EXPO_PUBLIC_API_URL ?? 'https://send-it-ke7r.onrender.com';
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

// Trackday Rider AI – custom ChatGPT GPT (opens in browser)
export const TRACKDAY_RIDER_AI_URL =
  process.env.EXPO_PUBLIC_TRACKDAY_RIDER_AI_URL ??
  'https://chatgpt.com/g/g-67d6286ffa8c819197902afc89091eeb-trackday-rider-ai';
