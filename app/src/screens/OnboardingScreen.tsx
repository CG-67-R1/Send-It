import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getRiderFact, getBikeFact, RACING_STATES, getRacingStateInfo } from '../onboardingContent';
import {
  setOnboardingDone,
  setOnboardingAnswers,
  type OnboardingAnswers,
} from '../storage/onboarding';
import { AVATAR_PRESETS, getAvatarPreset } from '../avatar/presets';
import { setAvatarFacePhotoUri, clearAvatarFacePhoto } from '../storage/avatarFacePhoto';
import { AvatarFaceCameraModal } from '../components/AvatarFaceCameraModal';

type Activity = 'race' | 'track_days' | 'just_love_bikes' | 'race_one_day';

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'race', label: 'I race 🏁' },
  { value: 'track_days', label: 'Track days only 🛞' },
  { value: 'just_love_bikes', label: 'Just love bikes 🏍️' },
  { value: 'race_one_day', label: 'Want to have a go at racing one day!' },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [favouriteBike, setFavouriteBike] = useState('');
  const [favouriteRider, setFavouriteRider] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [wantsRacingInfo, setWantsRacingInfo] = useState<boolean | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [wantsRacingEmailInfo, setWantsRacingEmailInfo] = useState<boolean | null>(null);
  const [racingEmail, setRacingEmail] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);
  /** Local URI from ImagePicker until onboarding completes (then copied to app documents). */
  const [avatarFaceUri, setAvatarFaceUri] = useState<string | null>(null);
  const [riderNickname, setRiderNickname] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);

  const totalSteps = 7; // welcome, bike, rider, activity, future racer info, nickname+avatar, summary

  const selectedAvatarPreset = avatarId ? getAvatarPreset(avatarId) : undefined;

  useEffect(() => {
    if (!selectedAvatarPreset?.hasFaceHole) {
      setAvatarFaceUri(null);
    }
  }, [avatarId, selectedAvatarPreset?.hasFaceHole]);

  const pickAvatarFaceFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photos', 'Allow access to choose a photo for your rider avatar.', [
          { text: 'OK' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarFaceUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not pick image');
    }
  }, []);

  /** Web / fallback: system camera with square crop. Native uses AvatarFaceCameraModal (oval guide). */
  const takeAvatarFaceWithSystemCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera', 'Allow camera access to take your rider photo.', [
          { text: 'OK' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarFaceUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not take photo');
    }
  }, []);

  const openAvatarFaceCamera = useCallback(() => {
    if (Platform.OS === 'web') {
      void takeAvatarFaceWithSystemCamera();
    } else {
      setFaceCameraOpen(true);
    }
  }, [takeAvatarFaceWithSystemCamera]);

  const handleFinish = async () => {
    const preset = getAvatarPreset(avatarId);
    const answers: OnboardingAnswers = {
      favouriteBike: favouriteBike.trim() || 'my bike',
      favouriteRider: favouriteRider.trim() || 'my hero',
      activity: activity ?? 'just_love_bikes',
      knowsJustSendIt: false,
      riderNickname: riderNickname.trim() || 'Rider',
      futureRacer: activity === 'race_one_day' || undefined,
      racingStateCode: selectedStateCode ?? undefined,
      racingInfoEmail: racingEmail.trim() || undefined,
      avatarId: avatarId ?? undefined,
      noFaceFrameId: preset?.hasFaceHole && avatarId ? avatarId : undefined,
    };
    if (preset?.hasFaceHole && avatarFaceUri) {
      await setAvatarFacePhotoUri(avatarFaceUri);
    } else {
      await clearAvatarFacePhoto();
    }
    await setOnboardingAnswers(answers);
    await setOnboardingDone();
    onComplete();
  };

  const canNext = () => {
    if (step === 1) return favouriteBike.trim().length > 0;
    if (step === 2) return favouriteRider.trim().length > 0;
    if (step === 3) return activity !== null;
    if (step === 4) {
      // Future racer info step
      if (activity !== 'race_one_day') return true;
      if (wantsRacingInfo === null) return false;
      if (!wantsRacingInfo) return true;
      if (!selectedStateCode) return false;
      if (wantsRacingEmailInfo === null) return false;
      if (wantsRacingEmailInfo === true) {
        return racingEmail.trim().length > 3 && racingEmail.includes('@');
      }
      return true;
    }
    return true;
  };

  const isLastStep = step === totalSteps - 1;

  const handleNext = async () => {
    if (finishing) return;
    if (step === 4 && activity === 'race_one_day' && wantsRacingInfo && wantsRacingEmailInfo) {
      const stateInfo = selectedStateCode ? getRacingStateInfo(selectedStateCode) : undefined;
      const subject = encodeURIComponent('RoadRace – Future racer enquiry');
      const bodyLines = [
        'A RoadRace user wants to learn how to go racing.',
        '',
        `Favourite bike: ${favouriteBike || 'N/A'}`,
        `Favourite rider: ${favouriteRider || 'N/A'}`,
        `Riding activity: wants to race one day`,
        `State: ${stateInfo ? stateInfo.name : selectedStateCode || 'N/A'}`,
        `Contact email: ${racingEmail || 'N/A'}`,
      ];
      const body = encodeURIComponent(bodyLines.join('\n'));
      const mailtoUrl = `mailto:projectapex@outlook.com.au?subject=${subject}&body=${body}`;
      try {
        const supported = await Linking.canOpenURL(mailtoUrl);
        if (supported) {
          await Linking.openURL(mailtoUrl);
        }
      } catch {
        // Fail silently if email app cannot be opened.
      }
    }

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    setFinishing(true);
    try {
      await handleFinish();
    } catch (e) {
      Alert.alert(
        'Could not finish setup',
        e instanceof Error ? e.message : 'Something went wrong saving your profile. Please try again.'
      );
    } finally {
      setFinishing(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <>
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

        {/* Step 4: Future racer flow (optional) */}
        {step === 4 && (
          <View style={styles.step}>
            {activity === 'race_one_day' && (
              <>
                <Text style={styles.title}>Thinking about racing one day?</Text>
                <Text style={styles.subtitle}>
                  Would you like to learn how easy it is to get racing in your state and the most
                  affordable classes?
                </Text>
                <View style={styles.yesNoRow}>
                  <TouchableOpacity
                    style={[
                      styles.yesNoButton,
                      wantsRacingInfo === true && styles.yesNoButtonActive,
                    ]}
                    onPress={() => setWantsRacingInfo(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.yesNoLabel,
                        wantsRacingInfo === true && styles.optionLabelActive,
                      ]}
                    >
                      Yes, show me
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.yesNoButton,
                      wantsRacingInfo === false && styles.yesNoButtonActive,
                    ]}
                    onPress={() => setWantsRacingInfo(false)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.yesNoLabel,
                        wantsRacingInfo === false && styles.optionLabelActive,
                      ]}
                    >
                      Not right now
                    </Text>
                  </TouchableOpacity>
                </View>

                {wantsRacingInfo && (
                  <>
                    <Text style={styles.subtitle}>Pick which state you live in:</Text>
                    <View style={styles.stateList}>
                      {RACING_STATES.map((state) => (
                        <TouchableOpacity
                          key={state.code}
                          style={[
                            styles.optionButton,
                            selectedStateCode === state.code && styles.optionButtonActive,
                          ]}
                          onPress={() => setSelectedStateCode(state.code)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              selectedStateCode === state.code && styles.optionLabelActive,
                            ]}
                          >
                            {state.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {selectedStateCode && (
                      <>
                        {(() => {
                          const info = getRacingStateInfo(selectedStateCode);
                          if (!info) return null;
                          return (
                            <View style={styles.justSendItBox}>
                              <Text style={styles.justSendItTitle}>
                                Getting racing in {info.name}
                              </Text>
                              <Text style={styles.justSendItText}>
                                Here are some of the road race clubs, classes and coaches to get you
                                started.
                              </Text>
                              <Text style={[styles.justSendItText, { marginTop: 8 }]}>
                                Clubs:
                              </Text>
                              {info.clubs.map((club) => (
                                <Text key={club.name} style={styles.justSendItText}>
                                  • {club.name} – {club.location}
                                  {club.website ? ` – ${club.website}` : ''}
                                  {club.email ? ` – ${club.email}` : ''}
                                </Text>
                              ))}
                              <Text style={[styles.justSendItText, { marginTop: 8 }]}>
                                Common competition classes:
                              </Text>
                              {info.classes.map((cls) => (
                                <Text key={cls} style={styles.justSendItText}>
                                  • {cls}
                                </Text>
                              ))}
                              <Text style={[styles.justSendItText, { marginTop: 8 }]}>
                                Recommended local coaches:
                              </Text>
                              {info.coaches.map((coach) => (
                                <Text key={coach.name} style={styles.justSendItText}>
                                  • {coach.name} – {coach.description}
                                  {coach.website ? ` – ${coach.website}` : ''}
                                  {coach.email ? ` – ${coach.email}` : ''}
                                </Text>
                              ))}
                            </View>
                          );
                        })()}

                        <Text style={[styles.subtitle, { marginTop: 16 }]}>
                          Would you like to receive more information from RoadRace?
                        </Text>
                        <View style={styles.yesNoRow}>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButton,
                              wantsRacingEmailInfo === true && styles.yesNoButtonActive,
                            ]}
                            onPress={() => setWantsRacingEmailInfo(true)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.yesNoLabel,
                                wantsRacingEmailInfo === true && styles.optionLabelActive,
                              ]}
                            >
                              Yes, email me
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.yesNoButton,
                              wantsRacingEmailInfo === false && styles.yesNoButtonActive,
                            ]}
                            onPress={() => setWantsRacingEmailInfo(false)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.yesNoLabel,
                                wantsRacingEmailInfo === false && styles.optionLabelActive,
                              ]}
                            >
                              No thanks
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {wantsRacingEmailInfo && (
                          <>
                            <Text style={styles.subtitle}>
                              Drop your email and we’ll send you a simple “how to start racing”
                              guide for your state.
                            </Text>
                            <TextInput
                              style={styles.input}
                              placeholder="you@example.com"
                              placeholderTextColor="#64748b"
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              value={racingEmail}
                              onChangeText={setRacingEmail}
                            />
                            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                              We’ll email your answers to the RoadRace team at
                              {' '}
                              projectapex@outlook.com.au so they can get in touch.
                            </Text>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {!activity || activity !== 'race_one_day' ? (
              <Text style={styles.subtitle}>
                You’re all set here — hit Next to keep going.
              </Text>
            ) : null}
          </View>
        )}

        {/* Step 5: Pick avatar + nickname */}
        {step === 5 && (
          <View style={styles.step}>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>
              Pick an avatar for your home screen (swipe sideways for more). For leathers with a
              blank face, you can add your photo below.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.avatarScroll}
              contentContainerStyle={styles.avatarScrollContent}
              nestedScrollEnabled
            >
              {AVATAR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.avatarChoice,
                    avatarId === preset.id && styles.avatarChoiceActive,
                  ]}
                  onPress={() => setAvatarId(preset.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarImageWrap}>
                    <Image source={preset.source} style={styles.avatarImage} resizeMode="contain" />
                  </View>
                  <Text
                    style={[
                      styles.avatarLabel,
                      avatarId === preset.id && styles.avatarLabelActive,
                    ]}
                    numberOfLines={2}
                  >
                    {preset.label}
                  </Text>
                  {preset.hasFaceHole ? (
                    <Text style={styles.avatarFaceHoleHint} numberOfLines={1}>
                      Face slot
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedAvatarPreset?.hasFaceHole ? (
              <View style={styles.faceUploadSection}>
                <Text style={styles.faceUploadTitle}>Your face (optional)</Text>
                <Text style={styles.faceUploadHint}>
                  Take a selfie with an oval guide (matches the hole on your rider), or pick a square-cropped
                  photo from your library.
                </Text>
                <View style={styles.faceUploadRow}>
                  <TouchableOpacity style={styles.faceUploadButton} onPress={openAvatarFaceCamera} activeOpacity={0.85}>
                    <Text style={styles.faceUploadButtonText}>
                      {avatarFaceUri ? 'Retake photo' : 'Take photo'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.faceLibraryButton}
                    onPress={pickAvatarFaceFromLibrary}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.faceLibraryButtonText}>
                      {avatarFaceUri ? 'Library' : 'From library'}
                    </Text>
                  </TouchableOpacity>
                  {avatarFaceUri ? (
                    <TouchableOpacity
                      style={styles.faceRemoveButton}
                      onPress={() => setAvatarFaceUri(null)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.faceRemoveButtonText}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {avatarFaceUri ? (
                  <View style={styles.facePreviewBadge}>
                    <Image source={{ uri: avatarFaceUri }} style={styles.facePreviewImage} resizeMode="cover" />
                  </View>
                ) : null}
              </View>
            ) : null}
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
            style={[
              styles.nextButton,
              (finishing || (!isLastStep && !canNext())) && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={finishing || (!isLastStep && !canNext())}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonLabel}>
              {finishing ? 'Saving…' : isLastStep ? "Let's go" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    <AvatarFaceCameraModal
      visible={faceCameraOpen}
      onClose={() => setFaceCameraOpen(false)}
      onCapture={(uri) => setAvatarFaceUri(uri)}
    />
    </>
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
  stateList: {
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
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
  avatarScroll: {
    marginBottom: 20,
    maxHeight: 200,
  },
  avatarScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
    paddingRight: 8,
  },
  avatarChoice: {
    width: 104,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  avatarChoiceActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#0f172a',
  },
  avatarImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#020617',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  avatarLabelActive: {
    color: '#facc15',
  },
  avatarFaceHoleHint: {
    marginTop: 4,
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  faceUploadSection: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  faceUploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 6,
  },
  faceUploadHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 20,
  },
  faceUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  faceUploadButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  faceUploadButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  faceLibraryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
  },
  faceLibraryButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 15,
  },
  faceRemoveButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  faceRemoveButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  facePreviewBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  facePreviewImage: {
    width: '100%',
    height: '100%',
  },
});
