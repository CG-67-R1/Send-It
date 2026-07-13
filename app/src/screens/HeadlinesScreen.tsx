import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  type ImageSourcePropType,
  Linking,
  Platform,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBikePhotoUri, setBikePhotoUri, clearBikePhoto } from '../storage/bikePhoto';
import { photoDisplayUri } from '../storage/localPhotoStorage';
import { getAvatarFacePhotoUri } from '../storage/avatarFacePhoto';
import { HEADLINES_URL } from '../../constants/api';
import { getOnboardingAnswers } from '../storage/onboarding';
import { HERO_AVATAR_BADGE_SIZE } from '../avatar/heroBadgeSizing';
import { HERO_LOGO_SIZE } from '../constants/logoSizing';
import { getAvatarPreset, getAvatarSource, getFaceHoleLayout } from '../avatar/presets';
import { AppLogo } from '../components/AppLogo';
import { AvatarFaceEllipse } from '../components/AvatarFaceEllipse';

type HeadlinesStackParamList = {
  Headlines: undefined;
  HeadlinesList: undefined;
  HeadlinesSettings: undefined;
};

export function HeadlinesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HeadlinesStackParamList, 'Headlines'>>();
  const [bikePhotoUri, setBikePhotoUriState] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [hasPrefetchedHeadlines, setHasPrefetchedHeadlines] = useState(false);
  const [avatarSource, setAvatarSource] = useState<ImageSourcePropType | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarFaceUri, setAvatarFaceUri] = useState<string | null>(null);

  useEffect(() => {
    if (hasPrefetchedHeadlines) return;
    setHasPrefetchedHeadlines(true);
    (async () => {
      try {
        await fetch(HEADLINES_URL, { signal: AbortSignal.timeout(25000) });
      } catch {
        // Best-effort warm-up only.
      }
    })();
  }, [hasPrefetchedHeadlines]);

  const loadData = useCallback(async () => {
    const [uri, answers, faceUri] = await Promise.all([
      getBikePhotoUri(),
      getOnboardingAnswers(),
      getAvatarFacePhotoUri(),
    ]);
    setBikePhotoUriState(uri);
    setNickname(answers?.riderNickname?.trim() || answers?.favouriteRider?.trim() || 'Rider');
    const aid = answers?.avatarId ?? null;
    setAvatarId(aid);
    setAvatarSource(getAvatarSource(aid));
    setAvatarFaceUri(faceUri);
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
  const { height: windowHeight } = Dimensions.get('window');
  const heroHeight = windowHeight * 0.6;
  const buttonsHeight = windowHeight * 0.4;
  const pocBikeImage = require('../../assets/home-poc-bike.png');

  const avatarPreset = getAvatarPreset(avatarId);
  const faceHoleLayout = getFaceHoleLayout(avatarId);
  const showFaceComposite = Boolean(
    avatarPreset?.hasFaceHole && avatarFaceUri && faceHoleLayout && avatarSource
  );
  const faceBehindAvatar = avatarPreset?.compositeFaceBehindAvatar !== false;

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
            <AppLogo size={HERO_LOGO_SIZE} />
          </View>
          {bikePhotoUri ? (
            <Image
              key={bikePhotoUri}
              source={{ uri: photoDisplayUri(bikePhotoUri) }}
              style={styles.heroImage}
              resizeMode="cover"
            />
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
            {/* Extra corner darkening so bottom-right avatar + name stay readable */}
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(0,0,0,0.35)']}
              style={styles.vignetteCorner}
              start={{ x: 0.2, y: 0.2 }}
              end={{ x: 1, y: 1 }}
            />
          </View>
          {!bikePhotoUri && !pickingPhoto ? (
            <View style={styles.heroHintWrap} pointerEvents="none">
              <Text style={styles.heroHintText}>Tap to add your bike photo</Text>
            </View>
          ) : null}
          {/* Avatar + rider name: bottom-right, over bike photo */}
          <View
            style={[
              styles.heroAvatarCluster,
              {
                paddingBottom: Math.max(insets.bottom, 12) + 4,
                paddingRight: Math.max(insets.right, 12),
              },
            ]}
          >
            {avatarSource ? (
              <TouchableOpacity
                style={styles.avatarShadowWrap}
                onPress={goToSettings}
                activeOpacity={0.85}
                accessibilityLabel="Edit profile and avatar"
              >
                <View style={styles.avatarBadge}>
                  {showFaceComposite && faceHoleLayout ? (
                    <AvatarFaceEllipse
                      key={avatarFaceUri}
                      badgeSize={HERO_AVATAR_BADGE_SIZE}
                      avatarSource={avatarSource}
                      faceUri={avatarFaceUri!}
                      layout={faceHoleLayout}
                      faceBehindAvatar={faceBehindAvatar}
                    />
                  ) : (
                    <Image source={avatarSource} style={styles.avatarBadgeImage} resizeMode="contain" />
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.addAvatarBtn} onPress={goToSettings} activeOpacity={0.85}>
                <Text style={styles.addAvatarBtnText}>Add avatar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={goToSettings} activeOpacity={0.85}>
              <Text style={styles.nicknameHero}>{displayName}</Text>
            </TouchableOpacity>
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
          <Text style={styles.settingsButtonText}>Profile & settings</Text>
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
    top: 16,
    left: 20,
    zIndex: 2,
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
  vignetteCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '55%',
    height: '45%',
  },
  heroAvatarCluster: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '92%',
  },
  heroHintWrap: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  heroHintText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  addAvatarBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.6)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  addAvatarBtnText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
  },
  nicknameHero: {
    fontFamily: 'RaceSport',
    fontSize: 26,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 3,
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  avatarShadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    ...(Platform.OS === 'android' ? { elevation: 14 } : {}),
  },
  avatarBadge: {
    width: HERO_AVATAR_BADGE_SIZE,
    height: HERO_AVATAR_BADGE_SIZE,
    borderRadius: HERO_AVATAR_BADGE_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'transparent',
  },
  avatarBadgeImage: {
    width: '100%',
    height: '100%',
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
    fontFamily: 'RaceSport',
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
    fontFamily: 'RaceSport',
    fontSize: 15,
    color: '#94a3b8',
  },
});
