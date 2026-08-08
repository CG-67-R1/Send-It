import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_PRIORITY,
  getCustomSources,
  getPriorityOrder,
  mergePriorityOrder,
  setPriorityOrder,
  getNotifyPriority1,
  setNotifyPriority1,
  addCustomSource,
  removeCustomSource,
  resetHeadlinesSettings,
} from '../storage/headlinesSettings';
import { requestNotificationPermissions } from '../notifications/priority1Notifications';
import {
  isTrackArrivalEnabled,
  requestForegroundLocationPermission,
  setTrackArrivalEnabled,
} from '../location/trackGeofence';
import {
  apiFetch,
  PRIVACY_POLICY_URL,
  SOURCES_URL,
  TERMS_OF_USE_URL,
} from '../../constants/api';
import { safeOpenUrl } from '../utils/safeOpenUrl';
import type { CustomSource, PriorityOrder, Source } from '../types';
import { AppLogo } from '../components/AppLogo';
import { SCREEN_LOGO_SIZE } from '../constants/logoSizing';
import { AvatarFaceAlignModal } from '../components/AvatarFaceAlignModal';
import { AvatarFaceCameraModal } from '../components/AvatarFaceCameraModal';
import { AvatarFaceEllipse } from '../components/AvatarFaceEllipse';
import { AVATAR_PRESETS, DEFAULT_FACE_HOLE_LAYOUT, getAvatarPreset, getAvatarSource, getFaceHoleLayout } from '../avatar/presets';
import { getOnboardingAnswers, updateOnboardingAnswers } from '../storage/onboarding';
import {
  clearAvatarFacePhoto,
  getAvatarFacePhotoUri,
  setAvatarFacePhotoUri,
} from '../storage/avatarFacePhoto';
import { photoDisplayUri } from '../storage/localPhotoStorage';
import { useOnboardingReset } from '../context/OnboardingResetContext';
import {
  getBikeSetupDaySheet,
  getSessionHistory,
  clearAllBikeSetupData,
} from '../storage/bikeSetupSheet';
import { clearBikeBalanceState, loadBikeBalanceState } from '../storage/bikeBalance';
import { clearTrackWalkSessions } from '../storage/trackWalk';
import { clearBikePhoto } from '../storage/bikePhoto';

