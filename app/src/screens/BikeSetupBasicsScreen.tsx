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

const DIAGRAM = require('../assets/bike-setup/suspension-bike.png');

/** Larger hit targets so spaced callouts are easy to tap. */
const HOTSPOT_HIT = 44;
const HOTSPOT_DOT = 14;

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
        <Text style={styles.hint}>Tap a red point for road and track base settings.</Text>

        <View style={styles.diagramWrap} onLayout={onDiagramLayout}>
          <Image source={DIAGRAM} style={styles.diagram} resizeMode="contain" />
          {diagramSize.width > 0
            ? BIKE_SETUP_HOTSPOTS.map((h) => {
                const left = (h.xPct / 100) * diagramSize.width - HOTSPOT_HIT / 2;
                const top = (h.yPct / 100) * diagramSize.height - HOTSPOT_HIT / 2;
                const isAdjust = h.kind === 'adjust';
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.hotspot, { left, top }]}
                    onPress={() => setSelected(h)}
                    activeOpacity={0.7}
                    accessibilityLabel={h.title}
                    accessibilityRole="button"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 28,
  },
  intro: {
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 22,
    marginBottom: 8,
  },
  caveat: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  diagramWrap: {
    width: '100%',
    aspectRatio: 1788 / 858,
    backgroundColor: 'transparent',
  },
  diagram: {
    width: '100%',
    height: '100%',
  },
  hotspot: {
    position: 'absolute',
    width: HOTSPOT_HIT,
    height: HOTSPOT_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotInner: {
    width: HOTSPOT_DOT,
    height: HOTSPOT_DOT,
    borderRadius: HOTSPOT_DOT / 2,
  },
  hotspotMeasure: {
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  hotspotAdjust: {
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: '#ef4444',
  },
});
