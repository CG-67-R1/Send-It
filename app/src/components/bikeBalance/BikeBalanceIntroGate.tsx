import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onContinue: () => void;
  onOpenDataGuide: () => void;
  onGoDaySetup: () => void;
  onGoBasics: () => void;
  onGoFaqs: () => void;
};

/**
 * Audience gate: Bike Balance is advanced. Offer exits to simpler Coach tools.
 */
export function BikeBalanceIntroGate({
  onContinue,
  onOpenDataGuide,
  onGoDaySetup,
  onGoBasics,
  onGoFaqs,
}: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Before you start</Text>
      <Text style={styles.title}>Bike Balance Setup is a deep technical tool</Text>
      <Text style={styles.body}>
        This screen is for riders and tuners who want a greater technical understanding of chassis
        balance: rake and trail, wheel rates, mass placement, and anti-squat, with auditable math.
      </Text>
      <Text style={styles.body}>
        It is denser than our other Coach tools on purpose. If you mainly want session notes, simple
        suspension hotspots, or Q and A, you will have a better experience elsewhere.
      </Text>

      <Text style={styles.section}>Better fits for most sessions</Text>
      <TouchableOpacity style={styles.altBtn} onPress={onGoDaySetup} activeOpacity={0.85}>
        <Text style={styles.altTitle}>Day Setup Sheet</Text>
        <Text style={styles.altSub}>Log today settings, temps, and notes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.altBtn} onPress={onGoBasics} activeOpacity={0.85}>
        <Text style={styles.altTitle}>Bike Setup Basics</Text>
        <Text style={styles.altSub}>Interactive suspension hotspots and plain-language tips</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.altBtn} onPress={onGoFaqs} activeOpacity={0.85}>
        <Text style={styles.altTitle}>RoadRacer AI FAQs</Text>
        <Text style={styles.altSub}>Search common coach and bike-setup questions</Text>
      </TouchableOpacity>

      <Text style={styles.section}>If you want the deep tool</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onOpenDataGuide} activeOpacity={0.85}>
        <Text style={styles.primaryText}>Continue with the R6 data guide</Text>
        <Text style={styles.primarySub}>
          Walk through gathering numbers using 2020 Yamaha YZF-R6 public stock specs
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onContinue} activeOpacity={0.85}>
        <Text style={styles.secondaryText}>Continue to Bike Balance</Text>
      </TouchableOpacity>

      <Text style={styles.foot}>
        Math cites published books and public OEM specification sheets only. Stock R6 numbers in the
        guide come from public product documentation. Workshop fields stay blank until you measure
        them.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  kicker: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 12,
  },
  body: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  section: {
    marginTop: 18,
    marginBottom: 10,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  altBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 10,
  },
  altTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  altSub: { color: '#94a3b8', fontSize: 13, marginTop: 4, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 16,
    marginBottom: 10,
  },
  primaryText: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  primarySub: { color: '#fbbf24', fontSize: 12, marginTop: 4 },
  secondaryBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#64748b',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryText: { color: '#e2e8f0', fontSize: 15, fontWeight: '600' },
  foot: { color: '#64748b', fontSize: 12, lineHeight: 18 },
});
