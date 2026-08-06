import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Extra line under the default privacy copy (e.g. how to save / compare). */
  detail?: string;
};

/**
 * Visible privacy callout for bike setup tools: data stays on-device until the rider shares.
 */
export function PrivateSetupBanner({ detail }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.title}>Private on this device</Text>
      <Text style={styles.body}>
        Your setup data is stored only in local storage on this phone or browser. It is not uploaded
        to an account. Share only when you choose to send a setup as text via Messages or another app.
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: '#1e40af',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#93c5fd',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#bfdbfe',
    lineHeight: 18,
  },
  detail: {
    fontSize: 13,
    color: '#dbeafe',
    lineHeight: 18,
    marginTop: 8,
  },
});
