import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'BikeSetupHub'>;

/** Hub for Bike Setup AI, day sheet, balance calculator, gearing guide, and basics. */
export function BikeSetupHubScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoRow}>
        <AppLogo size={COMPACT_LOGO_SIZE} />
      </View>

      <Text style={styles.sectionLabel}>Bike Setup</Text>
      <Text style={styles.privacyNote}>
        Setup tools keep your data private on this device. Save snapshots for later comparison, and
        share a setup as text via Messages only when you choose.
      </Text>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('CoachChat', { mode: 'bikesetup' })}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Bike Setup AI</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('BikeSetupSheet')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Bike Setup Sheet</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('BikeBalanceSetup')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Bike Balance Setup</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('GearingGuide')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Gearing Guide</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('BikeSetupBasics')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Bike Setup Basics</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  privacyNote: {
    fontSize: 13,
    color: '#93c5fd',
    lineHeight: 18,
    marginBottom: 14,
  },
  navButton: {
    width: '100%',
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontFamily: 'RaceSport',
    fontSize: 17,
    color: '#f8fafc',
  },
});
