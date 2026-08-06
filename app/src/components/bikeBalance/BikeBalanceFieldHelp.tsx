import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { FieldHelp } from '../../calc/bikeBalance/fieldHelp';

type Props = {
  help: FieldHelp;
  /** Rider mode expands teaching copy by default. */
  defaultExpanded?: boolean;
};

/** Expandable teaching block under an input field. */
export function BikeBalanceFieldHelp({ help, defaultExpanded = false }: Props) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{help.shortHint}</Text>
      <TouchableOpacity onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
        <Text style={styles.toggle}>{open ? 'Hide field guide' : 'What is this / how to measure'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.body}>
          <Text style={styles.label}>What</Text>
          <Text style={styles.text}>{help.what}</Text>
          <Text style={styles.label}>How to get it</Text>
          <Text style={styles.text}>{help.how}</Text>
          <Text style={styles.label}>Why it matters</Text>
          <Text style={styles.text}>{help.why}</Text>
          {help.r6Tip ? (
            <>
              <Text style={styles.label}>R6 teaching note</Text>
              <Text style={styles.text}>{help.r6Tip}</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  hint: { color: '#64748b', fontSize: 11, marginBottom: 2, lineHeight: 15 },
  toggle: { color: '#38bdf8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  body: {
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    marginBottom: 6,
  },
  label: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  text: { color: '#cbd5e1', fontSize: 12, lineHeight: 17, marginTop: 2 },
});
