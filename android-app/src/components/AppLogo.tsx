import React from 'react';
import { Image, StyleProp, ImageStyle } from 'react-native';

const APP_LOGO = require('../assets/RR.png');

type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = 32, style }: AppLogoProps) {
  return (
    <Image
      source={APP_LOGO}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
    />
  );
}

