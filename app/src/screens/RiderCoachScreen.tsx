import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { AppLogo } from '../components/AppLogo';
import { COMPACT_LOGO_SIZE } from '../constants/logoSizing';
import { CoachFaqSection } from '../components/CoachFaqSection';
import { faqsForMode } from '../data/riderAiFaqs';
import {
  attachmentSummary,
  attachmentsToPayload,
  canAddAttachment,
  pickCoachDataFile,
  pickCoachPhotoFromLibrary,
  showCoachAttachMenu,
  takeCoachPhoto,
  type CoachAttachment,
} from '../utils/coachAttachments';
import {
  sendCoachChat,
  type CoachChatDisplayMessage,
  type CoachChatMessage,
} from '../utils/coachChat';

type CoachTab = 'coach' | 'bikesetup';

type ChatMessage = CoachChatDisplayMessage;

type RiderCoachRouteParams = {
  RiderCoach: {
    seedMessages?: ChatMessage[];
    seedDraftMessage?: string;
  };
};

export function RiderCoachScreen() {
  const route = useRoute<RouteProp<RiderCoachRouteParams, 'RiderCoach'>>();
  const [activeTab, setActiveTab] = useState<CoachTab>('coach');
  const [coachMessages, setCoachMessages] = useState<ChatMessage[]>([]);
  const [bikeMessages, setBikeMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<CoachAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastSeedKeyRef = useRef<string | null>(null);
  const lastDraftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const seed = route.params?.seedMessages;
    if (!seed?.length) return;
    const seedKey = JSON.stringify(seed);
    if (lastSeedKeyRef.current === seedKey) return;
    lastSeedKeyRef.current = seedKey;
    setActiveTab('coach');
    setCoachMessages(seed);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [route.params?.seedMessages]);

  useEffect(() => {
    const draft = route.params?.seedDraftMessage?.trim();
    if (!draft) return;
    if (lastDraftKeyRef.current === draft) return;
    lastDraftKeyRef.current = draft;
    setActiveTab('coach');
    setInput(draft);
    setError(null);
  }, [route.params?.seedDraftMessage]);

  const messages = activeTab === 'coach' ? coachMessages : bikeMessages;
  const setMessages = activeTab === 'coach' ? setCoachMessages : setBikeMessages;
  const coachFaqs = faqsForMode('coach');
  const bikeFaqs = faqsForMode('bikesetup');

  const prefillQuestion = useCallback((question: string) => {
    setInput(question);
    setError(null);
  }, []);

  const addAttachment = useCallback(async (picker: () => Promise<CoachAttachment | null>) => {
    if (!canAddAttachment(pendingAttachments.length)) return;
    const att = await picker();
    if (!att) return;
    setPendingAttachments((prev) => [...prev, att]);
    setError(null);
  }, [pendingAttachments.length]);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const openAttachMenu = useCallback(() => {
    if (loading) return;
    showCoachAttachMenu({
      onPhoto: () => {
        void addAttachment(pickCoachPhotoFromLibrary);
      },
      onCamera: () => {
        void addAttachment(takeCoachPhoto);
      },
      onFile: () => {
        void addAttachment(pickCoachDataFile);
      },
    });
  }, [addAttachment, loading]);

  const renderMessageBubble = (m: ChatMessage, i: number) => (
    <View
      key={i}
      style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
    >
      {m.attachments?.map((att, j) =>
        att.kind === 'image' ? (
          <Image key={j} source={{ uri: att.uri }} style={styles.bubbleImage} resizeMode="cover" />
        ) : (
          <View key={j} style={styles.fileChip}>
            <Text style={m.role === 'user' ? styles.fileChipTextUser : styles.fileChipTextAssistant}>
              📎 {att.name}
            </Text>
          </View>
        )
      )}
      {m.content ? (
        <Text style={m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
          {m.content}
        </Text>
      ) : null}
    </View>
  );

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    const attachments = pendingAttachments;
    if ((!text && !attachments.length) || loading) return;

    setInput('');
    setPendingAttachments([]);
    setError(null);

    const displayContent = text || attachmentSummary(attachments);
    const userMsg: ChatMessage = {
      role: 'user',
      content: displayContent,
      attachments: attachments.map((att) =>
        att.kind === 'image'
          ? { kind: 'image', uri: att.uri, name: att.name }
          : { kind: 'file', name: att.name }
      ),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const history = activeTab === 'coach' ? coachMessages : bikeMessages;
    const historyForApi: CoachChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await sendCoachChat(
        text,
        activeTab,
        historyForApi,
        attachmentsToPayload(attachments)
      );
      if (!result.ok) {
        setMessages((prev) => prev.slice(0, -1));
        setPendingAttachments(attachments);
        setInput(text);
        setError(result.error);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setMessages((prev) => prev.slice(0, -1));
      setPendingAttachments(attachments);
      setInput(text);
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [
    input,
    pendingAttachments,
    loading,
    activeTab,
    coachMessages,
    bikeMessages,
    setMessages,
  ]);

  const canSend = !loading && (input.trim().length > 0 || pendingAttachments.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <AppLogo size={COMPACT_LOGO_SIZE} />
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
                  Ask about technique, lines, braking, and race craft. Attach tyre photos or lap-timer
                  exports for feedback.
                </Text>
              </View>
            )}
            <CoachFaqSection
              title="Rider Coach FAQs"
              items={coachFaqs}
              onAskQuestion={activeTab === 'coach' ? prefillQuestion : undefined}
            />
            {coachMessages.map((m, i) => renderMessageBubble(m, i))}
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
                  Ask about suspension, gearing, tyres, and setup. Attach photos or telemetry exports
                  for specific feedback.
                </Text>
              </View>
            )}
            <CoachFaqSection
              title="Bike Setup FAQs"
              items={bikeFaqs}
              onAskQuestion={activeTab === 'bikesetup' ? prefillQuestion : undefined}
            />
            {bikeMessages.map((m, i) => renderMessageBubble(m, i))}
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

        {pendingAttachments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pendingRow}
            contentContainerStyle={styles.pendingContent}
            keyboardShouldPersistTaps="handled"
          >
            {pendingAttachments.map((att) => (
              <View key={att.id} style={styles.pendingChip}>
                {att.kind === 'image' ? (
                  <Image source={{ uri: att.uri }} style={styles.pendingThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.pendingFile}>
                    <Text style={styles.pendingFileIcon}>📎</Text>
                  </View>
                )}
                <Text style={styles.pendingName} numberOfLines={1}>
                  {att.name}
                </Text>
                <TouchableOpacity
                  style={styles.pendingRemove}
                  onPress={() => removePendingAttachment(att.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.pendingRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[styles.attachBtn, loading && styles.attachBtnDisabled]}
            onPress={openAttachMenu}
            disabled={loading}
            accessibilityLabel="Attach photo or file"
          >
            <Text style={styles.attachBtnText}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={
              activeTab === 'coach'
                ? 'Ask your coach… (attach photos or data)'
                : 'Ask about setup… (attach photos or data)'
            }
            placeholderTextColor="#64748b"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            editable={!loading}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!canSend}
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
  bubbleImage: {
    width: 180,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#0f172a',
  },
  fileChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  fileChipTextUser: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  fileChipTextAssistant: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  pendingRow: {
    maxHeight: 88,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  pendingContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pendingChip: {
    width: 72,
    alignItems: 'center',
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  pendingFile: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingFileIcon: {
    fontSize: 22,
  },
  pendingName: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    maxWidth: 72,
  },
  pendingRemove: {
    position: 'absolute',
    top: -4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingRemoveText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
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
    gap: 8,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnDisabled: {
    opacity: 0.5,
  },
  attachBtnText: {
    fontSize: 26,
    lineHeight: 28,
    color: '#f59e0b',
    fontWeight: '400',
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
