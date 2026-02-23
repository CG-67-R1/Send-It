import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getRiderFact, getBikeFact } from '../onboardingContent';
import {
  setOnboardingDone,
  setOnboardingAnswers,
  type OnboardingAnswers,
} from '../storage/onboarding';

type Activity = 'race' | 'track_days' | 'just_love_bikes';

const ACTIVITY_OPTIONS: { value: Activity; label: string }[] = [
  { value: 'race', label: "I race 🏁" },
  { value: 'track_days', label: 'Track days only 🛞' },
  { value: 'just_love_bikes', label: "Just love bikes 🏍️" },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [favouriteBike, setFavouriteBike] = useState('');
  const [favouriteRider, setFavouriteRider] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [knowsJustSendIt, setKnowsJustSendIt] = useState<boolean | null>(null);

  const totalSteps = 6; // welcome, bike, rider, activity, just send it, summary

  const handleFinish = async () => {
    const answers: OnboardingAnswers = {
      favouriteBike: favouriteBike.trim() || 'my bike',
      favouriteRider: favouriteRider.trim() || 'my hero',
      activity: activity ?? 'just_love_bikes',
      knowsJustSendIt: knowsJustSendIt ?? false,
    };
    await setOnboardingAnswers(answers);
    await setOnboardingDone();
    onComplete();
  };

  const canNext = () => {
    if (step === 1) return favouriteBike.trim().length > 0;
    if (step === 2) return favouriteRider.trim().length > 0;
    if (step === 3) return activity !== null;
    if (step === 4) return knowsJustSendIt !== null;
    return true;
  };

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
            <Text style={styles.title}>Welcome to Send It</Text>
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

        {/* Step 4: Just Send it! */}
        {step === 4 && (
          <View style={styles.step}>
            <Text style={styles.title}>Do you know what “Just Send it!” means?</Text>
            <Text style={styles.subtitle}>Be honest. There are no wrong answers here.</Text>
            <View style={styles.yesNoRow}>
              <TouchableOpacity
                style={[styles.yesNoButton, knowsJustSendIt === true && styles.yesNoButtonActive]}
                onPress={() => setKnowsJustSendIt(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.yesNoLabel, knowsJustSendIt === true && styles.optionLabelActive]}>
                  Yeah, I know
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.yesNoButton, knowsJustSendIt === false && styles.yesNoButtonActive]}
                onPress={() => setKnowsJustSendIt(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.yesNoLabel, knowsJustSendIt === false && styles.optionLabelActive]}>
                  No idea
                </Text>
              </TouchableOpacity>
            </View>
            {knowsJustSendIt !== null && (
              <View style={styles.justSendItBox}>
                <Text style={styles.justSendItTitle}>“Just Send it!”</Text>
                <Text style={styles.justSendItText}>
                  {knowsJustSendIt
                    ? "You already get it — commit, don’t overthink it, and trust the bike. We like you."
                    : "It’s what you say right before you stop overthinking and open the throttle. It means: commit, go for it, and leave the doubt in the pits. Consider yourself initiated. 🏍️"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <View style={styles.step}>
            <Text style={styles.title}>You’re in the right place</Text>
            <Text style={styles.summaryText}>{getRiderFact(favouriteRider.trim())}</Text>
            <Text style={styles.summaryText}>{getBikeFact(favouriteBike.trim())}</Text>
            <Text style={styles.summaryClosing}>
              Whether you race, do track days, or just love bikes — Send It is here for headlines, what’s on, Q&A, and rider coach. Time to send it. 🏁
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
            style={[styles.nextButton, !canNext() && step < 5 && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={step < 5 && !canNext()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonLabel}>
              {step === totalSteps - 1 ? "Let's go" : 'Next'}
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
