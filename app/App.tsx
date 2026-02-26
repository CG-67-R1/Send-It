import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Sentry from 'sentry-expo';
import { HeadlinesScreen } from './src/screens/HeadlinesScreen';
import { HeadlinesListScreen } from './src/screens/HeadlinesListScreen';
import { HeadlinesSettingsScreen } from './src/screens/HeadlinesSettingsScreen';
import { ChangeAvatarScreen } from './src/screens/ChangeAvatarScreen';
import { QAScreen } from './src/screens/QAScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { RiderCoachScreen } from './src/screens/RiderCoachScreen';
import { ImportTrackNotesScreen } from './src/screens/ImportTrackNotesScreen';
import { TrackWalkScreen } from './src/screens/TrackWalkScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { getOnboardingDone } from './src/storage/onboarding';
import { AppLogo } from './src/components/AppLogo';

// Only init Sentry when not in dev to avoid "[RUNTIME NOT READY]" on device (native bridge not ready yet)
if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? undefined,
    enableInExpoDevelopment: false,
    debug: false,
  });
}

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
            headerTitle: () => <AppLogo size={80} />,
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
        options={{ title: 'News settings' }}
      />
      <Stack.Screen
        name="ChangeAvatar"
        component={ChangeAvatarScreen}
        options={{ title: 'Change avatar' }}
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

  const [fontsLoaded] = useFonts({
    'Race Sport': require('./assets/fonts/RaceSport.ttf'),
  });

  useEffect(() => {
    getOnboardingDone().then(setOnboardingComplete);
  }, []);

  if (!fontsLoaded || onboardingComplete === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (!onboardingComplete) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={() => setOnboardingComplete(true)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <MainTabs />
    </NavigationContainer>
  );
}
