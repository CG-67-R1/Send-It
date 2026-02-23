import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TRACKDAY_RIDER_AI_URL } from '../../constants/api';

type CoachTab = 'coach' | 'bikesetup';

export function RiderCoachScreen() {
  const [activeTab, setActiveTab] = useState<CoachTab>('coach');

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coach' && styles.tabActive]}
          onPress={() => setActiveTab('coach')}
        >
          <Text style={[styles.tabText, activeTab === 'coach' && styles.tabTextActive]}>
            Coach
          </Text>
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Coach tab – keep mounted so state stays live */}
        <View style={[styles.panel, activeTab !== 'coach' && styles.panelHidden]}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Rider Coach</Text>
            <Text style={styles.heroSubtitle}>
              Your road racing AI coach. Tips, technique, and race craft—ready when you are.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Trackday Rider AI</Text>
            <Text style={styles.cardText}>
              Chat with your AI coach for technique, lines, and race craft. Opens in your browser.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => Linking.openURL(TRACKDAY_RIDER_AI_URL)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Open Trackday Rider AI</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bike Setup tab – keep mounted so state stays live */}
        <View style={[styles.panel, activeTab !== 'bikesetup' && styles.panelHidden]}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Bike Setup</Text>
            <Text style={styles.heroSubtitle}>
              Technical assistant for suspension, gearing, and bike setup.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Trackday Rider AI</Text>
            <Text style={styles.cardText}>
              Ask about suspension, gearing, and bike setup. Same AI, technical focus.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => Linking.openURL(TRACKDAY_RIDER_AI_URL)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Open Trackday Rider AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  hero: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
});
