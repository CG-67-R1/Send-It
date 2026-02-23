import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeadlinesScreen } from './src/screens/HeadlinesScreen';
import { HeadlinesSettingsScreen } from './src/screens/HeadlinesSettingsScreen';
import { QAScreen } from './src/screens/QAScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { RiderCoachScreen } from './src/screens/RiderCoachScreen';
import { ImportTrackNotesScreen } from './src/screens/ImportTrackNotesScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { getOnboardingDone } from './src/storage/onboarding';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#f8fafc',
  headerTitleStyle: { fontWeight: '700', fontSize: 18 },
};

function HeadlinesStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="Headlines"
        component={HeadlinesScreen}
        options={({ navigation }) => ({
          title: 'Send It',
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
        name="HeadlinesSettings"
        component={HeadlinesSettingsScreen}
        options={{ title: 'Headlines settings' }}
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
          title: 'Rider Coach & Tech',
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
      <Tab.Screen name="CalendarTab" component={CalendarScreen} options={{ title: "What's On" }} />
      <Tab.Screen name="Q&A" component={QAScreen} options={{ title: 'Q & A' }} />
      <Tab.Screen
        name="RiderCoachTab"
        component={RiderCoachStack}
        options={{ title: 'Rider Coach' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboardingDone().then(setOnboardingComplete);
  }, []);

  if (onboardingComplete === null) {
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
