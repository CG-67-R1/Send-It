import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { QA_SEARCH_URL, QA_TRIVIA_URL } from '../../constants/api';

type TriviaState = 'idle' | 'playing' | 'result' | 'failed';
type QATab = 'ask' | 'trivia';

const SCOOTER_COMMENTS = [
  "That wasn't a corner—that was a suggestion.",
  "Your bike has more potential than that. So does a mobility scooter.",
  "Did you mean to tap 'walking simulator' instead?",
  "The only thing you're dragging is your confidence.",
  "Even the cone was surprised.",
];

const TRACK_RIDER_COMMENT = "You know your apex from your elbow—respect.";
const TRACK_GURU_COMMENT = "You know how to send it. Seriously.";

function getTriviaResult(correct: number, wrong: number): { title: string; message: string } | null {
  if (wrong >= 3) return null; // handled as fail
  if (correct <= 2) {
    const msg = SCOOTER_COMMENTS[Math.floor(Math.random() * SCOOTER_COMMENTS.length)];
    return { title: 'Scooter rider', message: msg };
  }
  if (correct >= 8) {
    return { title: 'Track Guru!', message: TRACK_GURU_COMMENT };
  }
  if (correct >= 5) {
    return { title: 'You must be a track rider!', message: TRACK_RIDER_COMMENT };
  }
  return { title: 'Street rider', message: "You're getting there—book a track day." };
}

