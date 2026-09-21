/** Optional native speech module — missing on web and some Play builds. */
export type SpeechRecognitionModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: { lang: string; interimResults: boolean; continuous: boolean }) => void;
  stop: () => void;
  addListener?: (
    event: string,
    cb: (event: { results?: { transcript?: string }[]; isFinal?: boolean }) => void
  ) => { remove: () => void };
};

let speechRecognition: SpeechRecognitionModule | null | undefined;

export function getSpeechRecognition(): SpeechRecognitionModule | null {
  if (speechRecognition !== undefined) return speechRecognition;
  try {
    const speechModule = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechRecognitionModule;
    };
    speechRecognition = speechModule.ExpoSpeechRecognitionModule ?? null;
  } catch {
    speechRecognition = null;
  }
  return speechRecognition;
}
