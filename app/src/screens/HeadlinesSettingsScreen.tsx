import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  isTrackArrivalEnabled,
  requestForegroundLocationPermission,
  setTrackArrivalEnabled,
} from '../location/trackGeofence';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../../constants/api';
import { safeOpenUrl } from '../utils/safeOpenUrl';
import { AppLogo } from '../components/AppLogo';
import { SCREEN_LOGO_SIZE } from '../constants/logoSizing';
import { AvatarFaceAlignModal } from '../components/AvatarFaceAlignModal';
import { AvatarFaceCameraModal } from '../components/AvatarFaceCameraModal';
import { AvatarFaceEllipse } from '../components/AvatarFaceEllipse';
import { AVATAR_PRESETS, DEFAULT_FACE_HOLE_LAYOUT, getAvatarPreset, getAvatarSource, getFaceHoleLayout } from '../avatar/presets';
import { getOnboardingAnswers, updateOnboardingAnswers } from '../storage/onboarding';
import { homeModeFromActivity, rememberHomeMode, RIDE_ACTIVITY_OPTIONS, type RideActivity } from '../navigation/homeMode';
import {
  clearAvatarFacePhoto,
  getAvatarFacePhotoUri,
  setAvatarFacePhotoUri,
} from '../storage/avatarFacePhoto';
import { photoDisplayUri } from '../storage/localPhotoStorage';
import { useOnboardingReset } from '../context/OnboardingResetContext';
import { useAvatarFacePicker } from '../hooks/useAvatarFacePicker';
import {
  getBikeSetupDaySheet,
  getSessionHistory,
  clearAllBikeSetupData,
} from '../storage/bikeSetupSheet';
import { clearBikeBalanceState, loadBikeBalanceState } from '../storage/bikeBalance';
import { clearGearingGuideState } from '../storage/gearingGuide';
import { clearTrackWalkSessions } from '../storage/trackWalk';
import { clearTyreWearAnalysisState } from '../storage/tyreWearAnalysis';
import { clearBikePhoto } from '../storage/bikePhoto';
import {
  clearTrackdayPrepData,
  getTrackPrepSelectedTrack,
  getTrackdayPrepDraft,
  getTrackdayPrepHistory,
} from '../storage/trackdayPrep';

