import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NavigationContainer, type NavigationState } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { HeadlinesScreen } from './src/screens/HeadlinesScreen';
import { HeadlinesSettingsScreen } from './src/screens/HeadlinesSettingsScreen';
import { QAScreen } from './src/screens/QAScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { RiderCoachScreen } from './src/screens/RiderCoachScreen';
import { CoachChatScreen } from './src/screens/CoachChatScreen';
import { ImportTrackNotesScreen } from './src/screens/ImportTrackNotesScreen';
import { BikeSetupBasicsScreen } from './src/screens/BikeSetupBasicsScreen';
import { BikeSetupSheetScreen } from './src/screens/BikeSetupSheetScreen';
import { BikeSetupHubScreen } from './src/screens/BikeSetupHubScreen';
import { BikeBalanceSetupScreen } from './src/screens/BikeBalanceSetupScreen';
import { GearingGuideScreen } from './src/screens/GearingGuideScreen';
import { TyreWearAnalysisScreen } from './src/screens/TyreWearAnalysisScreen';
import { TrackWalkScreen } from './src/screens/TrackWalkScreen';
import { TrackMemoryScreen } from './src/screens/TrackMemoryScreen';
import { TrackMemoryHubScreen } from './src/screens/TrackMemoryHubScreen';
import { TrackPrepHubScreen } from './src/screens/TrackPrepHubScreen';
import { TrackdayPrepScreen } from './src/screens/TrackdayPrepScreen';
import { TrackdayPrepReportScreen } from './src/screens/TrackdayPrepReportScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { getOnboardingDone, resetOnboardingForRetest } from './src/storage/onboarding';
import { OnboardingResetContext } from './src/context/OnboardingResetContext';
import { TrackArrivalProvider } from './src/context/TrackArrivalContext';
import { navigationRef } from './src/navigation/rootNavigation';
import { AppLogo } from './src/components/AppLogo';
import { CountryFlag } from './src/components/CountryFlag';
import { KeyboardSafeView } from './src/components/KeyboardSafeView';
import { CrashErrorBoundary } from './src/diagnostics/CrashErrorBoundary';
import { addNavigationBreadcrumb, getActiveRouteName, initSentry } from './src/diagnostics/sentry';
import { HERO_LOGO_SIZE } from './src/constants/logoSizing';
import { getReleaseCountryCode } from './src/data/homeCountries';
import { getPrimaryManifest, getPrimaryPackId } from './src/packs/loader';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#f8fafc',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
};

/** Vertical padding around the centered RR logo in the home header. */
const HOME_HEADER_LOGO_PAD = 8;
const HOME_HEADER_BAR_HEIGHT = HERO_LOGO_SIZE + HOME_HEADER_LOGO_PAD * 2;

const RELEASE_FLAG = getReleaseCountryCode(
  getPrimaryPackId(),
  getPrimaryManifest()?.isoCountries?.[0]
);

/**
 * Home headline: "RoadRacer" plus release-country flag, RR logo centered at the
 * same size as other screens, Settings on the right. Bar grows to fit the logo.
 */
function HomeHeader({ navigation }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[homeHeaderStyles.wrap, { paddingTop: insets.top }]}>
      <View style={[homeHeaderStyles.bar, { height: HOME_HEADER_BAR_HEIGHT }]}>
        <View style={homeHeaderStyles.logoCenter} pointerEvents="none">
          <AppLogo size={HERO_LOGO_SIZE} />
        </View>
        <View style={homeHeaderStyles.titleRow}>
          <Text style={homeHeaderStyles.title}>RoadRacer</Text>
          <CountryFlag code={RELEASE_FLAG} height={14} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('HeadlinesSettings')}
          style={homeHeaderStyles.settingsBtn}
          hitSlop={8}
        >
          <Text style={homeHeaderStyles.settingsText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const homeHeaderStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0f172a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logoCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  title: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 18,
  },
  settingsBtn: {
    zIndex: 1,
    paddingVertical: 8,
  },
  settingsText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
});

function HeadlinesStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen
          name="Headlines"
          component={HeadlinesScreen}
          options={{
            header: (props) => <HomeHeader {...props} />,
          }}
      />
      <Stack.Screen
        name="HeadlinesSettings"
        component={HeadlinesSettingsScreen}
        options={{ title: 'Profile & settings' }}
      />
    </Stack.Navigator>
  );
}

function RiderCoachStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="RiderCoach"
        component={RiderCoachScreen}
        options={({ navigation }) => ({
          title: 'Rider Coach',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('ImportTrackNotes')}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: '600' }}>Import notes</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="CoachChat"
        component={CoachChatScreen}
        options={({ route }) => ({
          title:
            (route.params as { mode?: string } | undefined)?.mode === 'bikesetup'
              ? 'Bike Setup'
              : 'AI Coach',
        })}
      />
      <Stack.Screen
        name="BikeSetupBasics"
        component={BikeSetupBasicsScreen}
        options={{ title: 'Bike Setup Basics' }}
      />
      <Stack.Screen
        name="TyreWearAnalysis"
        component={TyreWearAnalysisScreen}
        options={{ title: 'Tyre Wear Analysis' }}
      />
      <Stack.Screen
        name="TrackPrep"
        component={TrackPrepHubScreen}
        options={{ title: 'Track Prep' }}
      />
      <Stack.Screen
        name="TrackdayPrep"
        component={TrackdayPrepScreen}
        options={{ title: 'Trackday Prep' }}
      />
      <Stack.Screen
        name="TrackdayPrepReport"
        component={TrackdayPrepReportScreen}
        options={{ title: 'Prep Briefing' }}
      />
      <Stack.Screen
        name="TrackWalk"
        component={TrackWalkScreen}
        options={{ title: 'Track Walk Notes' }}
      />
      <Stack.Screen
        name="TrackMemoryHub"
        component={TrackMemoryHubScreen}
        options={{ title: 'Track Memory' }}
      />
      <Stack.Screen
        name="TrackMemory"
        component={TrackMemoryScreen}
        options={{ title: 'Track Memory', headerShown: false }}
      />
      <Stack.Screen
        name="ImportTrackNotes"
        component={ImportTrackNotesScreen}
        options={{ title: 'Import track notes' }}
      />
    </Stack.Navigator>
  );
}

function BikeSetupStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="BikeSetupHub"
        component={BikeSetupHubScreen}
        options={{ title: 'Bike Setup' }}
      />
      <Stack.Screen
        name="CoachChat"
        component={CoachChatScreen}
        options={{ title: 'Bike Setup' }}
      />
      <Stack.Screen
        name="BikeSetupSheet"
        component={BikeSetupSheetScreen}
        options={{ title: 'Bike Setup Sheet' }}
      />
      <Stack.Screen
        name="BikeBalanceSetup"
        component={BikeBalanceSetupScreen}
        options={{ title: 'Bike Balance Setup' }}
      />
      <Stack.Screen
        name="GearingGuide"
        component={GearingGuideScreen}
        options={{ title: 'Gearing Guide' }}
      />
      <Stack.Screen
        name="TyreWearAnalysis"
        component={TyreWearAnalysisScreen}
        options={{ title: 'Tyre Wear Analysis' }}
      />
      <Stack.Screen
        name="BikeSetupBasics"
        component={BikeSetupBasicsScreen}
        options={{ title: 'Bike Setup Basics' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tab.Screen name="HeadlinesTab" component={HeadlinesStack} options={{ title: 'Home' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: 'Events' }} />
      <Tab.Screen
        name="RiderCoachTab"
        component={RiderCoachStack}
        options={{ title: 'Rider Coach' }}
      />
      <Tab.Screen
        name="BikeSetupTab"
        component={BikeSetupStack}
        options={{ title: 'Bike Setup' }}
      />
      <Tab.Screen name="Q&A" component={QAScreen} options={{ title: 'Q & A' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const isHermes = Boolean(
    (globalThis as typeof globalThis & { HermesInternal?: unknown }).HermesInternal
  );

  const [fontsLoaded] = useFonts({
    RaceSport: require('./assets/fonts/RaceSport.ttf'),
  });

  useEffect(() => {
    getOnboardingDone().then(setOnboardingComplete);
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    const isHermes = Boolean((globalThis as typeof globalThis & { HermesInternal?: unknown }).HermesInternal);
    console.log(`[Runtime] JavaScript engine: ${isHermes ? 'Hermes' : 'non-Hermes'}`);
  }, []);

  useEffect(() => {
    void initSentry();
  }, []);

  const resetOnboarding = useCallback(async () => {
    await resetOnboardingForRetest();
    setOnboardingComplete(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CrashErrorBoundary>
        <SafeAreaProvider>
          <KeyboardSafeView>
          {!fontsLoaded || onboardingComplete === null ? (
            <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
              <StatusBar style="light" />
              <ActivityIndicator size="large" color="#f59e0b" />
            </View>
          ) : !onboardingComplete ? (
            <OnboardingResetContext.Provider value={{ resetOnboarding }}>
              <StatusBar style="light" />
              <OnboardingScreen onComplete={() => setOnboardingComplete(true)} />
            </OnboardingResetContext.Provider>
          ) : (
            <OnboardingResetContext.Provider value={{ resetOnboarding }}>
              <View style={{ flex: 1 }}>
                <NavigationContainer
                  ref={navigationRef}
                  onStateChange={(state: NavigationState | undefined) => {
                    const name = getActiveRouteName(state);
                    if (name) addNavigationBreadcrumb(name);
                  }}
                >
                  <TrackArrivalProvider>
                    <StatusBar style="light" />
                    <MainTabs />
                  </TrackArrivalProvider>
                </NavigationContainer>
                {__DEV__ && isHermes ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: 'rgba(245, 158, 11, 0.92)',
                      borderWidth: 1,
                      borderColor: '#0f172a',
                    }}
                    pointerEvents="none"
                  >
                    <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: '700' }}>Hermes active</Text>
                  </View>
                ) : null}
              </View>
            </OnboardingResetContext.Provider>
          )}
          </KeyboardSafeView>
        </SafeAreaProvider>
      </CrashErrorBoundary>
    </GestureHandlerRootView>
  );
}
