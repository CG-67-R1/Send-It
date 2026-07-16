import React, { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BikeSetupHotspotSheet } from '../components/BikeSetupHotspotSheet';
import {
  BIKE_SETUP_HOTSPOTS,
  BIKE_SETUP_INTRO,
  type BikeSetupHotspot,
} from '../data/bikeSetupBasics';

const DIAGRAM = require('../assets/bike-setup/suspension-map.png');

const HOTSPOT_SIZE = 40;

type RiderCoachStackParams = {
  RiderCoach: {
    seedDraftMessage?: string;
    seedTab?: 'coach' | 'bikesetup';
  };
  BikeSetupBasics: undefined;
};

type Nav = NativeStackNavigationProp<RiderCoachStackParams, 'BikeSetupBasics'>;

export function BikeSetupBasicsScreen() {
  const navigation = useNavigation<Nav>();
  const [selected, setSelected] = useState<BikeSetupHotspot | null>(null);
  const [diagramSize, setDiagramSize] = useState({ width: 0, height: 0 });

  const onDiagramLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDiagramSize({ width, height });
  }, []);

  const openAi = useCallback(
    (hotspot: BikeSetupHotspot) => {
      setSelected(null);
      navigation.navigate('RiderCoach', {
        seedTab: 'bikesetup',
        seedDraftMessage: hotspot.aiPrompt,
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
        <Text style={styles.intro}>{BIKE_SETUP_INTRO.whyBase}</Text>
        <Text style={styles.caveat}>{BIKE_SETUP_INTRO.capabilityCaveat}</Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotMeasure]} />
            <Text style={styles.legendText}>Measurement</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotAdjust]} />
            <Text style={styles.legendText}>Adjustment</Text>
          </View>
        </View>

        <Text style={styles.hint}>Tap a red point on the bike for base settings.</Text>

        <View style={styles.diagramWrap} onLayout={onDiagramLayout}>
          <Image source={DIAGRAM} style={styles.diagram} resizeMode="contain" />
          {diagramSize.width > 0
            ? BIKE_SETUP_HOTSPOTS.map((h) => {
                const left = (h.xPct / 100) * diagramSize.width - HOTSPOT_SIZE / 2;
                const top = (h.yPct / 100) * diagramSize.height - HOTSPOT_SIZE / 2;
                const isAdjust = h.kind === 'adjust';
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.hotspot, { left, top }]}
                    onPress={() => setSelected(h)}
                    activeOpacity={0.7}
                    accessibilityLabel={h.title}
                    accessibilityRole="button"
                  >
                    <View
                      style={[
                        styles.hotspotInner,
                        isAdjust ? styles.hotspotAdjust : styles.hotspotMeasure,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })
            : null}
        </View>
      </ScrollView>

      <BikeSetupHotspotSheet
        hotspot={selected}
        onClose={() => setSelected(null)}
        onAskAi={openAi}
      />
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
  intro: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
    marginBottom: 10,
  },
  caveat: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendDotMeasure: {
    backgroundColor: '#ef4444',
  },
  legendDotAdjust: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  legendText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  diagramWrap: {
    width: '100%',
    aspectRatio: 1024 / 576,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  diagram: {
    width: '100%',
    height: '100%',
  },
  hotspot: {
    position: 'absolute',
    width: HOTSPOT_SIZE,
    height: HOTSPOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  hotspotMeasure: {
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fef2f2',
  },
  hotspotAdjust: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#ef4444',
  },
});
