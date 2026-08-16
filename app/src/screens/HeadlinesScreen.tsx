import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBikePhotoUri, setBikePhotoUri, clearBikePhoto } from '../storage/bikePhoto';
import { photoDisplayUri } from '../storage/localPhotoStorage';
import { getAvatarFacePhotoUri } from '../storage/avatarFacePhoto';
import { getOnboardingAnswers } from '../storage/onboarding';
import { getSessionHistory, type BikeSetupDaySheet } from '../storage/bikeSetupSheet';
import { getTrackdayPrepHistory, type TrackdayPrepReport } from '../storage/trackdayPrep';
import { HERO_AVATAR_BADGE_SIZE } from '../avatar/heroBadgeSizing';
import { getAvatarPreset, getAvatarSource, getFaceHoleLayout } from '../avatar/presets';
import { AvatarFaceEllipse } from '../components/AvatarFaceEllipse';
import { homeModeFromActivity, type HomeMode } from '../navigation/homeMode';
import type { RootTabParamList } from '../navigation/rootNavigation';

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
  const [favouriteBike, setFavouriteBike] = useState('');
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [homeMode, setHomeMode] = useState<HomeMode>('learn');
  const [lastSession, setLastSession] = useState<BikeSetupDaySheet | null>(null);
  const [lastPrep, setLastPrep] = useState<TrackdayPrepReport | null>(null);
  const [avatarSource, setAvatarSource] = useState<ImageSourcePropType | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarFaceUri, setAvatarFaceUri] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [uri, answers, faceUri, history, prepHistory] = await Promise.all([
      getBikePhotoUri(),
      getOnboardingAnswers(),
      getAvatarFacePhotoUri(),
      getSessionHistory(),
      getTrackdayPrepHistory(),
    ]);
    setBikePhotoUriState(uri);
    setNickname(answers?.riderNickname?.trim() || answers?.favouriteRider?.trim() || 'Rider');
    setFavouriteBike(answers?.favouriteBike?.trim() || '');
    setHomeMode(homeModeFromActivity(answers?.activity));
    setLastSession(history.length ? history[history.length - 1] : null);
    setLastPrep(prepHistory[0] ?? null);
    const nextAvatarId = answers?.avatarId ?? null;
    setAvatarId(nextAvatarId);
    setAvatarSource(getAvatarSource(nextAvatarId));
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

  const tabNav = navigation.getParent<NavigationProp<RootTabParamList>>();
  const goToQA = () => tabNav?.navigate('Q&A', { segment: 'ask' });
  const goToRiderCoach = () => tabNav?.navigate('RiderCoachTab');
  const goToTrackPrep = () => tabNav?.navigate('RiderCoachTab', { screen: 'TrackPrep' });
  const goToBikeSetup = () => tabNav?.navigate('BikeSetupTab');
  const goToBikeSheet = () => tabNav?.navigate('BikeSetupTab', { screen: 'BikeSetupSheet' });
  const goToEvents = () => tabNav?.navigate('CalendarTab');
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
              <Text style={styles.heroPlaceholderCaption}>
                {favouriteBike
                  ? `Favourite: ${favouriteBike} · photo is a placeholder until you upload yours.`
                  : 'Placeholder photo — upload your bike below. Your favourite bike from onboarding is saved in Profile.'}
              </Text>
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
        {homeMode === 'setup' ? (
          <TouchableOpacity
            style={styles.activityCard}
            onPress={goToBikeSheet}
            activeOpacity={0.85}
          >
            <Text style={styles.activityLabel}>Last session</Text>
            {lastSession ? (
              <Text style={styles.activityTitle}>
                {[lastSession.trackName.trim() || 'Setup sheet', lastSession.dateIso]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : (
              <Text style={styles.activityEmpty}>
                Save a session from Bike Setup Sheet to see it here.
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.activityCard}
            onPress={goToTrackPrep}
            activeOpacity={0.85}
          >
            <Text style={styles.activityLabel}>Last track prep</Text>
            {lastPrep ? (
              <Text style={styles.activityTitle}>
                {[lastPrep.trackName.trim() || 'Track prep', lastPrep.dateIso]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : (
              <Text style={styles.activityEmpty}>
                Run Track Prep to see your last briefing here.
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.navButton} onPress={goToRiderCoach} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Rider Coach</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToBikeSetup} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Bike Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToEvents} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={goToQA} activeOpacity={0.8}>
          <Text style={styles.navButtonText}>Q&A</Text>
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
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFill,
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
  heroPlaceholderCaption: {
    maxWidth: 280,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#cbd5e1',
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
  activityCard: {
    width: '100%',
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  activityEmpty: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
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