export function HeadlinesSettingsScreen() {
  const onboardingReset = useOnboardingReset();
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [riderNickname, setRiderNickname] = useState('');
  const [favouriteBike, setFavouriteBike] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [facePreviewUri, setFacePreviewUri] = useState<string | null>(null);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [alignImageUri, setAlignImageUri] = useState<string | null>(null);
  const [builtinSources, setBuiltinSources] = useState<Source[]>([]);
  const [customSources, setCustomSourcesState] = useState<CustomSource[]>([]);
  const [priority, setPriorityState] = useState<PriorityOrder>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [notifyPriority1, setNotifyPriority1State] = useState(false);
  const [trackArrivalReminders, setTrackArrivalRemindersState] = useState(false);

  const allSources: Source[] = [
    ...builtinSources,
    ...customSources.map((s) => ({ id: s.id, name: s.name })),
  ];
  const visiblePriority = useMemo(() => {
    const query = sourceSearch.trim().toLocaleLowerCase();
    return priority
      .map((sourceId, index) => ({
        sourceId,
        index,
        source: allSources.find((source) => source.id === sourceId),
      }))
      .filter(({ sourceId, source }) =>
        query ? (source?.name ?? sourceId).toLocaleLowerCase().includes(query) : true
      );
  }, [priority, allSources, sourceSearch]);

  const load = useCallback(async () => {
    const [order, custom, notify, trackArrival] = await Promise.all([
      getPriorityOrder(),
      getCustomSources(),
      getNotifyPriority1(),
      isTrackArrivalEnabled(),
    ]);
    setCustomSourcesState(custom);
    setNotifyPriority1State(notify);
    setTrackArrivalRemindersState(trackArrival);

    let builtin: Source[] = [];
    try {
      const res = await apiFetch(SOURCES_URL, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sources)) builtin = data.sources;
      }
    } catch {
      builtin = [];
    }
    if (builtin.length === 0) {
      builtin = DEFAULT_PRIORITY.map((id) => ({
        id,
        name: id.replace(/_/g, ' '),
      }));
    }
    setBuiltinSources(builtin);

    const builtinIds = builtin.map((s) => s.id);
    const customIds = custom.map((s) => s.id);
    const merged = mergePriorityOrder(order, builtinIds, customIds);
    setPriorityState(merged);
    if (merged.length > 0 && merged.join(',') !== order.join(',')) {
      await setPriorityOrder(merged);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadRiderFace = useCallback(async () => {
    const [answers, uri] = await Promise.all([getOnboardingAnswers(), getAvatarFacePhotoUri()]);
    setAvatarId(answers?.avatarId ?? null);
    setRiderNickname(answers?.riderNickname?.trim() || answers?.favouriteRider?.trim() || 'Rider');
    setFavouriteBike(answers?.favouriteBike?.trim() || '');
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

  const pickRiderFaceFromLibrary = useCallback(async () => {
    if (faceBusy) return;
    setFaceBusy(true);
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
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setAlignImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not pick image');
    } finally {
      setFaceBusy(false);
    }
  }, [faceBusy]);

  const openRiderFaceCamera = useCallback(() => {
    setFaceCameraOpen(true);
  }, []);

  /** Camera returns a full frame; Align bakes the hole crop (same as library). */
  const onRiderFaceCaptured = useCallback((uri: string) => {
    setAlignImageUri(uri);
  }, []);

  const onRiderFaceAligned = useCallback(async (uri: string) => {
    try {
      const saved = await setAvatarFacePhotoUri(uri);
      setFacePreviewUri(saved);
      setAlignImageUri(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save photo');
    }
  }, []);

  const handleSelectSource = useCallback(
    async (slotIndex: number, sourceId: string) => {
      const current = priority[slotIndex];
      if (current === sourceId) {
        setPickerSlot(null);
        return;
      }
      const next = [...priority];
      const swapIdx = next.indexOf(sourceId);
      if (swapIdx >= 0) next[swapIdx] = current;
      next[slotIndex] = sourceId;
      setPriorityState(next);
      await setPriorityOrder(next);
      setPickerSlot(null);
    },
    [priority]
  );

  const handlePriorityDragEnd = useCallback(
    async ({ data }: { data: Array<{ key: string; sourceId: string }> }) => {
      const next = data.map((item) => item.sourceId);
      setPriorityState(next);
      await setPriorityOrder(next);
    },
    []
  );

  const priorityDragData = useMemo(
    () =>
      priority.map((sourceId) => ({
        key: sourceId,
        sourceId,
      })),
    [priority]
  );

  const renderPriorityItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<{ key: string; sourceId: string }>) => {
      const index = getIndex() ?? 0;
      const source = allSources.find((s) => s.id === item.sourceId);
      return (
        <ScaleDecorator>
          <TouchableOpacity
            style={[styles.priorityRow, isActive && styles.priorityRowActive]}
            onPress={() => setPickerSlot(index)}
            onLongPress={drag}
            delayLongPress={160}
            disabled={isActive}
            activeOpacity={0.9}
            accessibilityLabel={`${source?.name ?? item.sourceId}, position ${index + 1}`}
            accessibilityHint="Hold and drag to reorder, or tap to swap source"
          >
            <Text style={styles.priorityNum}>{index + 1}</Text>
            <View style={styles.pickerButton}>
              <Text style={styles.pickerButtonText} numberOfLines={1}>
                {source?.name ?? item.sourceId}
              </Text>
              <Text style={styles.pickerChevron}>▼</Text>
            </View>
            <View style={styles.dragHandleHit}>
              <Text style={styles.dragHandle}>☰</Text>
            </View>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [allSources]
  );

  const handleAddCustom = useCallback(async () => {
    const url = addUrl.trim();
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        Alert.alert('Invalid URL', 'Feed URL must start with http:// or https://');
        return;
      }
    } catch {
      Alert.alert('Invalid URL', 'Please enter a valid feed URL.');
      return;
    }
    let name = addName.trim();
    if (!name) {
      try {
        name = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        name = url;
      }
    }
    if (customSources.length >= 10) {
      Alert.alert(
        'Custom feed limit',
        'You can add up to 10 custom news feeds. Remove one before adding another.'
      );
      return;
    }
    setAdding(true);
    try {
      const newSource = await addCustomSource(url, name);
      setCustomSourcesState((prev) => [...prev, newSource]);
      const nextPriority = [...priority, newSource.id];
      setPriorityState(nextPriority);
      await setPriorityOrder(nextPriority);
      setAddUrl('');
      setAddName('');
    } finally {
      setAdding(false);
    }
  }, [addUrl, addName, priority, customSources.length]);

  const handleRemoveCustom = useCallback(
    (id: string) => {
      Alert.alert('Remove source', 'Remove this custom source?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCustomSource(id);
            setCustomSourcesState((prev) => prev.filter((s) => s.id !== id));
            setPriorityState((prev) => {
              const next = prev.filter((sid) => sid !== id);
              void setPriorityOrder(next);
              return next;
            });
          },
        },
      ]);
    },
    []
  );

  const handleResetOnboarding = useCallback(() => {
    if (!onboardingReset) return;
    Alert.alert(
      'Reset onboarding',
      'This clears your profile answers and the avatar face photo, then runs the welcome flow again. Headlines settings are kept.',
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
      const [onboarding, setupSheet, setupHistory, bikeBalance, sources, sourcePriority] =
        await Promise.all([
          getOnboardingAnswers(),
          getBikeSetupDaySheet(),
          getSessionHistory(),
          loadBikeBalanceState(),
          getCustomSources(),
          getPriorityOrder(),
        ]);
      const json = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          onboarding,
          setupSheet,
          setupSessionHistory: setupHistory,
          bikeBalance,
          customSources: sources,
          newsPriority: sourcePriority,
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
      'This permanently removes your profile, photos, Day Setup Sheet and saved setups, Bike Balance state, Track Walk notes, and news preferences from this device, then restarts onboarding.',
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
                clearTrackWalkSessions(),
                resetHeadlinesSettings(),
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

  const handleNotifyPriority1Toggle = useCallback(async (value: boolean) => {
    if (value) {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Notifications',
          'Priority 1 alerts are available in the iOS and Android apps, not in the browser.'
        );
        return;
      }
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications',
          'Permission was denied. Enable notifications in your device settings to get alerts for Priority 1 news.'
        );
        return;
      }
    }
    setNotifyPriority1State(value);
    await setNotifyPriority1(value);
  }, []);

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

  const isFilteringSources = sourceSearch.trim().length > 0;

  return (
    <NestableScrollContainer style={styles.container} contentContainerStyle={styles.content}>
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
                style={[
                  styles.avatarLabel,
                  avatarId === preset.id && styles.avatarLabelActive,
                ]}
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

      {Platform.OS !== 'web' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.sectionSubtitle}>
            When new headlines appear from your Priority 1 source (e.g. when you open the app or refresh), show a notification.
          </Text>
          <View style={styles.notifyRow}>
            <Text style={styles.notifyLabel}>Notify for Priority 1 news</Text>
            <Switch
              value={notifyPriority1}
              onValueChange={handleNotifyPriority1Toggle}
              trackColor={{ false: '#334155', true: '#f59e0b' }}
              thumbColor="#f8fafc"
            />
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
        <Text style={styles.sectionTitle}>Source order</Text>
        <Text style={styles.sectionSubtitle}>
          Hold and drag ☰ to reorder. 1 = Priority 1 for alerts. Tap a name to swap sources.
        </Text>
        <TextInput
          style={styles.prioritySearchInput}
          placeholder="Filter sources"
          placeholderTextColor="#94a3b8"
          value={sourceSearch}
          onChangeText={setSourceSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isFilteringSources ? (
          <>
            {visiblePriority.map(({ sourceId, index, source }) => (
              <View key={`${sourceId}-${index}`} style={styles.priorityRow}>
                <Text style={styles.priorityNum}>{index + 1}</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setPickerSlot(index)}
                >
                  <Text style={styles.pickerButtonText} numberOfLines={1}>
                    {source?.name ?? sourceId}
                  </Text>
                  <Text style={styles.pickerChevron}>▼</Text>
                </TouchableOpacity>
              </View>
            ))}
            {visiblePriority.length === 0 ? (
              <Text style={styles.priorityEmpty}>No priority sources match your search.</Text>
            ) : (
              <Text style={styles.priorityEmpty}>Clear the filter to drag-reorder sources.</Text>
            )}
          </>
        ) : (
          <NestableDraggableFlatList
            data={priorityDragData}
            keyExtractor={(item) => item.key}
            onDragEnd={handlePriorityDragEnd}
            renderItem={renderPriorityItem}
            scrollEnabled={false}
            activationDistance={8}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom sources</Text>
        <Text style={styles.sectionSubtitle}>Add an RSS feed URL. It will appear in the priority list above.</Text>
        <TextInput
          style={styles.input}
          placeholder="Feed URL (e.g. https://example.com/feed.xml)"
          placeholderTextColor="#64748b"
          value={addUrl}
          onChangeText={setAddUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Display name (optional)"
          placeholderTextColor="#64748b"
          value={addName}
          onChangeText={setAddName}
        />
        <TouchableOpacity
          style={[styles.addButton, adding && styles.addButtonDisabled]}
          onPress={handleAddCustom}
          disabled={adding || !addUrl.trim()}
        >
          <Text style={styles.addButtonText}>Add source</Text>
        </TouchableOpacity>

        {customSources.length > 0 && (
          <View style={styles.customList}>
            <Text style={styles.customListTitle}>Your custom sources</Text>
            {customSources.map((s) => (
              <View key={s.id} style={styles.customRow}>
                <View style={styles.customRowText}>
                  <Text style={styles.customName}>{s.name}</Text>
                  <Text style={styles.customUrl} numberOfLines={1}>{s.url}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveCustom(s.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your data & privacy</Text>
        <Text style={styles.sectionSubtitle}>
          Your profile, avatar, Day Setup Sheet, saved bike setups, Bike Balance data, Track Walk
          notes, and news preferences stay private in local storage on this device or browser. They
          are not stored in an online account. Sharing a setup as text only happens when you choose
          Messages or another app.
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
          <Text style={styles.sectionSubtitle}>
            Development tools for testing the welcome flow.
          </Text>
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

      <Modal
        visible={pickerSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerSlot(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerSlot(null)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select source for position {(pickerSlot ?? 0) + 1}</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {allSources.length === 0 ? (
                <Text style={styles.modalEmptyText}>
                  Start the API server to load built-in sources, or add a custom RSS feed below.
                </Text>
              ) : (
                allSources.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.modalOption}
                    onPress={() => {
                      if (pickerSlot === null) return;
                      void handleSelectSource(pickerSlot, s.id);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{s.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerSlot(null)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </NestableScrollContainer>
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
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priorityRowActive: {
    opacity: 0.92,
    transform: [{ scale: 1.02 }],
  },
  prioritySearchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  priorityEmpty: { color: '#cbd5e1', fontSize: 13, lineHeight: 19, marginTop: 4 },
  priorityNum: { width: 28, fontSize: 16, fontWeight: '600', color: '#f59e0b' },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  pickerButtonText: { fontSize: 16, color: '#e2e8f0', flex: 1 },
  pickerChevron: { fontSize: 10, color: '#64748b', marginLeft: 8 },
  dragHandleHit: {
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  dragHandle: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: '#0f172a', fontWeight: '600', fontSize: 16 },
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
  customList: { marginTop: 16 },
  customListTitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
  },
  customRowText: { flex: 1 },
  customName: { fontSize: 16, color: '#e2e8f0', fontWeight: '500' },
  customUrl: { fontSize: 12, color: '#64748b', marginTop: 2 },
  removeButton: { paddingVertical: 8, paddingHorizontal: 12 },
  removeButtonText: { color: '#f87171', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '70%',
    zIndex: 1,
    elevation: 4,
  },
  modalEmptyText: {
    padding: 16,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  modalTitle: { padding: 16, fontSize: 18, fontWeight: '600', color: '#f8fafc' },
  modalList: { maxHeight: 320 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  modalOptionText: { fontSize: 16, color: '#e2e8f0' },
  modalClose: { padding: 16, alignItems: 'center' },
  modalCloseText: { color: '#94a3b8', fontSize: 16 },
});
