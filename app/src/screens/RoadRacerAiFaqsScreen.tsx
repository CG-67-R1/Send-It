import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CoachFaqSection } from '../components/CoachFaqSection';
import { faqsForMode } from '../data/riderAiFaqs';

type RiderCoachStackParams = {
  RiderCoach: {
    seedDraftMessage?: string;
    seedTab?: 'coach' | 'bikesetup';
  };
  RoadRacerAiFaqs: undefined;
};

type Nav = NativeStackNavigationProp<RiderCoachStackParams, 'RoadRacerAiFaqs'>;

export function RoadRacerAiFaqsScreen() {
  const navigation = useNavigation<Nav>();
  const coachFaqs = faqsForMode('coach');
  const bikeFaqs = faqsForMode('bikesetup');

  const askCoach = useCallback(
    (question: string) => {
      navigation.navigate('RiderCoach', {
        seedTab: 'coach',
        seedDraftMessage: question,
      });
    },
    [navigation]
  );

  const askBikeSetup = useCallback(
    (question: string) => {
      navigation.navigate('RiderCoach', {
        seedTab: 'bikesetup',
        seedDraftMessage: question,
      });
    },
    [navigation]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Common questions for Rider Coach and Bike Setup. Expand an answer, or send it straight into
          the matching AI chat.
        </Text>

        <Text style={styles.subhead}>Coach</Text>
        <CoachFaqSection
          title="Rider Coach FAQs"
          items={coachFaqs}
          askLabel="Ask coach about this"
          onAskQuestion={askCoach}
        />

        <Text style={styles.subhead}>Bike Setup</Text>
        <CoachFaqSection
          title="Bike Setup FAQs"
          items={bikeFaqs}
          askLabel="Ask Bike Setup AI about this"
          onAskQuestion={askBikeSetup}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  lead: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 20,
  },
  subhead: {
    fontFamily: 'RaceSport',
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 10,
    marginTop: 8,
  },
});