export function QAScreen() {
  const [activeTab, setActiveTab] = useState<QATab>('ask');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    title: string;
    content: string;
    contentBlocks?: { type: string; text: string }[];
  }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [triviaState, setTriviaState] = useState<TriviaState>('idle');
  const [triviaCorrect, setTriviaCorrect] = useState(0);
  const [triviaWrong, setTriviaWrong] = useState(0);
  const [triviaUsed, setTriviaUsed] = useState<number[]>([]);
  const [triviaQuestion, setTriviaQuestion] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
    triviaIndex: number;
  } | null>(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [triviaResult, setTriviaResult] = useState<{ title: string; message: string } | null>(null);
  const [triviaFailMessage, setTriviaFailMessage] = useState<string | null>(null);

  const onSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(
        `${QA_SEARCH_URL}?q=${encodeURIComponent(q)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [query]);

  const fetchTriviaQuestion = useCallback(
    async (usedOverride?: number[], correctCount?: number, wrongCount?: number) => {
      setTriviaLoading(true);
      const used = usedOverride ?? triviaUsed;
      const correct = correctCount ?? triviaCorrect;
      const wrong = wrongCount ?? triviaWrong;
      try {
        const usedStr = used.join(',');
        const url = usedStr ? `${QA_TRIVIA_URL}?used=${usedStr}` : QA_TRIVIA_URL;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.error) {
          setTriviaState('result');
          setTriviaResult(
            getTriviaResult(correct, wrong) ?? {
              title: 'Quiz over',
              message: "You've seen all the questions. Nice run!",
            }
          );
          setTriviaQuestion(null);
          return;
        }
        setTriviaQuestion({
          question: data.question,
          options: data.options,
          correctIndex: data.correctIndex,
          triviaIndex: data.triviaIndex,
        });
      } catch (e) {
        setTriviaState('idle');
        setTriviaQuestion(null);
        setTriviaWrong(0);
        setTriviaCorrect(0);
        setTriviaUsed([]);
      } finally {
        setTriviaLoading(false);
      }
    },
    [triviaUsed, triviaCorrect, triviaWrong]
  );

  const startTrivia = useCallback(() => {
    setTriviaState('playing');
    setTriviaCorrect(0);
    setTriviaWrong(0);
    setTriviaUsed([]);
    setTriviaQuestion(null);
    setTriviaResult(null);
    setTriviaFailMessage(null);
    fetchTriviaQuestion([], 0, 0);
  }, [fetchTriviaQuestion]);

  const onTriviaAnswer = useCallback(
    (chosenIndex: number) => {
      if (!triviaQuestion || triviaLoading) return;
      const correct = chosenIndex === triviaQuestion.correctIndex;
      const newCorrect = triviaCorrect + (correct ? 1 : 0);
      const newWrong = triviaWrong + (correct ? 0 : 1);
      const usedNow = [...triviaUsed, triviaQuestion.triviaIndex];

      setTriviaUsed(usedNow);
      setTriviaCorrect(newCorrect);
      setTriviaWrong(newWrong);
      setTriviaQuestion(null);

      if (newWrong >= 3) {
        setTriviaState('failed');
        setTriviaFailMessage("Three strikes—time to hit the manual and try again.");
        return;
      }

      fetchTriviaQuestion(usedNow, newCorrect, newWrong);
    },
    [triviaQuestion, triviaLoading, triviaCorrect, triviaWrong, triviaUsed, fetchTriviaQuestion]
  );

  const resetTrivia = useCallback(() => {
    setTriviaState('idle');
    setTriviaCorrect(0);
    setTriviaWrong(0);
    setTriviaUsed([]);
    setTriviaQuestion(null);
    setTriviaResult(null);
    setTriviaFailMessage(null);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ask' && styles.tabActive]}
          onPress={() => setActiveTab('ask')}
        >
          <Text style={[styles.tabText, activeTab === 'ask' && styles.tabTextActive]}>Ask</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trivia' && styles.tabActive]}
          onPress={() => setActiveTab('trivia')}
        >
          <Text style={[styles.tabText, activeTab === 'trivia' && styles.tabTextActive]}>Trivia</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ask' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ask a question</Text>
        <Text style={styles.sectionSubtitle}>Search the knowledge base for an answer.</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. What is trail braking?"
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            editable={!searchLoading}
          />
          <TouchableOpacity
            style={[styles.searchBtn, searchLoading && styles.searchBtnDisabled]}
            onPress={onSearch}
            disabled={searchLoading}
          >
            {searchLoading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
        {searchError ? (
          <Text style={styles.errorText}>{searchError}</Text>
        ) : null}
        {searchResults.length > 0 ? (
          <View style={styles.results}>
            {searchResults.map((r, i) => (
              <View key={i} style={styles.resultCard}>
                <Text style={styles.resultTitle}>{r.title}</Text>
                {Array.isArray(r.contentBlocks) && r.contentBlocks.length > 0 ? (
                  r.contentBlocks.map((block, j) => (
                    <Text
                      key={j}
                      style={[
                        block.type === 'heading'
                          ? styles.resultBlockHeading
                          : styles.resultBlockParagraph,
                        { marginTop: j === 0 ? 0 : block.type === 'heading' ? 10 : 6 },
                      ]}
                    >
                      {block.text}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.resultContent}>{r.content}</Text>
                )}
              </View>
            ))}
          </View>
        ) : query.trim() && !searchLoading && !searchError ? (
          <Text style={styles.hint}>No matches. Try different keywords.</Text>
        ) : null}
      </View>
      )}

      {activeTab === 'trivia' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trivia quiz</Text>
        <Text style={styles.sectionSubtitle}>
          Test your knowledge. 3 wrong = fail. 5 right = track rider. 8+ = Track Guru!
        </Text>

        {triviaState === 'idle' && (
          <TouchableOpacity style={styles.triviaStartBtn} onPress={startTrivia}>
            <Text style={styles.triviaStartBtnText}>Start trivia quiz</Text>
          </TouchableOpacity>
        )}

        {triviaState === 'playing' && triviaLoading && !triviaQuestion && (
          <View style={styles.triviaLoading}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingLabel}>Loading question…</Text>
          </View>
        )}

        {triviaState === 'playing' && triviaQuestion && (
          <View style={styles.triviaCard}>
            <Text style={styles.score}>
              ✓ {triviaCorrect} &nbsp; ✗ {triviaWrong}
            </Text>
            <Text style={styles.questionText}>{triviaQuestion.question}</Text>
            {triviaQuestion.options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={styles.optionBtn}
                onPress={() => onTriviaAnswer(i)}
                disabled={triviaLoading}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {triviaState === 'failed' && (
          <View style={styles.resultBox}>
            <Text style={styles.failTitle}>Quiz over</Text>
            <Text style={styles.failMessage}>{triviaFailMessage}</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={resetTrivia}>
              <Text style={styles.resetBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {triviaState === 'result' && triviaResult && (
          <View style={styles.resultBox}>
            <Text style={styles.ratingTitle}>{triviaResult.title}</Text>
            <Text style={styles.ratingMessage}>{triviaResult.message}</Text>
            <Text style={styles.scoreSummary}>
              Score: {triviaCorrect} correct
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={resetTrivia}>
              <Text style={styles.resetBtnText}>Play again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#f59e0b',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#e2e8f0',
  },
  searchBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    marginTop: 8,
  },
  hint: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  results: {
    marginTop: 12,
    gap: 10,
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 6,
  },
  resultContent: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  resultBlockHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    lineHeight: 20,
  },
  resultBlockParagraph: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  triviaStartBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  triviaStartBtnText: {
    color: '#f59e0b',
    fontSize: 17,
    fontWeight: '600',
  },
  triviaLoading: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingLabel: {
    marginTop: 10,
    color: '#94a3b8',
    fontSize: 15,
  },
  triviaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  score: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 16,
    lineHeight: 24,
  },
  optionBtn: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 15,
    color: '#e2e8f0',
  },
  resultBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  failTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f87171',
    marginBottom: 8,
  },
  failMessage: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  ratingMessage: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  scoreSummary: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#0f172a',
    fontWeight: '600',
  },
});
