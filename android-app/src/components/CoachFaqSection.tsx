import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RiderAiFaqItem } from '../data/riderAiFaqs';

type Props = {
  title?: string;
  items: RiderAiFaqItem[];
  onAskQuestion?: (question: string) => void;
  askLabel?: string;
};

export function CoachFaqSection({
  title = 'FAQs',
  items,
  onAskQuestion,
  askLabel = 'Ask coach about this',
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);

  const toggleItem = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setSectionOpen((open) => !open)}
        activeOpacity={0.85}
      >
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerChevron}>{sectionOpen ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {sectionOpen ? (
        <View style={styles.list}>
          {items.map((item) => {
            const open = expandedId === item.id;
            return (
              <View key={item.id} style={styles.item}>
                <TouchableOpacity
                  style={styles.questionRow}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.questionText}>{item.question}</Text>
                  <Text style={styles.itemChevron}>{open ? '▾' : '▸'}</Text>
                </TouchableOpacity>
                {open ? (
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerText}>{item.answer}</Text>
                    {onAskQuestion ? (
                      <TouchableOpacity
                        style={styles.askBtn}
                        onPress={() => onAskQuestion(item.question)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.askBtnText}>{askLabel}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#172033',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
  },
  headerChevron: {
    fontSize: 14,
    color: '#94a3b8',
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  item: {
    marginTop: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    lineHeight: 20,
  },
  itemChevron: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  answerBlock: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  answerText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 21,
    marginTop: 10,
  },
  askBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
  },
  askBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
});
