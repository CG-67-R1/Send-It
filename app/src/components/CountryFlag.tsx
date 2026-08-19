import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { getHomeCountry, type HomeCountryCode } from '../data/homeCountries';

const FLAG_SOURCES: Record<HomeCountryCode, ImageSourcePropType> = {
  GB: require('../assets/flags/gb.png'),
  IT: require('../assets/flags/it.png'),
  ES: require('../assets/flags/es.png'),
  AU: require('../assets/flags/au.png'),
  FR: require('../assets/flags/fr.png'),
  DE: require('../assets/flags/de.png'),
  JP: require('../assets/flags/jp.png'),
  US: require('../assets/flags/us.png'),
};

type CountryFlagProps = {
  code: HomeCountryCode;
  height?: number;
};

/** Bundled country flag for the home header (release country). */
export function CountryFlag({ code, height = 14 }: CountryFlagProps) {
  const { aspectRatio, name } = getHomeCountry(code);
  const width = Math.round(height * aspectRatio);
  return (
    <View
      style={[styles.frame, { width, height, borderRadius: Math.max(1, Math.round(height / 8)) }]}
      accessibilityRole="image"
      accessibilityLabel={`${name} flag`}
    >
      <Image source={FLAG_SOURCES[code]} style={{ width, height }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248, 250, 252, 0.45)',
    backgroundColor: '#020617',
  },
});
