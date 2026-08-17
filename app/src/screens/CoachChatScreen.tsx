import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiErrorMessage } from '../../constants/api';
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
  createChatMessage,
  ensureMessageIds,
  sendCoachChat,
  type CoachChatDisplayMessage,
  type CoachChatMessage,
  type CoachMode,
} from '../utils/coachChat';
import { buildCoachGoalsPrompt, getBikeSetupDaySheet } from '../storage/bikeSetupSheet';
import type { RiderCoachStackParamList } from './RiderCoachScreen';

type ChatMessage = CoachChatDisplayMessage;

type Nav = NativeStackNavigationProp<RiderCoachStackParamList, 'CoachChat'>;
type Route = RouteProp<RiderCoachStackParamList, 'CoachChat'>;

export function CoachChatScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const mode: CoachMode = route.params?.mode === 'bikesetup' ? 'bikesetup' : 'coach';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<CoachAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestMode, setSuggestMode] = useState<CoachMode | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lastSeedKeyRef = useRef<string | null>(null);
  const lastDraftKeyRef = useRef<string | null>(null);
  const goalsSeededRef = useRef(false);
  const modeRef = useRef(mode);
  const conversationGenerationRef = useRef(0);

  // Reset chat when switching between Coach and Bike Setup screens
  useEffect(() => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;
    setMessages([]);
    setInput('');
    setPendingAttachments([]);
    setError(null);
    setSuggestMode(null);
    lastSeedKeyRef.current = null;
    lastDraftKeyRef.current = null;
    goalsSeededRef.current = false;
  }, [mode]);

  useEffect(() => {
    const seed = route.params?.seedMessages;
    if (!seed?.length) return;
    const seedKey = JSON.stringify(seed);
    if (lastSeedKeyRef.current === seedKey) return;
    lastSeedKeyRef.current = seedKey;
    setMessages(ensureMessageIds(seed));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [route.params?.seedMessages]);

  useEffect(() => {
    const draft = route.params?.seedDraftMessage?.trim();
    if (!draft) return;
    if (lastDraftKeyRef.current === draft) return;
    lastDraftKeyRef.current = draft;
    setInput(draft);
    setError(null);
    navigation.setParams({ seedDraftMessage: undefined });
  }, [route.params?.seedDraftMessage, navigation]);

  useEffect(() => {
    if (mode !== 'coach') return;
    if (route.params?.seedMessages?.length) return;
    if (goalsSeededRef.current) return;
    let cancelled = false;
    (async () => {
      const sheet = await getBikeSetupDaySheet();
      if (cancelled) return;
      goalsSeededRef.current = true;
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        return [
          createChatMessage({
            role: 'assistant',
            content: buildCoachGoalsPrompt(sheet.goalsForToday),
          }),
        ];
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, route.params?.seedMessages]);

  const clearConversation = useCallback(() => {
    Alert.alert(
      'Start a new chat?',
      'This clears the current conversation, draft, and attachments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            conversationGenerationRef.current += 1;
            const clearedGeneration = conversationGenerationRef.current;
            setMessages([]);
            setInput('');
            setPendingAttachments([]);
            setLoading(false);
            setError(null);
            setSuggestMode(null);
            lastSeedKeyRef.current = null;
            lastDraftKeyRef.current = null;
            navigation.setParams({
              seedMessages: undefined,
              seedDraftMessage: undefined,
            });

            if (mode === 'coach') {
              goalsSeededRef.current = true;
              void getBikeSetupDaySheet().then((sheet) => {
                if (
                  clearedGeneration !== conversationGenerationRef.current ||
                  modeRef.current !== 'coach'
                ) {
                  return;
                }
                setMessages([
                  createChatMessage({
                    role: 'assistant',
                    content: buildCoachGoalsPrompt(sheet.goalsForToday),
                  }),
                ]);
              });
            } else {
              goalsSeededRef.current = false;
            }
          },
        },
      ]
    );
  }, [mode, navigation]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={clearConversation}
          style={styles.headerClearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear conversation"
          accessibilityHint="Start a new chat after confirmation"
        >
          <Text style={styles.headerClearText}>Clear</Text>
        </TouchableOpacity>
      ),
    });
  }, [clearConversation, navigation]);

  const switchToSuggestedMode = useCallback(() => {
    if (!suggestMode || suggestMode === mode) return;
    const target = suggestMode;
    setSuggestMode(null);
    const handoff =
      target === 'bikesetup'
        ? 'Switched to Bike Setup. Tell me your bike, what feels off (tyres, sag, damping, gearing), and we will dig in.'
        : 'Switched to Coach. Tell me what you are working on — lines, braking, body position, or a specific corner — and we will dig in.';
    navigation.navigate('CoachChat', {
      mode: target,
      seedMessages: [createChatMessage({ role: 'assistant', content: handoff })],
    });
  }, [suggestMode, mode, navigation]);

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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    const attachments = pendingAttachments;
    if ((!text && !attachments.length) || loading) return;

    setInput('');
    setPendingAttachments([]);
    setError(null);
    setSuggestMode(null);

    const displayContent = text || attachmentSummary(attachments);
    const userMsg = createChatMessage({
      role: 'user',
      content: displayContent,
      attachments: attachments.map((att) =>
        att.kind === 'image'
          ? { kind: 'image', uri: att.uri, name: att.name }
          : { kind: 'file', name: att.name }
      ),
    });
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    const requestGeneration = conversationGenerationRef.current;

    const historyForApi: CoachChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await sendCoachChat(
        text,
        mode,
        historyForApi,
        attachmentsToPayload(attachments)
      );
      if (requestGeneration !== conversationGenerationRef.current) return;
      if (!result.ok) {
        setMessages((prev) => prev.slice(0, -1));
        setPendingAttachments(attachments);
        setInput(text);
        setError(result.error);
        return;
      }

      setMessages((prev) => [
        ...prev,
        createChatMessage({ role: 'assistant', content: result.reply }),
      ]);
      if (result.suggestMode && result.suggestMode !== mode) {
        setSuggestMode(result.suggestMode);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      if (requestGeneration !== conversationGenerationRef.current) return;
      setMessages((prev) => prev.slice(0, -1));
      setPendingAttachments(attachments);
      setInput(text);
      setError(apiErrorMessage(e));
    } finally {
      if (requestGeneration === conversationGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [input, pendingAttachments, loading, mode, messages]);

  const canSend = !loading && (input.trim().length > 0 || pendingAttachments.length > 0);

  return (
    <View style={styles.container}>
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
          {messages.length === 0 && mode === 'bikesetup' ? (
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>RR Bike Setup</Text>
              <Text style={styles.welcomeSubtitle}>
                Ask about suspension, gearing, tyres, and setup. Attach photos or telemetry exports
                for specific feedback.
              </Text>
            </View>
          ) : null}
          {messages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
            >
              {m.attachments?.map((att, j) =>
                att.kind === 'image' ? (
                  <Image
                    key={`${m.id}-img-${att.uri}-${j}`}
                    source={{ uri: att.uri }}
                    style={styles.bubbleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View key={`${m.id}-file-${att.name}-${j}`} style={styles.fileChip}>
                    <Text
                      style={
                        m.role === 'user' ? styles.fileChipTextUser : styles.fileChipTextAssistant
                      }
                    >
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
          ))}
          {loading ? (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator size="small" color="#94a3b8" />
            </View>
          ) : null}
        </ScrollView>

        {error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {suggestMode && suggestMode !== mode ? (
          <TouchableOpacity
            style={styles.suggestBar}
            onPress={switchToSuggestedMode}
            activeOpacity={0.85}
          >
            <Text style={styles.suggestText}>
              {suggestMode === 'bikesetup'
                ? 'This sounds more like bike setup — tap to open RR Bike Setup'
                : 'This sounds more like riding technique — tap to open RR AI Coach'}
            </Text>
          </TouchableOpacity>
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
              mode === 'coach'
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
  chatArea: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexGrow: 1,
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
  suggestBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  suggestText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 20,
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
  headerClearButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  headerClearText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '700',
  },
});
