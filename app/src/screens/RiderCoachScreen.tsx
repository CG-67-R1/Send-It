import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppLogo } from '../components/AppLogo';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import type { CoachChatDisplayMessage, CoachChatMessage, CoachMode } from '../utils/coachChat';

/** Seed payloads may omit `id`; CoachChatScreen assigns stable ids on ingest. */
type SeedMessage = CoachChatMessage & {
  id?: string;
  attachments?: CoachChatDisplayMessage['attachments'];
};

export type RiderCoachStackParamList = {
  RiderCoach: {
    seedMessages?: SeedMessage[];
    seedDraftMessage?: string;
    seedTab?: CoachMode;
  };
  CoachChat: {
    mode: CoachMode;
    seedMessages?: SeedMessage[];
    seedDraftMessage?: string;
  };
  ImportTrackNotes: undefined;
  BikeSetupBasics: undefined;
  BikeSetupSheet: undefined;
  RoadRacerAiFaqs: undefined;
  BikeBalanceSetup: undefined;
};

type RiderCoachNav = NativeStackNavigationProp<RiderCoachStackParamList, 'RiderCoach'>;

/** Hub: headlines for RR AI Coach / RR Bike Setup and related tools. */
export function RiderCoachScreen() {
  const route = useRoute<RouteProp<RiderCoachStackParamList, 'RiderCoach'>>();
  const navigation = useNavigation<RiderCoachNav>();

  // Deep-link / seed handoff: open the dedicated chat screen with clear dialog space
  useEffect(() => {
    const draft = route.params?.seedDraftMessage?.trim();
    const seeds = route.params?.seedMessages;
    if (!draft && !seeds?.length) return;
    const mode: CoachMode = route.params?.seedTab === 'bikesetup' ? 'bikesetup' : 'coach';
    navigation.replace('CoachChat', {
      mode,
      seedDraftMessage: draft || undefined,
      seedMessages: seeds,
    });
  }, [
    route.params?.seedDraftMessage,
    route.params?.seedMessages,
    route.params?.seedTab,
    navigation,
  ]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoRow}>
        <AppLogo size={COMPACT_LOGO_SIZE} />
      </View>

      <Text style={styles.sectionLabel}>AI dialog</Text>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('CoachChat', { mode: 'coach' })}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>RR AI Coach</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('CoachChat', { mode: 'bikesetup' })}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>RR Bike Setup</Text>
      </TouchableOpacity>

      <View style={styles.sectionDivider} />

      <Text style={styles.sectionLabel}>Tools</Text>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('BikeSetupSheet')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Day Setup Sheet</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('BikeSetupBasics')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Bike Setup Basics</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('RoadRacerAiFaqs')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>RoadRacer AI FAQs</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('BikeBalanceSetup')}
        activeOpacity={0.8}
      >
        <Text style={styles.navButtonText}>Bike Balance Setup</Text>
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
  sectionDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
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
