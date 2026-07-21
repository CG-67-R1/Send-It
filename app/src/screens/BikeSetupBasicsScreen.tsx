import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Platform,
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
  CoachChat: {
    mode: 'coach' | 'bikesetup';
    seedDraftMessage?: string;
  };
  BikeSetupBasics: undefined;
};

type Nav = NativeStackNavigationProp<RiderCoachStackParams, 'BikeSetupBasics'>;

export function BikeSetupBasicsScreen() {
  const navigation = useNavigation<Nav>();
  const [selected, setSelected] = useState<BikeSetupHotspot | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [diagramSize, setDiagramSize] = useState({ width: 0, height: 0 });
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    };
  }, []);

  const onDiagramLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDiagramSize({ width, height });
  }, []);

  const openAi = useCallback(
    (hotspot: BikeSetupHotspot) => {
      setSelected(null);
      navigation.navigate('CoachChat', {
        mode: 'bikesetup',
        seedDraftMessage: hotspot.aiPrompt,
      });
    },
    [navigation]
  );

  const selectHotspot = useCallback((hotspot: BikeSetupHotspot) => {
    setSelected(hotspot);
    setSelectedHotspotId(hotspot.id);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => {
      setSelectedHotspotId(null);
      labelTimerRef.current = null;
    }, 2500);
  }, []);

  const labelHotspotId = hoveredHotspotId ?? selectedHotspotId;
  const labelHotspot = BIKE_SETUP_HOTSPOTS.find((h) => h.id === labelHotspotId);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>{BIKE_SETUP_INTRO.whyBase}</Text>
        <Text style={styles.caveat}>{BIKE_SETUP_INTRO.capabilityCaveat}</Text>
        <Text style={styles.hint}>
          Tap a red point, or choose a part below. Labels appear when selected.
        </Text>

        <View style={styles.diagramWrap} onLayout={onDiagramLayout}>
          <Image source={DIAGRAM} style={styles.diagram} resizeMode="contain" />
          {diagramSize.width > 0
            ? BIKE_SETUP_HOTSPOTS.map((h) => {
                const left = (h.xPct / 100) * diagramSize.width - HOTSPOT_HIT / 2;
                const top = (h.yPct / 100) * diagramSize.height - HOTSPOT_HIT / 2;
                const isAdjust = h.kind === 'adjust';
                const webHoverProps =
                  Platform.OS === 'web'
                    ? ({
                        title: h.title,
                        onMouseEnter: () => setHoveredHotspotId(h.id),
                        onMouseLeave: () => setHoveredHotspotId(null),
                      } as any)
                    : {};
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.hotspot, { left, top }]}
                    onPress={() => selectHotspot(h)}
                    activeOpacity={0.7}
                    accessibilityLabel={h.title}
                    accessibilityHint={`Open ${h.title} road and track setup guidance`}
                    accessibilityRole="button"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    {...webHoverProps}
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
          {labelHotspot && diagramSize.width > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.hotspotLabel,
                {
                  left: Math.max(
                    4,
                    Math.min(
                      (labelHotspot.xPct / 100) * diagramSize.width - 80,
                      diagramSize.width - 164
                    )
                  ),
                  top: Math.max(2, (labelHotspot.yPct / 100) * diagramSize.height - 34),
                },
              ]}
            >
              <Text style={styles.hotspotLabelText}>{labelHotspot.title}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.partsSection}>
          <Text style={styles.partsTitle}>Parts list</Text>
          {BIKE_SETUP_HOTSPOTS.map((hotspot) => (
            <TouchableOpacity
              key={hotspot.id}
              style={styles.partRow}
              onPress={() => selectHotspot(hotspot)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={hotspot.title}
              accessibilityHint={`Open ${hotspot.title} road and track setup guidance`}
            >
              <Text style={styles.partTitle}>{hotspot.title}</Text>
              <View
                style={[
                  styles.kindBadge,
                  hotspot.kind === 'measure' ? styles.kindBadgeMeasure : styles.kindBadgeAdjust,
                ]}
              >
                <Text style={styles.kindBadgeText}>{hotspot.kind}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    color: '#cbd5e1',
    marginBottom: 12,
  },
  diagramWrap: {
    width: '100%',
    aspectRatio: 1024 / 682,
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
  hotspotLabel: {
    position: 'absolute',
    width: 160,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1,
    borderColor: '#ef4444',
    zIndex: 2,
  },
  hotspotLabelText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  partsSection: {
    marginTop: 18,
  },
  partsTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  partRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  partTitle: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  kindBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  kindBadgeMeasure: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: '#ef4444',
  },
  kindBadgeAdjust: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: '#f59e0b',
  },
  kindBadgeText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
