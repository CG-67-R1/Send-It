import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getBikePhotoUri, setBikePhotoUri, clearBikePhoto } from '../storage/bikePhoto';
import { getAvatarPhotoUri } from '../storage/avatarPhoto';
import { getOnboardingAnswers } from '../storage/onboarding';
import { AppLogo } from '../components/AppLogo';
import { AVATAR_SOURCES } from '../constants/avatars';

type HeadlinesStackParamList = {
  Headlines: undefined;
  HeadlinesList: undefined;
  HeadlinesSettings: undefined;
};

export function HeadlinesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HeadlinesStackParamList, 'Headlines'>>();
  const [bikePhotoUri, setBikePhotoUriState] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('devil');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [noFaceFrameId, setNoFaceFrameId] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const loadData = useCallback(async () => {
    const [uri, answers, avatarUri] = await Promise.all([
      getBikePhotoUri(),
      getOnboardingAnswers(),
      getAvatarPhotoUri(),
    ]);
    setBikePhotoUriState(uri);
    setNickname(answers?.riderNickname?.trim() || answers?.favouriteRider?.trim() || 'Rider');
    setAvatarId(answers?.avatarId ?? 'devil');
    setCustomAvatarUri(answers?.avatarId === 'custom' ? avatarUri : null);
    setNoFaceFrameId(answers?.noFaceFrameId ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pickBikePhoto = useCallback(async () => {
    if (pickingPhoto) return;
    setPickingPhoto(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo access',
          'Allow photo access to set a picture of your bike.',
          [{ text: 'OK' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = await setBikePhotoUri(result.assets[0].uri);
        setBikePhotoUriState(uri);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not pick image';
      Alert.alert('Error', message);
    } finally {
      setPickingPhoto(false);
    }
  }, [pickingPhoto]);

  const removeBikePhoto = useCallback(() => {
    Alert.alert(
      'Remove bike photo',
      'Remove the photo of your bike from the home screen?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearBikePhoto();
            setBikePhotoUriState(null);
          },
        },
      ]
    );
  }, []);

  const tabNav = navigation.getParent();
  const goToHeadlines = () => navigation.navigate('HeadlinesList');
  const goToCalendar = () => tabNav?.navigate('CalendarTab' as never);
  const goToQA = () => tabNav?.navigate('Q&A' as never);
  const goToTrackWalk = () => tabNav?.navigate('TrackWalkTab' as never);
  const goToRiderCoach = () => tabNav?.navigate('RiderCoachTab' as never);
  const goToSettings = () => navigation.navigate('HeadlinesSettings');

  const displayName = nickname.toUpperCase();
  const { height: windowHeight, width: windowWidth } = Dimensions.get('window');
  const heroHeight = windowHeight * 0.6;
  const buttonsHeight = windowHeight * 0.4;
  const avatarSize = Math.round(Math.max(heroHeight * 0.6, 88)); // min 88px so visible on small screens
  const logoSize = Math.round(heroHeight * 0.66); // doubled: 66% of hero height, top-left
  const pocBikeImage = require('../../assets/home-poc-bike.png');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { minHeight: windowHeight }]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[styles.heroTouchable, { height: heroHeight }]}
        onPress={pickBikePhoto}
        onLongPress={bikePhotoUri ? removeBikePhoto : undefined}
        activeOpacity={0.95}
        disabled={pickingPhoto}
      >
        <View style={[styles.heroImageContainer, { height: heroHeight }]}>
          <View style={styles.heroLogoWrap} pointerEvents="none">
            <AppLogo size={logoSize} />
          </View>
          {bikePhotoUri ? (
            <Image source={{ uri: bikePhotoUri }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <Image source={pocBikeImage} style={styles.heroImage} resizeMode="cover" />
          )}
          {pickingPhoto && (
            <View style={styles.heroPlaceholder}>
              <ActivityIndicator size="large" color="#f59e0b" />
            </View>
          )}
          {/* Vignette overlay: darken edges */}
          <View style={styles.vignetteOverlay} pointerEvents="none">
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'transparent']}
              style={styles.vignetteEdge}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'transparent']}
              style={[styles.vignetteEdge, styles.vignetteBottom]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'transparent']}
              style={styles.vignetteSide}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'transparent']}
              style={[styles.vignetteSide, styles.vignetteRight]}
              start={{ x: 1, y: 0.5 }}
              end={{ x: 0, y: 0.5 }}
            />
          </View>
          {/* Avatar (right) + name below so name is never cut off; logo 33% top-left */}
          <View style={styles.nicknameWrap} pointerEvents="none">
            <View style={styles.avatarBlock}>
              {avatarId === 'custom' && customAvatarUri ? (
                <View style={styles.avatarOverlayWrap}>
                  {noFaceFrameId && AVATAR_SOURCES[noFaceFrameId] != null ? (
                    <View style={[styles.faceInFrameWrap, { width: avatarSize, height: avatarSize }]}>
                      <Image
                        source={{ uri: customAvatarUri }}
                        style={[
                          styles.faceInFramePhoto,
                          {
                            position: 'absolute',
                            width: Math.round(avatarSize * 0.38),
                            height: Math.round(avatarSize * 0.38),
                            borderRadius: Math.round(avatarSize * 0.19),
                            left: Math.round(avatarSize * 0.31),
                            top: Math.round(avatarSize * 0.22),
                          },
                        ]}
                        resizeMode="cover"
                      />
                      <Image
                        source={AVATAR_SOURCES[noFaceFrameId]}
                        style={[styles.avatarImageNoBox, { width: avatarSize, height: avatarSize }]}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: customAvatarUri }}
                      style={[styles.avatarImageNoBox, { width: avatarSize, height: avatarSize }]}
                      resizeMode="contain"
                    />
                  )}
                </View>
              ) : AVATAR_SOURCES[avatarId] != null ? (
                <View style={styles.avatarOverlayWrap}>
                  <Image
                    source={AVATAR_SOURCES[avatarId]}
                    style={[styles.avatarImageNoBox, { width: avatarSize, height: avatarSize }]}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
            </View>
            <Text style={[styles.nickname, { maxWidth: windowWidth - 40 }]} numberOfLines={2} ellipsizeMode="tail">{displayName}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.buttons, { minHeight: buttonsHeight }]}>
        <TouchableOpacity style={styles.navButton} onPress={goToHeadlines} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Bike News</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToCalendar} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToQA} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Q & A</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToTrackWalk} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Track Walk / Track Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToRiderCoach} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Coach & Bike Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={goToSettings} activeOpacity={0.8}>
          <Text style={styles.settingsButtonText}>News settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    paddingBottom: 32,
  },
  heroTouchable: {
    width: '100%',
    marginBottom: 0,
  },
  heroImageContainer: {
    width: '100%',
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  heroLogoWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    paddingTop: 8,
    paddingLeft: 8,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  vignetteEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '35%',
  },
  vignetteBottom: {
    top: undefined,
    bottom: 0,
  },
  vignetteSide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
  },
  vignetteRight: {
    left: undefined,
    right: 0,
  },
  nicknameWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 6,
  },
  avatarBlock: {
    alignSelf: 'flex-end',
    minWidth: 88,
    minHeight: 88,
  },
  avatarOverlayWrap: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  faceInFrameWrap: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  faceInFramePhoto: {
    backgroundColor: 'transparent',
  },
  avatarImageNoBox: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  avatarImage: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  nickname: {
    fontFamily: 'Race Sport',
    fontSize: 32,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  buttons: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  navButton: {
    width: '100%',
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontFamily: 'Race Sport',
    fontSize: 17,
    color: '#f8fafc',
  },
  settingsButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
  },
  settingsButtonText: {
    fontFamily: 'Race Sport',
    fontSize: 15,
    color: '#94a3b8',
  },
});
