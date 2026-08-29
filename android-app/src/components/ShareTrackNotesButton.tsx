import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { shareTrackNotes, type ShareTrackNotesOptions } from '../utils/shareTrackNotes';

export type ShareTrackNotesButtonProps = ShareTrackNotesOptions & {
  onError?: (error: Error) => void;
  disabled?: boolean;
  style?: object;
};

/**
 * Button to share AI summarised track notes via messaging (Messages, WhatsApp, etc.).
 * Use on the track walk result screen or track log entry detail when summary is available.
 */
export function ShareTrackNotesButton({
  trackName,
  summary,
  dateLabel,
  onError,
  disabled,
  style,
}: ShareTrackNotesButtonProps) {
  const [sharing, setSharing] = React.useState(false);

  const handleShare = async () => {
    if (!summary.trim() || sharing || disabled) return;
    setSharing(true);
    try {
      await shareTrackNotes({ trackName, summary, dateLabel });
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setSharing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={handleShare}
      disabled={disabled || sharing}
      activeOpacity={0.7}
    >
      {sharing ? (
        <ActivityIndicator size="small" color="#0f172a" />
      ) : (
        <Text style={styles.buttonText}>Share track notes</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
});
