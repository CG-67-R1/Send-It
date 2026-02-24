import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../constants/api';
import { AppLogo } from '../components/AppLogo';

type CoachTab = 'coach' | 'bikesetup';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const ROADRACE_CHAT_URL = `${API_BASE_URL}/roadrace-ai/chat`;

export function RiderCoachScreen() {
  const [activeTab, setActiveTab] = useState<CoachTab>('coach');
  const [coachMessages, setCoachMessages] = useState<ChatMessage[]>([]);
  const [bikeMessages, setBikeMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const messages = activeTab === 'coach' ? coachMessages : bikeMessages;
  const setMessages = activeTab === 'coach' ? setCoachMessages : setBikeMessages;

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const history = activeTab === 'coach' ? coachMessages : bikeMessages;
    const historyForApi = history.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(ROADRACE_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: activeTab,
          history: historyForApi,
        }),
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => prev.slice(0, -1));
        setError(data?.error || 'Request failed');
        return;
      }

      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages((prev) => prev.slice(0, -1));
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeTab, coachMessages, bikeMessages]);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <AppLogo size={28} />
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coach' && styles.tabActive]}
          onPress={() => setActiveTab('coach')}
        >
          <Text style={[styles.tabText, activeTab === 'coach' && styles.tabTextActive]}>Coach</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bikesetup' && styles.tabActive]}
          onPress={() => setActiveTab('bikesetup')}
        >
          <Text style={[styles.tabText, activeTab === 'bikesetup' && styles.tabTextActive]}>
            Bike Setup
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Coach panel – mounted so state stays live */}
          <View style={[styles.panel, activeTab !== 'coach' && styles.panelHidden]}>
            {coachMessages.length === 0 && (
              <View style={styles.welcome}>
                <Text style={styles.welcomeTitle}>Rider Coach</Text>
                <Text style={styles.welcomeSubtitle}>
                  Ask about technique, lines, braking, and race craft. Your AI coach is here—no need
                  to leave the app.
                </Text>
              </View>
            )}
            {coachMessages.map((m, i) => (
              <View
                key={i}
                style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
              >
                <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                  {m.content}
                </Text>
              </View>
            ))}
            {activeTab === 'coach' && loading && (
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <ActivityIndicator size="small" color="#94a3b8" />
              </View>
            )}
          </View>

          {/* Bike Setup panel – mounted so state stays live */}
          <View style={[styles.panel, activeTab !== 'bikesetup' && styles.panelHidden]}>
            {bikeMessages.length === 0 && (
              <View style={styles.welcome}>
                <Text style={styles.welcomeTitle}>Bike Setup</Text>
                <Text style={styles.welcomeSubtitle}>
                  Ask about suspension, gearing, tyres, and setup. Your technical AI is here—no need
                  to leave the app.
                </Text>
              </View>
            )}
            {bikeMessages.map((m, i) => (
              <View
                key={i}
                style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
              >
                <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                  {m.content}
                </Text>
              </View>
            ))}
            {activeTab === 'bikesetup' && loading && (
              <View style={[styles.bubble, styles.bubbleAssistant]}>
                <ActivityIndicator size="small" color="#94a3b8" />
              </View>
            )}
          </View>
        </ScrollView>

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={activeTab === 'coach' ? 'Ask your coach…' : 'Ask about setup…'}
            placeholderTextColor="#64748b"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            editable={!loading}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  logoRow: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
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
  chatArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  panel: {
    marginBottom: 24,
  },
  panelHidden: {
    position: 'absolute',
    left: -9999,
    opacity: 0,
    pointerEvents: 'none',
  },
  welcome: {
    marginBottom: 16,
    paddingVertical: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  bubble: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#f59e0b',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  bubbleTextUser: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  bubbleTextAssistant: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  errorBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7f1d1d',
  },
  errorText: {
    fontSize: 13,
    color: '#fecaca',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#e2e8f0',
  },
  sendBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
});
