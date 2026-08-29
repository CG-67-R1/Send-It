import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** Extra line under the default privacy copy (e.g. how to save / compare). */
  detail?: string;
};

/**
 * Visible privacy callout for bike setup tools: data stays on-device until the rider shares.
 * Starts minimised; tap the title row to expand the explanation.
 */
export function PrivateSetupBanner({ detail }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.banner}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Private on this device"
        accessibilityHint={expanded ? 'Collapse privacy details' : 'Expand privacy details'}
        style={styles.header}
      >
        <Text style={styles.title}>Private on this device</Text>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.bodyWrap}>
          <Text style={styles.body}>
            Your setup data is stored only in local storage on this phone or browser. It is not uploaded
            to an account. Share only when you choose to send a setup as text via Messages or another
            app.
          </Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
      ) : null}
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
    paddingVertical: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#93c5fd',
  },
  chevron: {
    fontSize: 14,
    color: '#93c5fd',
    fontWeight: '700',
  },
  bodyWrap: {
    marginTop: 8,
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
