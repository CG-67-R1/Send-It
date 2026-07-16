import React, { useCallback, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BikeSetupHotspotSheet } from '../components/BikeSetupHotspotSheet';
import { BIKE_SETUP_HOTSPOTS, type BikeSetupHotspot } from '../data/bikeSetupBasics';

const DIAGRAM = require('../assets/bike-setup/suspension-bike.png');

/** Outer tap target — keep larger than the visible dot for usability. */
const HOTSPOT_HIT = 28;
const HOTSPOT_DOT = 12;

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
      <View style={styles.diagramStage}>
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
      </View>

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
  diagramStage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  diagramWrap: {
    width: '100%',
    aspectRatio: 1534 / 794,
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
    borderWidth: 2,
    borderColor: '#ef4444',
  },
});