export function HeadlinesSettingsScreen() {
  const onboardingReset = useOnboardingReset();
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [riderNickname, setRiderNickname] = useState('');
  const [favouriteBike, setFavouriteBike] = useState('');
  const [activity, setActivity] = useState<RideActivity>('just_love_bikes');
  const [profileBusy, setProfileBusy] = useState(false);
  const [facePreviewUri, setFacePreviewUri] = useState<string | null>(null);
  const [trackArrivalReminders, setTrackArrivalRemindersState] = useState(true);

  const load = useCallback(async () => {
    const trackArrival = await isTrackArrivalEnabled();
    setTrackArrivalRemindersState(trackArrival);
  }, []);

  const loadRiderFace = useCallback(async () => {
    const [answers, uri] = await Promise.all([getOnboardingAnswers(), getAvatarFacePhotoUri()]);
    setAvatarId(answers?.avatarId ?? null);
    setRiderNickname(answers?.riderNickname?.trim() || answers?.favouriteRider?.trim() || 'Rider');
    setFavouriteBike(answers?.favouriteBike?.trim() || '');
    setActivity(answers?.activity ?? 'just_love_bikes');
    setFacePreviewUri(uri);
  }, []);

  const handleSelectAvatar = useCallback(
    async (nextId: string) => {
      if (profileBusy || nextId === avatarId) return;
      setProfileBusy(true);
      try {
        const preset = getAvatarPreset(nextId);
        const updated = await updateOnboardingAnswers({
          avatarId: nextId,
          noFaceFrameId: preset?.hasFaceHole ? nextId : undefined,
        });
        if (!updated) {
          Alert.alert('Profile', 'Complete onboarding first to save your avatar.');
          return;
        }
        setAvatarId(nextId);
        if (!preset?.hasFaceHole) {
          await clearAvatarFacePhoto();
          setFacePreviewUri(null);
        }
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not update avatar');
      } finally {
        setProfileBusy(false);
      }
    },
    [avatarId, profileBusy]
  );

  const handleSaveNickname = useCallback(async () => {
    const trimmed = riderNickname.trim();
    if (!trimmed) {
      Alert.alert('Rider name', 'Enter a name or nickname to show on the home screen.');
      return;
    }
    setProfileBusy(true);
    try {
      const updated = await updateOnboardingAnswers({ riderNickname: trimmed });
      if (!updated) {
        Alert.alert('Profile', 'Complete onboarding first to save your name.');
        return;
      }
      setRiderNickname(trimmed);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save name');
    } finally {
      setProfileBusy(false);
    }
  }, [riderNickname]);

  const handleSaveFavouriteBike = useCallback(async () => {
    const trimmed = favouriteBike.trim() || 'my bike';
    setProfileBusy(true);
    try {
      const updated = await updateOnboardingAnswers({ favouriteBike: trimmed });
      if (!updated) {
        Alert.alert('Profile', 'Complete onboarding first to save your favourite bike.');
        return;
      }
      setFavouriteBike(trimmed);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save favourite bike');
    } finally {
      setProfileBusy(false);
    }
  }, [favouriteBike]);

  const handleSelectActivity = useCallback(
    async (next: RideActivity) => {
      if (profileBusy || next === activity) return;
      setProfileBusy(true);
      try {
        const updated = await updateOnboardingAnswers({ activity: next });
        if (!updated) {
          Alert.alert('Profile', 'Complete onboarding first to save how you ride.');
          return;
        }
        setActivity(next);
        rememberHomeMode(homeModeFromActivity(next));
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not save how you ride');
      } finally {
        setProfileBusy(false);
      }
    },
    [activity, profileBusy]
  );

  const handleRemoveRiderFace = useCallback(() => {
    Alert.alert('Remove rider photo', 'Remove the photo from your leathers avatar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearAvatarFacePhoto();
          setFacePreviewUri(null);
        },
      },
    ]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRiderFace();
      void load();
    }, [loadRiderFace, load])
  );

  const riderPreset = avatarId ? getAvatarPreset(avatarId) : undefined;
  const showRiderPhotoControls = Boolean(riderPreset?.hasFaceHole);

  const persistAlignedFace = useCallback(async (uri: string) => {
    try {
      const saved = await setAvatarFacePhotoUri(uri);
      setFacePreviewUri(saved);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save photo');
      throw e;
    }
  }, []);

  const {
    faceCameraOpen,
    setFaceCameraOpen,
    alignImageUri,
    setAlignImageUri,
    busy: faceBusy,
    pickFromLibrary: pickRiderFaceFromLibrary,
    openCamera: openRiderFaceCamera,
    onCaptured: onRiderFaceCaptured,
    confirmAligned: onRiderFaceAligned,
  } = useAvatarFacePicker({
    onAligned: persistAlignedFace,
    guardBusy: true,
  });

  const handleResetOnboarding = useCallback(() => {
    if (!onboardingReset) return;
    Alert.alert(
      'Reset onboarding',
      'This clears your profile answers and the avatar face photo, then runs the welcome flow again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await onboardingReset.resetOnboarding();
            } catch (e) {
              Alert.alert(
                'Could not reset',
                e instanceof Error ? e.message : 'Something went wrong. Try again.'
              );
            }
          },
        },
      ]
    );
  }, [onboardingReset]);

  const handleExportData = useCallback(async () => {
    try {
      const [
        onboarding,
        setupSheet,
        setupHistory,
        bikeBalance,
        trackPrepSelectedTrack,
        trackdayPrepDraft,
        trackdayPrepHistory,
      ] = await Promise.all([
        getOnboardingAnswers(),
        getBikeSetupDaySheet(),
        getSessionHistory(),
        loadBikeBalanceState(),
        getTrackPrepSelectedTrack(),
        getTrackdayPrepDraft(),
        getTrackdayPrepHistory(),
      ]);
      const json = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          onboarding,
          setupSheet,
          setupSessionHistory: setupHistory,
          bikeBalance,
          trackPrepSelectedTrack,
          trackdayPrepDraft,
          trackdayPrepHistory,
        },
        null,
        2
      );
      await Share.share({ title: 'RoadRacer data export', message: json });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not export your data.');
    }
  }, []);

  const handleDeleteAllData = useCallback(() => {
    if (!onboardingReset) return;
    Alert.alert(
      'Delete all local data?',
      'This permanently removes your profile, photos, Bike Setup Sheet and saved setups, Bike Balance, Gearing Guide, Tyre Wear, Track Walk, and Trackday Prep data from this device, then restarts onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                clearAllBikeSetupData(),
                clearBikeBalanceState(),
                clearGearingGuideState(),
                clearTyreWearAnalysisState(),
                clearTrackWalkSessions(),
                clearTrackdayPrepData(),
                clearAvatarFacePhoto(),
                clearBikePhoto(),
              ]);
              await onboardingReset.resetOnboarding();
            } catch (e) {
              Alert.alert(
                'Could not delete data',
                e instanceof Error ? e.message : 'Something went wrong. Try again.'
              );
            }
          },
        },
      ]
    );
  }, [onboardingReset]);

  const handleTrackArrivalToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        Alert.alert(
          'Location',
          'Permission was denied. Enable location while using the app in your device settings to get track arrival reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setTrackArrivalRemindersState(value);
    await setTrackArrivalEnabled(value);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoRow}>
        <AppLogo size={SCREEN_LOGO_SIZE} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your profile</Text>
        <Text style={styles.sectionSubtitle}>
          Name and avatar shown on the home screen. Changes apply immediately when you return home.
        </Text>
        <Text style={styles.fieldLabel}>Rider name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Alex, #42, Speedy..."
          placeholderTextColor="#64748b"
          value={riderNickname}
          onChangeText={setRiderNickname}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!profileBusy}
          onSubmitEditing={handleSaveNickname}
        />
        <TouchableOpacity
          style={[styles.saveProfileBtn, profileBusy && styles.riderFaceBtnDisabled]}
          onPress={handleSaveNickname}
          disabled={profileBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.saveProfileBtnText}>Save name</Text>
        </TouchableOpacity>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Favourite bike</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Britten V1000"
          placeholderTextColor="#64748b"
          value={favouriteBike}
          onChangeText={setFavouriteBike}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!profileBusy}
          onSubmitEditing={handleSaveFavouriteBike}
        />
        <TouchableOpacity
          style={[styles.saveProfileBtn, profileBusy && styles.riderFaceBtnDisabled]}
          onPress={handleSaveFavouriteBike}
          disabled={profileBusy}
          activeOpacity={0.85}
        >
          <Text style={styles.saveProfileBtnText}>Save favourite bike</Text>
        </TouchableOpacity>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>How you ride</Text>
        <Text style={styles.sectionSubtitle}>
          Home shows setup tools if you race, or coach and track prep if you ride track days.
          Current home: {homeModeFromActivity(activity) === 'setup' ? 'Setup' : 'Learn'}.
        </Text>
        {RIDE_ACTIVITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.activityOption, activity === option.value && styles.activityOptionActive]}
            onPress={() => handleSelectActivity(option.value)}
            disabled={profileBusy}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.activityOptionText,
                activity === option.value && styles.activityOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Avatar</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.avatarScroll}
          contentContainerStyle={styles.avatarScrollContent}
        >
          {AVATAR_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.avatarChoice,
                avatarId === preset.id && styles.avatarChoiceActive,
                profileBusy && styles.riderFaceBtnDisabled,
              ]}
              onPress={() => handleSelectAvatar(preset.id)}
              disabled={profileBusy}
              activeOpacity={0.8}
            >
              <View style={styles.avatarImageWrap}>
                <Image source={preset.source} style={styles.avatarImage} resizeMode="contain" />
              </View>
              <Text
                style={[styles.avatarLabel, avatarId === preset.id && styles.avatarLabelActive]}
                numberOfLines={2}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {avatarId && getAvatarSource(avatarId) ? (
          <View style={styles.profilePreviewRow}>
            <Image
              source={getAvatarSource(avatarId)!}
              style={styles.profilePreviewImage}
              resizeMode="contain"
            />
            <Text style={styles.profilePreviewHint}>
              {getAvatarPreset(avatarId)?.hasFaceHole
                ? 'Add or update your face photo below.'
                : 'This avatar does not use a face photo.'}
            </Text>
          </View>
        ) : null}
      </View>

      {showRiderPhotoControls ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rider photo</Text>
          <Text style={styles.sectionSubtitle}>
            Take a photo or pick from your library, then align your face on the rider so it sits in the hole.
          </Text>
          <View style={styles.riderFaceRow}>
            {facePreviewUri &&
            riderPreset?.hasFaceHole &&
            getAvatarSource(avatarId) &&
            getFaceHoleLayout(avatarId) ? (
              <View style={styles.riderFacePreviewComposite}>
                <AvatarFaceEllipse
                  key={facePreviewUri}
                  badgeSize={72}
                  avatarSource={getAvatarSource(avatarId)!}
                  faceUri={facePreviewUri}
                  layout={getFaceHoleLayout(avatarId)!}
                  faceBehindAvatar={Boolean(riderPreset.compositeFaceBehindAvatar)}
                />
              </View>
            ) : facePreviewUri ? (
              <Image
                key={facePreviewUri}
                source={{ uri: photoDisplayUri(facePreviewUri) }}
                style={styles.riderFacePreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.riderFacePreviewPlaceholder}>
                <Text style={styles.riderFacePreviewPlaceholderText}>No photo</Text>
              </View>
            )}
            <View style={styles.riderFaceButtons}>
              <TouchableOpacity
                style={[styles.riderFaceBtn, faceBusy && styles.riderFaceBtnDisabled]}
                onPress={openRiderFaceCamera}
                disabled={faceBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.riderFaceBtnText}>
                  {facePreviewUri ? 'Retake photo' : 'Take photo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.riderFaceBtnSecondary, faceBusy && styles.riderFaceBtnDisabled]}
                onPress={pickRiderFaceFromLibrary}
                disabled={faceBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.riderFaceBtnSecondaryText}>From library</Text>
              </TouchableOpacity>
              {facePreviewUri ? (
                <TouchableOpacity
                  style={styles.riderFaceRemoveBtn}
                  onPress={handleRemoveRiderFace}
                  disabled={faceBusy}
                  activeOpacity={0.85}
                >
                  <Text style={styles.riderFaceRemoveBtnText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <Text style={styles.sectionSubtitle}>
          When the app is open at a known circuit, greet you once per day and suggest chatting with your
          coach. You can snooze for 48 hours.
        </Text>
        <View style={styles.notifyRow}>
          <Text style={styles.notifyLabel}>Track arrival reminders</Text>
          <Switch
            value={trackArrivalReminders}
            onValueChange={handleTrackArrivalToggle}
            trackColor={{ false: '#334155', true: '#f59e0b' }}
            thumbColor="#f8fafc"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your data & privacy</Text>
        <Text style={styles.sectionSubtitle}>
          Your profile, avatar, Bike Setup Sheet, saved bike setups, Bike Balance data, Trackday
          Prep briefings, and Track Walk notes stay private in local storage on this device or
          browser. They are not stored in an online account. Sharing a setup as text only happens
          when you choose Messages or another app.
        </Text>
        <Text style={styles.sectionSubtitle}>
          AI Coach, Bike Setup, and Q&amp;A messages you send, including attachments, are transmitted
          to the RoadRacer API and may be processed by OpenAI. Chat history is not stored on the
          server after the response.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => void safeOpenUrl(PRIVACY_POLICY_URL, 'privacy policy')}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void safeOpenUrl(TERMS_OF_USE_URL, 'terms of use')}>
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dataActions}>
          <TouchableOpacity style={styles.dataButton} onPress={handleExportData} activeOpacity={0.85}>
            <Text style={styles.dataButtonText}>Export my data</Text>
          </TouchableOpacity>
          {onboardingReset ? (
            <>
              <TouchableOpacity
                style={styles.dataButton}
                onPress={handleResetOnboarding}
                activeOpacity={0.85}
              >
                <Text style={styles.dataButtonText}>Repeat onboarding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dataButton, styles.deleteDataButton]}
                onPress={handleDeleteAllData}
                activeOpacity={0.85}
              >
                <Text style={styles.deleteDataButtonText}>Delete all local data</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>

      {__DEV__ && onboardingReset ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <Text style={styles.sectionSubtitle}>Development tools for testing the welcome flow.</Text>
          <TouchableOpacity style={styles.devResetButton} onPress={handleResetOnboarding} activeOpacity={0.85}>
            <Text style={styles.devResetButtonText}>Reset onboarding</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <AvatarFaceCameraModal
        visible={faceCameraOpen}
        onClose={() => setFaceCameraOpen(false)}
        onCapture={onRiderFaceCaptured}
        avatarSource={getAvatarSource(avatarId)!}
        layout={getFaceHoleLayout(avatarId) ?? DEFAULT_FACE_HOLE_LAYOUT}
      />
      {alignImageUri && riderPreset?.hasFaceHole && getAvatarSource(avatarId) ? (
        <AvatarFaceAlignModal
          visible={Boolean(alignImageUri)}
          imageUri={alignImageUri}
          avatarSource={getAvatarSource(avatarId)!}
          layout={getFaceHoleLayout(avatarId) ?? DEFAULT_FACE_HOLE_LAYOUT}
          faceBehindAvatar={Boolean(riderPreset.compositeFaceBehindAvatar)}
          onConfirm={onRiderFaceAligned}
          onClose={() => setAlignImageUri(null)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  logoRow: {
    marginBottom: 8,
    alignItems: 'center',
  },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#cbd5e1', lineHeight: 19, marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 },
  saveProfileBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  saveProfileBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  activityOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    marginBottom: 8,
  },
  activityOptionActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#422006',
  },
  activityOptionText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
  },
  activityOptionTextActive: {
    color: '#f8fafc',
  },
  avatarScroll: { marginBottom: 12, maxHeight: 180 },
  avatarScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
  },
  avatarChoice: {
    width: 96,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatarChoiceActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#0f172a',
  },
  avatarImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#020617',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  avatarLabelActive: { color: '#facc15' },
  profilePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  profilePreviewImage: { width: 48, height: 48 },
  profilePreviewHint: { flex: 1, fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  riderFaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  riderFacePreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#1e293b',
  },
  riderFacePreviewComposite: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: '#1e293b',
  },
  riderFacePreviewPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderFacePreviewPlaceholderText: { fontSize: 11, color: '#64748b' },
  riderFaceButtons: { flex: 1, gap: 8 },
  riderFaceBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  riderFaceBtnDisabled: { opacity: 0.55 },
  riderFaceBtnText: { color: '#0f172a', fontWeight: '600', fontSize: 15 },
  riderFaceBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  riderFaceBtnSecondaryText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  riderFaceRemoveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  riderFaceRemoveBtnText: { color: '#f87171', fontWeight: '600', fontSize: 14 },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  notifyLabel: { fontSize: 16, color: '#e2e8f0', flex: 1 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 14,
  },
  legalLinkText: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dataActions: { gap: 10 },
  dataButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#64748b',
    backgroundColor: '#1e293b',
  },
  dataButtonText: { color: '#f8fafc', fontWeight: '600', fontSize: 15 },
  deleteDataButton: { borderColor: '#ef4444', backgroundColor: 'rgba(127, 29, 29, 0.25)' },
  deleteDataButtonText: { color: '#fca5a5', fontWeight: '700', fontSize: 15 },
  devResetButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  devResetButtonText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
});
