import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeadlinesScreen } from './src/screens/HeadlinesScreen';
import { HeadlinesListScreen } from './src/screens/HeadlinesListScreen';
import { HeadlinesSettingsScreen } from './src/screens/HeadlinesSettingsScreen';
import { QAScreen } from './src/screens/QAScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { RiderCoachScreen } from './src/screens/RiderCoachScreen';
import { ImportTrackNotesScreen } from './src/screens/ImportTrackNotesScreen';
import { TrackWalkScreen } from './src/screens/TrackWalkScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { getOnboardingDone, resetOnboardingForRetest } from './src/storage/onboarding';
import { OnboardingResetContext } from './src/context/OnboardingResetContext';
import { TrackArrivalProvider } from './src/context/TrackArrivalContext';
import { navigationRef } from './src/navigation/rootNavigation';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#f8fafc',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
};

function HeadlinesStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen
          name="Headlines"
          component={HeadlinesScreen}
          options={({ navigation }) => ({
            title: 'RoadRacer',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('HeadlinesSettings')}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: '600' }}>Settings</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="HeadlinesList"
        component={HeadlinesListScreen}
        options={{ title: 'Bike News' }}
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
          title: 'Coach & Bike Setup',
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
        name="ImportTrackNotes"
        component={ImportTrackNotesScreen}
        options={{ title: 'Import track notes' }}
      />
    </Stack.Navigator>
  );
}

function TrackWalkStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="TrackWalk"
        component={TrackWalkScreen}
        options={{ title: 'Track Walk' }}
      />
      <Stack.Screen
        name="ImportTrackNotes"
        component={ImportTrackNotesScreen}
        options={{ title: 'Import track notes' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen name="HeadlinesTab" component={HeadlinesStack} options={{ title: 'Headlines' }} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: 'Events' }} />
      <Tab.Screen name="Q&A" component={QAScreen} options={{ title: 'Q & A' }} />
      <Tab.Screen
        name="TrackWalkTab"
        component={TrackWalkStack}
        options={{ title: 'Track Walk' }}
      />
      <Tab.Screen
        name="RiderCoachTab"
        component={RiderCoachStack}
        options={{ title: 'Coach & Bike Setup' }}
      />
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

  // Load Sentry after the native runtime is ready. Eager `import 'sentry-expo'` can throw
  // (e.g. tslib `__extends` / Hermes) during the initial module graph before RN is initialized.
  useEffect(() => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) return;
    let cancelled = false;
    void import('sentry-expo')
      .then((Sentry) => {
        if (cancelled) return;
        Sentry.init({
          dsn,
          enableInExpoDevelopment: true,
          debug: __DEV__,
        });
      })
      .catch((e) => {
        if (__DEV__) console.warn('[Sentry] init skipped:', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetOnboarding = useCallback(async () => {
    await resetOnboardingForRetest();
    setOnboardingComplete(false);
  }, []);

  return (
    <SafeAreaProvider>
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
            <NavigationContainer ref={navigationRef}>
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
    </SafeAreaProvider>
  );
}
