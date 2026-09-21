import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSpeechToText } from '../hooks/useSpeechToText';

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
};

export function VoiceNoteField({ value, onChange, placeholder = 'Type or use mic' }: Props) {
  const append = (transcript: string) => {
    const next = transcript.trim();
    if (!next) return;
    onChange(value ? `${value} ${next}` : next);
  };
  const { recording, interimTranscript, startRecording, stopRecording } = useSpeechToText(append);

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={recording ? 'Listening…' : placeholder}
          placeholderTextColor="#64748b"
          multiline
          editable={!recording}
        />
        <TouchableOpacity
          style={[styles.micButton, recording && styles.micButtonActive]}
          onPress={recording ? stopRecording : () => void startRecording()}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Record voice note'}
        >
          <Text style={styles.micButtonText}>{recording ? 'Stop' : '🎤'}</Text>
        </TouchableOpacity>
      </View>
      {interimTranscript ? <Text style={styles.interim}>{interimTranscript}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#f8fafc',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  micButton: {
    padding: 14,
    backgroundColor: '#334155',
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  micButtonActive: { backgroundColor: '#dc2626' },
  micButtonText: { fontSize: 20 },
  interim: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 6 },
});
