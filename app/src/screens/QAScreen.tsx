import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Analytics from 'expo-firebase-analytics';
import { QA_TRIVIA_URL, ROADRACE_CHAT_URL } from '../../constants/api';
import { THE_GOAT_SOURCE } from '../constants/avatars';
import { AppLogo } from '../components/AppLogo';

const TRIVIA_BEST_SCORE_KEY = 'ROADRACER_TRIVIA_BEST';

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
  const [triviaUsedGlobal, setTriviaUsedGlobal] = useState<number[]>([]);
  const [triviaUsedAus, setTriviaUsedAus] = useState<number[]>([]);
  const [triviaDifficulty, setTriviaDifficulty] = useState(2);
  const [triviaQuestion, setTriviaQuestion] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
    triviaIndex: number;
  } | null>(null);
  const [triviaLoading, setTriviaLoading] = useState(false);
  const [triviaResult, setTriviaResult] = useState<{ title: string; message: string } | null>(null);
  const [triviaFailMessage, setTriviaFailMessage] = useState<string | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [triviaBestScore, setTriviaBestScore] = useState<number>(0);
  const [triviaNewBest, setTriviaNewBest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRIVIA_BEST_SCORE_KEY);
        const n = raw != null ? parseInt(raw, 10) : 0;
        if (!cancelled && !isNaN(n)) setTriviaBestScore(n);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const saveTriviaBestIfBetter = useCallback(async (correctCount: number) => {
    try {
      const raw = await AsyncStorage.getItem(TRIVIA_BEST_SCORE_KEY);
      const best = raw != null ? parseInt(raw, 10) : 0;
      if (isNaN(best) || correctCount <= best) return;
      await AsyncStorage.setItem(TRIVIA_BEST_SCORE_KEY, String(correctCount));
      setTriviaBestScore(correctCount);
      setTriviaNewBest(true);
    } catch (_) {}
  }, []);

  const getRegionForOrder = useCallback((correct: number, wrong: number): 'global' | 'au' => {
    const index = correct + wrong;
    return index % 3 === 2 ? 'au' : 'global';
  }, []);

  const onSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(ROADRACE_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, mode: 'coach', history: [] }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data?.error || 'Request failed');
        return;
      }
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (reply) {
        setSearchResults([{ title: 'Answer', content: reply }]);
      } else {
        setSearchError('No response from coach');
      }
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : 'Request failed';
      const friendly =
        __DEV__ && rawMessage.toLowerCase().includes('network request failed')
          ? "Couldn't reach the RoadRace API from Expo. Make sure the API is running (cd api && npm run dev) and that DEV_MACHINE_IP in app/constants/api.ts matches your computer's LAN IP."
          : rawMessage;
      setSearchError(friendly);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [query]);

  const fetchTriviaQuestion = useCallback(
    async (usedOverride?: number[], correctCount?: number, wrongCount?: number, difficultyOverride?: number) => {
      setTriviaLoading(true);
      const correct = correctCount ?? triviaCorrect;
      const wrong = wrongCount ?? triviaWrong;
      const difficulty = difficultyOverride ?? triviaDifficulty;
      const region = getRegionForOrder(correct, wrong);
      const defaultUsed = region === 'au' ? triviaUsedAus : triviaUsedGlobal;
      const used = usedOverride ?? defaultUsed;
      try {
        const params: string[] = [];
        if (used.length) params.push(`used=${used.join(',')}`);
        if (typeof difficulty === 'number' && Number.isFinite(difficulty)) {
          params.push(`difficulty=${difficulty}`);
        }
        params.push(`region=${region}`);
        const url = `${QA_TRIVIA_URL}?${params.join('&')}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.error) {
          Analytics.logEvent('trivia_end', {
            result: 'complete',
            correct,
            wrong,
            difficulty,
          }).catch(() => {});
          saveTriviaBestIfBetter(correct);
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
        setLastAnswerCorrect(null);
        setTriviaQuestion({
          question: data.question,
          options: data.options,
          correctIndex: data.correctIndex,
          triviaIndex: data.triviaIndex,
        });
      } catch (e) {
        const rawMessage = e instanceof Error ? e.message : 'Trivia request failed';
        const friendly =
          __DEV__ && rawMessage.toLowerCase().includes('network request failed')
            ? "Couldn't reach the RoadRace API for trivia. In Expo, make sure the API is running (cd api && npm run dev) and that DEV_MACHINE_IP in app/constants/api.ts matches your computer's LAN IP."
            : rawMessage;
        setTriviaState('failed');
        setTriviaFailMessage(friendly);
        setTriviaQuestion(null);
        setTriviaWrong(0);
        setTriviaCorrect(0);
        setTriviaUsedGlobal([]);
        setTriviaUsedAus([]);
        setTriviaDifficulty(2);
      } finally {
        setTriviaLoading(false);
      }
    },
    [triviaUsedGlobal, triviaUsedAus, triviaCorrect, triviaWrong, triviaDifficulty, getRegionForOrder, saveTriviaBestIfBetter]
  );

  const startTrivia = useCallback(() => {
    Analytics.logEvent('trivia_start').catch(() => {});
    setTriviaNewBest(false);
    setTriviaState('playing');
    setTriviaCorrect(0);
    setTriviaWrong(0);
    setTriviaUsedGlobal([]);
    setTriviaUsedAus([]);
    setTriviaDifficulty(2);
    setTriviaQuestion(null);
    setTriviaResult(null);
    setTriviaFailMessage(null);
    fetchTriviaQuestion([], 0, 0, 2);
  }, [fetchTriviaQuestion]);

  const onTriviaAnswer = useCallback(
    (chosenIndex: number) => {
      if (!triviaQuestion || triviaLoading) return;
      const correct = chosenIndex === triviaQuestion.correctIndex;
      const currentCorrect = triviaCorrect;
      const currentWrong = triviaWrong;
      const currentRegion = getRegionForOrder(currentCorrect, currentWrong);

      Analytics.logEvent('trivia_answer', {
        correct,
        difficulty: triviaDifficulty,
        region: currentRegion,
      }).catch(() => {});

      setLastAnswerCorrect(correct);
      const newCorrect = currentCorrect + (correct ? 1 : 0);
      const newWrong = currentWrong + (correct ? 0 : 1);

      const updatedGlobalUsed =
        currentRegion === 'global'
          ? [...triviaUsedGlobal, triviaQuestion.triviaIndex]
          : triviaUsedGlobal;
      const updatedAusUsed =
        currentRegion === 'au'
          ? [...triviaUsedAus, triviaQuestion.triviaIndex]
          : triviaUsedAus;

      setTriviaUsedGlobal(updatedGlobalUsed);
      setTriviaUsedAus(updatedAusUsed);
      setTriviaCorrect(newCorrect);
      setTriviaWrong(newWrong);
      setTriviaQuestion(null);

      const currentDifficulty = triviaDifficulty;
      let nextDifficulty = currentDifficulty;
      if (correct) {
        nextDifficulty = currentDifficulty + 2;
        if (nextDifficulty > 10) nextDifficulty = 2;
      }
      setTriviaDifficulty(nextDifficulty);

      if (newWrong >= 3) {
        Analytics.logEvent('trivia_end', {
          result: 'failed',
          correct: newCorrect,
          wrong: newWrong,
          difficulty: nextDifficulty,
        }).catch(() => {});
        saveTriviaBestIfBetter(newCorrect);
        setTriviaState('failed');
        setTriviaFailMessage("Three strikes—time to hit the manual and try again.");
        return;
      }

      const nextRegion = getRegionForOrder(newCorrect, newWrong);
      const usedNow = nextRegion === 'au' ? updatedAusUsed : updatedGlobalUsed;
      // Show correct/incorrect feedback for 1 second before loading next question
      setTimeout(() => {
        fetchTriviaQuestion(usedNow, newCorrect, newWrong, nextDifficulty);
      }, 1000);
    },
    [
      triviaQuestion,
      triviaLoading,
      triviaCorrect,
      triviaWrong,
      triviaUsedGlobal,
      triviaUsedAus,
      triviaDifficulty,
      getRegionForOrder,
      fetchTriviaQuestion,
      saveTriviaBestIfBetter,
    ]
  );

  const resetTrivia = useCallback(() => {
    setTriviaState('idle');
    setTriviaCorrect(0);
    setTriviaWrong(0);
    setTriviaUsedGlobal([]);
    setTriviaUsedAus([]);
    setTriviaDifficulty(2);
    setTriviaQuestion(null);
    setTriviaResult(null);
    setTriviaFailMessage(null);
    setLastAnswerCorrect(null);
    setTriviaNewBest(false);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoRow}>
        <AppLogo size={28} />
      </View>
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
        <Text style={styles.sectionTitle}>Got a question?</Text>
        <Text style={styles.sectionSubtitle}>Ask away - trivia, research, bike tech....its up to you!</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. What is trail braking? ... or ... Who won the TT in 1994?"
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
          <Text style={styles.hint}>Ask a question above to get an answer from the coach.</Text>
        ) : null}
      </View>
      )}

      {activeTab === 'trivia' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trivia quiz</Text>
        <Text style={styles.sectionSubtitle}>
          Test your knowledge. 3 wrong = fail. 5 right = track rider. 8+ = Track Guru!
        </Text>
        {triviaState === 'idle' && triviaBestScore > 0 && (
          <Text style={styles.bestScoreIdle}>Your best: {triviaBestScore} correct</Text>
        )}

        {triviaState === 'idle' && (
          <TouchableOpacity style={styles.triviaStartBtn} onPress={startTrivia}>
            <Text style={styles.triviaStartBtnText}>Start trivia quiz</Text>
          </TouchableOpacity>
        )}

        {triviaState === 'playing' && triviaLoading && !triviaQuestion && (
          <View style={styles.triviaLoading}>
            {lastAnswerCorrect !== null && (
              <View style={styles.triviaFeedbackImageWrap}>
                <Text style={styles.triviaFeedbackEmoji}>
                  {lastAnswerCorrect ? '🏍️' : '💥'}
                </Text>
                <Text style={styles.triviaFeedbackText}>
                  {lastAnswerCorrect ? 'Nice one!' : 'Oops!'}
                </Text>
              </View>
            )}
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingLabel}>Loading question…</Text>
          </View>
        )}

        {triviaState === 'playing' && triviaQuestion && (
          <View style={styles.triviaCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.score}>
                ✓ {triviaCorrect} &nbsp; ✗ {triviaWrong}
              </Text>
              <Text style={styles.bestScore}>Best: {triviaBestScore}</Text>
            </View>
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
            <Text style={styles.scoreSummary}>Score: {triviaCorrect} correct</Text>
            <Text style={styles.bestScore}>Best: {triviaBestScore}</Text>
            {triviaNewBest && <Text style={styles.newBestText}>New best!</Text>}
            <TouchableOpacity style={styles.resetBtn} onPress={resetTrivia}>
              <Text style={styles.resetBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {triviaState === 'result' && triviaResult && (
          <View style={styles.resultBox}>
            {triviaCorrect >= 8 && (
              <Image source={THE_GOAT_SOURCE} style={styles.theGoatImage} resizeMode="contain" />
            )}
            <Text style={styles.ratingTitle}>{triviaResult.title}</Text>
            <Text style={styles.ratingMessage}>{triviaResult.message}</Text>
            <Text style={styles.scoreSummary}>
              Score: {triviaCorrect} correct
            </Text>
            <Text style={styles.bestScore}>Best: {triviaBestScore}</Text>
            {triviaNewBest && <Text style={styles.newBestText}>New best!</Text>}
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
  logoRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
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
    minWidth: 88,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#f59e0b',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5a507',
    minHeight: 56,
  },
  triviaStartBtnText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
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
  triviaFeedbackImageWrap: {
    marginBottom: 16,
    alignItems: 'center',
  },
  triviaFeedbackImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
  },
  triviaFeedbackEmoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  triviaFeedbackText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  triviaCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  score: {
    fontSize: 13,
    color: '#94a3b8',
  },
  bestScore: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
    marginBottom: 8,
  },
  newBestText: {
    fontSize: 15,
    color: '#22c55e',
    fontWeight: '700',
    marginBottom: 12,
  },
  bestScoreIdle: {
    fontSize: 14,
    color: '#f59e0b',
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
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    minHeight: 52,
    borderWidth: 2,
    borderColor: '#f59e0b',
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
  theGoatImage: {
    width: '100%',
    height: 120,
    marginBottom: 12,
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
});
