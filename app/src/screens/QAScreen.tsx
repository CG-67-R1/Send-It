import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ImageSourcePropType,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QA_TRIVIA_URL } from '../../constants/api';
import { logAnalyticsEvent } from '../utils/analytics';
import { sendAskChat, type AskSource, type MomsOnlineMeta } from '../utils/askChat';
import { AppLogo } from '../components/AppLogo';
import { SCREEN_LOGO_SIZE } from '../constants/logoSizing';

const TRIVIA_BEST_SCORE_KEY = 'ROADRACER_TRIVIA_BEST';
/** Gamification overlay only — not a user profile / onboarding avatar. */
const THE_GOAT_SOURCE: ImageSourcePropType = require('../../avatar/the_goat.png');

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

function openExternalLink(url: string, label = 'link') {
  if (!url?.trim()) {
    Alert.alert('Link unavailable', `This ${label} is not available right now.`);
    return;
  }
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open link', 'Try again or open it from your browser.');
  });
}

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
  const [askReply, setAskReply] = useState<string | null>(null);
  const [askSources, setAskSources] = useState<AskSource[]>([]);
  const [askFromKb, setAskFromKb] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [rulesQuery, setRulesQuery] = useState('');
  const [rulesReply, setRulesReply] = useState<string | null>(null);
  const [rulesSources, setRulesSources] = useState<AskSource[]>([]);
  const [rulesMomsOnline, setRulesMomsOnline] = useState<MomsOnlineMeta | undefined>();
  const [rulesFromKb, setRulesFromKb] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

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
  const [goatExplosionVisible, setGoatExplosionVisible] = useState(false);
  const [goatExplosionShown, setGoatExplosionShown] = useState(false);
  const goatExplosionScale = React.useRef(new Animated.Value(0.1)).current;
  const triviaFeedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (triviaFeedbackTimerRef.current) clearTimeout(triviaFeedbackTimerRef.current);
    };
  }, []);

  const triggerGoatExplosion = useCallback(() => {
    if (goatExplosionShown) return;
    setGoatExplosionShown(true);
    setGoatExplosionVisible(true);
    goatExplosionScale.setValue(0.1);
    Animated.spring(goatExplosionScale, {
      toValue: 1.6,
      friction: 3,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(goatExplosionScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setGoatExplosionVisible(false);
      });
    }, 10000);
  }, [goatExplosionScale, goatExplosionShown]);

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
    setAskReply(null);
    setAskSources([]);
    setAskFromKb(false);
    try {
      const result = await sendAskChat(q);
      if (!result.ok) {
        setSearchError(result.error);
        return;
      }
      setAskReply(result.reply);
      setAskSources(result.sources);
      setAskFromKb(result.fromKb);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSearchLoading(false);
    }
  }, [query]);

  const onRulesCheck = useCallback(async () => {
    const q = rulesQuery.trim();
    if (!q) return;
    setRulesLoading(true);
    setRulesError(null);
    setRulesReply(null);
    setRulesSources([]);
    setRulesMomsOnline(undefined);
    setRulesFromKb(false);
    try {
      const result = await sendAskChat(q, { mode: 'rules' });
      if (!result.ok) {
        setRulesError(result.error);
        return;
      }
      setRulesReply(result.reply);
      setRulesSources(result.sources);
      setRulesMomsOnline(result.momsOnline);
      setRulesFromKb(result.fromKb);
    } catch (e) {
      setRulesError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRulesLoading(false);
    }
  }, [rulesQuery]);

  const clearAskAnswer = useCallback(() => {
    setQuery('');
    setAskReply(null);
    setAskSources([]);
    setAskFromKb(false);
    setSearchError(null);
  }, []);

  const clearRulesAnswer = useCallback(() => {
    setRulesQuery('');
    setRulesReply(null);
    setRulesSources([]);
    setRulesMomsOnline(undefined);
    setRulesFromKb(false);
    setRulesError(null);
  }, []);

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
        if (!res.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Could not load trivia');
        }
        if (!data || typeof data.question !== 'string' || !Array.isArray(data.options)) {
          throw new Error('Invalid trivia response from server');
        }
        if (data.error) {
          void logAnalyticsEvent('trivia_end', {
            result: 'complete',
            correct,
            wrong,
            difficulty,
          });
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
        setTriviaQuestion(null);
        setTriviaFailMessage(e instanceof Error ? e.message : 'Could not load the next question. Tap Try again.');
        setTriviaState('failed');
      } finally {
        setTriviaLoading(false);
      }
    },
    [triviaUsedGlobal, triviaUsedAus, triviaCorrect, triviaWrong, triviaDifficulty, getRegionForOrder, saveTriviaBestIfBetter]
  );

  const startTrivia = useCallback(() => {
    void logAnalyticsEvent('trivia_start');
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

      void logAnalyticsEvent('trivia_answer', {
        correct,
        difficulty: triviaDifficulty,
        region: currentRegion,
      });

      setLastAnswerCorrect(correct);
      const newCorrect = currentCorrect + (correct ? 1 : 0);
      const newWrong = currentWrong + (correct ? 0 : 1);

      if (correct && newCorrect >= 12) {
        triggerGoatExplosion();
      }

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
        void logAnalyticsEvent('trivia_end', {
          result: 'failed',
          correct: newCorrect,
          wrong: newWrong,
          difficulty: nextDifficulty,
        });
        saveTriviaBestIfBetter(newCorrect);
        setTriviaState('failed');
        setTriviaFailMessage("Three strikes—time to hit the manual and try again.");
        return;
      }

      const nextRegion = getRegionForOrder(newCorrect, newWrong);
      const usedNow = nextRegion === 'au' ? updatedAusUsed : updatedGlobalUsed;
      if (triviaFeedbackTimerRef.current) clearTimeout(triviaFeedbackTimerRef.current);
      triviaFeedbackTimerRef.current = setTimeout(() => {
        triviaFeedbackTimerRef.current = null;
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
      triggerGoatExplosion,
    ]
  );

  const resetTrivia = useCallback(() => {
    if (triviaFeedbackTimerRef.current) {
      clearTimeout(triviaFeedbackTimerRef.current);
      triviaFeedbackTimerRef.current = null;
    }
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
    setGoatExplosionVisible(false);
    setGoatExplosionShown(false);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logoRow}>
        <AppLogo size={SCREEN_LOGO_SIZE} />
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
        <Text style={styles.sectionSubtitle}>
          Motorcycle road racing Q&A with live web search — Australia first, then world. History, series, terminology, and bike tech (not car racing). For coaching or bike setup, use Coach & Bike Setup. For MoMS clauses, use Official rule check below.
        </Text>
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
              <Text style={styles.searchBtnText}>Ask</Text>
            )}
          </TouchableOpacity>
        </View>
        {searchError ? (
          <Text style={styles.errorText}>{searchError}</Text>
        ) : null}
        {askReply || searchError ? (
          <TouchableOpacity style={styles.clearAnswerButton} onPress={clearAskAnswer}>
            <Text style={styles.clearAnswerText}>New question</Text>
          </TouchableOpacity>
        ) : null}
        {askReply ? (
          <View style={styles.results}>
            <View style={styles.resultCard}>
              <Text style={styles.resultContent}>{askReply}</Text>
              {askSources.length > 0 ? (
                <View style={styles.sourcesBlock}>
                  <Text style={styles.sourcesLabel}>Sources</Text>
                  {askSources.map((s, i) => (
                    <View key={`${s.title}-${i}`} style={styles.sourceRow}>
                      <Text style={styles.sourceTitle}>{`${i + 1}. ${s.title}`}</Text>
                      {s.onlineUrl || s.origin ? (
                        <TouchableOpacity
                          onPress={() =>
                            openExternalLink(s.onlineUrl || s.origin!, s.title || 'source')
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sourceLink}>
                            {(s.onlineUrl || s.origin || '').replace(/^https?:\/\//, '')} →
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {s.location ? (
                        <Text style={styles.sourceLocation}>{s.location}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <Text style={styles.coachHint}>
              For personalized coaching or bike setup, open Coach & Bike Setup.
            </Text>
          </View>
        ) : null}

        <View style={styles.rulesSection}>
          <Text style={styles.sectionTitle}>Official rule check?</Text>
          <Text style={styles.sectionSubtitle}>
            Ask against the uploaded MoMS and get a quick answer with edition and clause/location
            citations so you can verify it in the rule book.
          </Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. What licence do I need for club road race?"
              placeholderTextColor="#64748b"
              value={rulesQuery}
              onChangeText={setRulesQuery}
              onSubmitEditing={onRulesCheck}
              editable={!rulesLoading}
            />
            <TouchableOpacity
              style={[styles.searchBtn, rulesLoading && styles.searchBtnDisabled]}
              onPress={onRulesCheck}
              disabled={rulesLoading}
            >
              {rulesLoading ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={styles.searchBtnText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>
          {rulesError ? (
            <Text style={styles.errorText}>{rulesError}</Text>
          ) : null}
          {rulesReply || rulesError ? (
            <TouchableOpacity style={styles.clearAnswerButton} onPress={clearRulesAnswer}>
              <Text style={styles.clearAnswerText}>New question</Text>
            </TouchableOpacity>
          ) : null}
          {rulesReply ? (
            <View style={styles.results}>
              <View style={[styles.resultCard, styles.rulesResultCard]}>
                <Text style={styles.resultContent}>{rulesReply}</Text>
                {rulesSources.length > 0 ? (
                  <View style={styles.sourcesBlock}>
                    <Text style={styles.sourcesLabel}>
                      {rulesFromKb ? 'Location in the rules' : 'Related rule locations'}
                    </Text>
                    {rulesSources[0]?.edition || rulesSources[0]?.effectiveDate ? (
                      <Text style={styles.sourceEdition}>
                        {[
                          rulesSources[0].edition ? `MoMS ${rulesSources[0].edition}` : null,
                          rulesSources[0].effectiveDate
                            ? `effective ${rulesSources[0].effectiveDate}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' — ')}
                      </Text>
                    ) : null}
                    {rulesMomsOnline ? (
                      <View style={styles.momsOnlineRow}>
                        <TouchableOpacity
                          onPress={() => openExternalLink(rulesMomsOnline.sourcePage, 'MoMS page')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sourceLink}>MoMS on MA website →</Text>
                        </TouchableOpacity>
                        {rulesMomsOnline.fullPdfUrl ? (
                          <TouchableOpacity
                            onPress={() => openExternalLink(rulesMomsOnline.fullPdfUrl!, 'MoMS PDF')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.sourceLink}>
                              Full {rulesMomsOnline.edition ? `MoMS ${rulesMomsOnline.edition}` : 'MoMS'} PDF →
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                    {rulesSources.map((s, i) => (
                      <View key={`${s.title}-${i}`} style={styles.sourceRow}>
                        <Text style={styles.sourceTitle}>
                          {`${i + 1}. ${s.clauseId ? `Clause ${s.clauseId}` : s.title}`}
                        </Text>
                        {s.location && s.location !== s.title && s.location !== s.clauseId ? (
                          <Text style={styles.sourceLocation}>{s.location}</Text>
                        ) : null}
                        {s.summary ? <Text style={styles.sourceMeta}>{s.summary}</Text> : null}
                        {s.origin || typeof s.page === 'number' ? (
                          <Text style={styles.sourceMeta}>
                            {[s.origin, typeof s.page === 'number' ? `p.${s.page}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        ) : null}
                        {s.onlineUrl ? (
                          <TouchableOpacity
                            onPress={() => openExternalLink(s.onlineUrl!, s.chapterTitle || 'chapter')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.sourceLink}>
                              {s.chapterTitle ? `Open ${s.chapterTitle} online →` : 'Open chapter online →'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
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

        {triviaState === 'playing' && !triviaQuestion && (triviaLoading || lastAnswerCorrect !== null) && (
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
      {goatExplosionVisible && (
        <View style={styles.goatExplosionOverlay} pointerEvents="none">
          <Animated.Image
            source={THE_GOAT_SOURCE}
            style={[styles.goatExplosionImage, { transform: [{ scale: goatExplosionScale }] }]}
            resizeMode="contain"
          />
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
    alignItems: 'center',
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
    color: '#cbd5e1',
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
    color: '#cbd5e1',
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
  sourcesBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  sourcesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  sourceEdition: {
    width: '100%',
    fontSize: 13,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 6,
    lineHeight: 18,
  },
  sourceRow: {
    width: '100%',
    flexShrink: 1,
    marginTop: 6,
  },
  sourceTitle: {
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    fontWeight: '600',
  },
  sourceMeta: {
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  sourceLocation: {
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  momsOnlineRow: {
    width: '100%',
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  sourceLink: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
  },
  clearAnswerButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  clearAnswerText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
  },
  coachHint: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  rulesSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  rulesResultCard: {
    borderLeftColor: '#38bdf8',
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
  goatExplosionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  goatExplosionImage: {
    width: 260,
    height: 260,
  },
});
