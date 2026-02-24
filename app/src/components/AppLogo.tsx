import React from 'react';
import { StyleProp, ImageStyle, View, Text } from 'react-native';

// Logo: add app/src/assets/RR.png and use <Image source={require('../assets/RR.png')} /> to use an image instead
type AppLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppLogo({ size = 32, style }: AppLogoProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 8,
          backgroundColor: '#f59e0b',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#0f172a',
          fontWeight: '800',
          fontSize: Math.max(10, size * 0.5),
        }}
        numberOfLines={1}
      >
        RR
      </Text>
    </View>
  );
}

