import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CoachFaqSection } from '../components/CoachFaqSection';
import { faqsForMode } from '../data/riderAiFaqs';
import { navigateToCoachChat } from '../navigation/rootNavigation';

export function RoadRacerAiFaqsScreen() {
  const coachFaqs = faqsForMode('coach');
  const bikeFaqs = faqsForMode('bikesetup');
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filterFaqs = useCallback(
    (items: typeof coachFaqs) =>
      normalizedSearch
        ? items.filter((item) =>
            `${item.question} ${item.answer}`.toLocaleLowerCase().includes(normalizedSearch)
          )
        : items,
    [normalizedSearch]
  );
  const filteredCoachFaqs = useMemo(() => filterFaqs(coachFaqs), [coachFaqs, filterFaqs]);
  const filteredBikeFaqs = useMemo(() => filterFaqs(bikeFaqs), [bikeFaqs, filterFaqs]);

  const askCoach = useCallback((question: string) => {
    navigateToCoachChat({ mode: 'coach', seedDraftMessage: question });
  }, []);

  const askBikeSetup = useCallback((question: string) => {
    navigateToCoachChat({ mode: 'bikesetup', seedDraftMessage: question });
  }, []);

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
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions and answers"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {filteredCoachFaqs.length ? (
          <>
            <Text style={styles.subhead}>Coach</Text>
            <CoachFaqSection
              title="Rider Coach FAQs"
              items={filteredCoachFaqs}
              askLabel="Ask coach about this"
              onAskQuestion={askCoach}
            />
          </>
        ) : null}

        {filteredBikeFaqs.length ? (
          <>
            <Text style={styles.subhead}>Bike Setup</Text>
            <CoachFaqSection
              title="Bike Setup FAQs"
              items={filteredBikeFaqs}
              askLabel="Ask Bike Setup AI about this"
              onAskQuestion={askBikeSetup}
            />
          </>
        ) : null}
        {normalizedSearch && !filteredCoachFaqs.length && !filteredBikeFaqs.length ? (
          <Text style={styles.emptyText}>No FAQs match “{search.trim()}”.</Text>
        ) : null}
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
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  subhead: {
    fontFamily: 'RaceSport',
    fontSize: 16,
    color: '#f8fafc',
    marginBottom: 10,
    marginTop: 8,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
