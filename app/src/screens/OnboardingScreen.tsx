import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getRiderFact, getBikeFact } from '../onboardingContent';
import {
  setOnboardingDone,
  setOnboardingAnswers,
  type OnboardingAnswers,
} from '../storage/onboarding';
import { setAvatarPhotoUri } from '../storage/avatarPhoto';

type Activity = 'race' | 'track_days' | 'just_love_bikes';

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'race', label: "I race 🏁" },
  { value: 'track_days', label: 'Track days only 🛞' },
  { value: 'just_love_bikes', label: "Just love bikes 🏍️" },
];

const AVATAR_IDS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-7', 'avatar-8', 'avatar-9', 'avatar-10', 'avatar-11', 'avatar-12'] as const;
const AVATAR_SOURCES: Record<string, number> = {
  'avatar-1': require('../../assets/avatars/avatar-1.png'),
  'avatar-2': require('../../assets/avatars/avatar-2.png'),
  'avatar-3': require('../../assets/avatars/avatar-3.png'),
  'avatar-4': require('../../assets/avatars/avatar-4.png'),
  'avatar-5': require('../../assets/avatars/avatar-5.png'),
  'avatar-6': require('../../assets/avatars/avatar-6.png'),
  'avatar-7': require('../../assets/avatars/avatar-7.png'),
  'avatar-8': require('../../assets/avatars/avatar-8.png'),
  'avatar-9': require('../../assets/avatars/avatar-9.png'),
  'avatar-10': require('../../assets/avatars/avatar-10.png'),
  'avatar-11': require('../../assets/avatars/avatar-11.png'),
  'avatar-12': require('../../assets/avatars/avatar-12.png'),
};
const CUSTOM_AVATAR_ID = 'custom';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [favouriteBike, setFavouriteBike] = useState('');
  const [favouriteRider, setFavouriteRider] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [riderNickname, setRiderNickname] = useState('');

  const totalSteps = 7; // welcome, bike, rider, activity, avatar, nickname, summary

  const handleFinish = async () => {
    const answers: OnboardingAnswers = {
      favouriteBike: favouriteBike.trim() || 'my bike',
      favouriteRider: favouriteRider.trim() || 'my hero',
      activity: activity ?? 'just_love_bikes',
      avatarId: avatarId ?? 'avatar-1',
      riderNickname: riderNickname.trim() || 'Rider',
    };
    await setOnboardingAnswers(answers);
    await setOnboardingDone();
    onComplete();
  };

  const pickCustomAvatar = async () => {
    if (pickingAvatar) return;
    setPickingAvatar(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo access',
          'Allow photo access to use your own photo as your avatar.',
          [{ text: 'OK' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = await setAvatarPhotoUri(result.assets[0].uri);
        setCustomAvatarUri(uri);
        setAvatarId(CUSTOM_AVATAR_ID);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not pick image';
      Alert.alert('Error', msg);
    } finally {
      setPickingAvatar(false);
    }
  };

  const canNext = () => {
    if (step === 1) return favouriteBike.trim().length > 0;
    if (step === 2) return favouriteRider.trim().length > 0;
    if (step === 3) return activity !== null;
    if (step === 4) return avatarId !== null;
    return true;
  };

  const isLastStep = step === totalSteps - 1;

  const handleNext = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i <= step && styles.progressDotActive]}
            />
          ))}
        </View>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <View style={styles.step}>
            <Text style={styles.title}>Welcome to RoadRacer</Text>
            <Text style={styles.subtitle}>
              Before we get you to the good stuff — headlines, calendar, rider coach — we need to know who you are. (Don’t worry, it’s quick.)
            </Text>
            <Text style={styles.prompt}>Let’s go 👇</Text>
          </View>
        )}

        {/* Step 1: Favourite bike */}
        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.title}>What’s your favourite bike?</Text>
            <Text style={styles.subtitle}>Make, model, or “the one I’ll own one day” — we’re not judging.</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ducati Panigale V4, Yamaha R1..."
              placeholderTextColor="#64748b"
              value={favouriteBike}
              onChangeText={setFavouriteBike}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Step 2: Favourite rider */}
        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.title}>Who’s your favourite rider?</Text>
            <Text style={styles.subtitle}>MotoGP, WSBK, local legend — anyone who makes you want to twist the throttle.</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Valentino Rossi, Marc Márquez..."
              placeholderTextColor="#64748b"
              value={favouriteRider}
              onChangeText={setFavouriteRider}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Step 3: Race / track days / just love bikes */}
        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.title}>How do you ride?</Text>
            <Text style={styles.subtitle}>We’re here for all of it.</Text>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionButton, activity === opt.value && styles.optionButtonActive]}
                onPress={() => setActivity(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionLabel, activity === opt.value && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 4: Pick avatar */}
        {step === 4 && (
          <View style={styles.step}>
            <Text style={styles.title}>Pick your avatar</Text>
            <Text style={styles.subtitle}>Choose one of the options below or upload your own photo. It'll show next to your name on the home screen.</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_IDS.map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.avatarCell, avatarId === id && styles.avatarCellActive]}
                  onPress={() => setAvatarId(id)}
                  activeOpacity={0.8}
                >
                  <Image source={AVATAR_SOURCES[id]} style={styles.avatarImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.optionButton, avatarId === CUSTOM_AVATAR_ID && styles.optionButtonActive]}
              onPress={pickCustomAvatar}
              disabled={pickingAvatar}
              activeOpacity={0.8}
            >
              {pickingAvatar ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : customAvatarUri ? (
                <View style={styles.customAvatarPreview}>
                  <Image source={{ uri: customAvatarUri }} style={styles.customAvatarImage} resizeMode="cover" />
                  <Text style={[styles.optionLabel, styles.optionLabelActive]}>Your photo (tap to change)</Text>
                </View>
              ) : (
                <Text style={[styles.optionLabel, avatarId === CUSTOM_AVATAR_ID && styles.optionLabelActive]}>
                  Upload my photo
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 5: Name / race number / nickname */}
        {step === 5 && (
          <View style={styles.step}>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>
              Your name, race number or a nickname — it’ll show on your home screen.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex, #42, Speedy..."
              placeholderTextColor="#64748b"
              value={riderNickname}
              onChangeText={setRiderNickname}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        )}

        {/* Step 6: Summary */}
        {step === 6 && (
          <View style={styles.step}>
            <Text style={styles.title}>You’re in the right place</Text>
            <Text style={styles.summaryText}>{getRiderFact(favouriteRider.trim())}</Text>
            <Text style={styles.summaryText}>{getBikeFact(favouriteBike.trim())}</Text>
            <Text style={styles.summaryClosing}>
              Whether you race, do track days, or just love bikes — RoadRacer is here for headlines, what’s on, Q&A, and rider coach. Time to send it. 🏁
            </Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backButtonLabel}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, !canNext() && !isLastStep && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!isLastStep && !canNext()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonLabel}>
              {isLastStep ? "Let's go" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  progressDotActive: {
    backgroundColor: '#f59e0b',
    width: 24,
  },
  step: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
    marginBottom: 20,
  },
  prompt: {
    fontSize: 18,
    color: '#f59e0b',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionButtonActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#1e293b',
  },
  optionLabel: {
    fontSize: 17,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  optionLabelActive: {
    color: '#f59e0b',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  avatarCell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  avatarCellActive: {
    borderColor: '#f59e0b',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  customAvatarPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  yesNoButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  yesNoButtonActive: {
    borderColor: '#f59e0b',
  },
  yesNoLabel: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  justSendItBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  justSendItTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  justSendItText: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
  },
  summaryText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
    marginBottom: 16,
  },
  summaryClosing: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  backButtonLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonLabel: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
  },
});
