import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getPrimaryLocale } from '../packs/loader';
import { getSpeechRecognition } from '../utils/speechRecognition';

export function useSpeechToText(onFinal: (transcript: string) => void) {
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const interimRef = useRef('');
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const requestVoice = useCallback(async (): Promise<'ok' | 'denied' | 'unavailable'> => {
    try {
      const module = getSpeechRecognition();
      if (!module) {
        setVoiceAvailable(false);
        return 'unavailable';
      }
      const result = await module.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Microphone', 'Allow microphone access to use voice notes.');
        return 'denied';
      }
      setVoiceAvailable(true);
      return 'ok';
    } catch (e) {
      if (__DEV__) console.warn('[speech] permission', e);
      setVoiceAvailable(false);
      return 'unavailable';
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (voiceAvailable === false) {
      Alert.alert('Voice', 'Voice input is not available on this device.');
      return;
    }
    if (voiceAvailable === null) {
      const status = await requestVoice();
      if (status === 'denied') return;
      if (status !== 'ok') {
        Alert.alert('Voice', 'Voice input is not available on this device.');
        return;
      }
    }
    try {
      const module = getSpeechRecognition();
      if (!module) {
        setVoiceAvailable(false);
        Alert.alert('Voice', 'Voice input is not available on this device.');
        return;
      }
      setInterimTranscript('');
      interimRef.current = '';
      module.start({ lang: getPrimaryLocale(), interimResults: true, continuous: true });
      setRecording(true);
    } catch (e) {
      if (__DEV__) console.warn('[speech] start', e);
      setVoiceAvailable(false);
      Alert.alert('Voice', 'Voice input is not available on this device.');
    }
  }, [voiceAvailable, requestVoice]);

  const stopRecording = useCallback(() => {
    try {
      getSpeechRecognition()?.stop();
    } catch (e) {
      if (__DEV__) console.warn('[speech] stop', e);
    }
    setRecording(false);
    const pending = interimRef.current.trim();
    if (pending) {
      onFinalRef.current(pending);
      interimRef.current = '';
      setInterimTranscript('');
    }
  }, []);

  useEffect(() => {
    let resultSub: { remove: () => void } | null = null;
    try {
      const module = getSpeechRecognition();
      if (module?.addListener) {
        resultSub = module.addListener(
          'result',
          (event: { results?: { transcript?: string }[]; isFinal?: boolean }) => {
            const transcript =
              (event.results?.[0] as { transcript?: string } | undefined)?.transcript ?? '';
            if (event.isFinal) {
              onFinalRef.current(transcript);
              interimRef.current = '';
              setInterimTranscript('');
            } else {
              interimRef.current = transcript;
              setInterimTranscript(transcript);
            }
          }
        );
      }
    } catch (e) {
      if (__DEV__) console.warn('[speech] listener', e);
    }
    return () => {
      resultSub?.remove?.();
      try {
        getSpeechRecognition()?.stop();
      } catch {
        /* native module optional */
      }
    };
  }, []);

  return { recording, interimTranscript, startRecording, stopRecording };
}
