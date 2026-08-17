import { createNavigationContainerRef } from '@react-navigation/native';

export type CoachSeedTab = 'coach' | 'bikesetup';
export type QaSegment = 'ask' | 'trivia' | 'faqs';

export type RootTabParamList = {
  HeadlinesTab: undefined;
  CalendarTab: undefined;
  RiderCoachTab:
    | {
        screen:
          | 'CoachChat'
          | 'RiderCoach'
          | 'TrackWalk'
          | 'TrackMemory'
          | 'TrackMemoryHub'
          | 'TrackPrep'
          | 'TrackdayPrep'
          | 'TrackdayPrepReport'
          | 'BikeSetupBasics'
          | 'ImportTrackNotes'
          | 'TyreWearAnalysis';
        params?: {
          mode?: CoachSeedTab;
          seedDraftMessage?: string;
          seedMessages?: unknown[];
          seedTab?: CoachSeedTab;
        };
      }
    | undefined;
  BikeSetupTab:
    | {
        screen:
          | 'CoachChat'
          | 'BikeSetupHub'
          | 'BikeSetupSheet'
          | 'BikeBalanceSetup'
          | 'BikeSetupBasics'
          | 'GearingGuide'
          | 'TyreWearAnalysis';
        params?: {
          mode?: CoachSeedTab;
          seedDraftMessage?: string;
          seedMessages?: unknown[];
        };
      }
    | undefined;
  'Q&A': { segment?: QaSegment } | undefined;
};

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export type CoachChatNavParams = {
  mode?: CoachSeedTab;
  seedDraftMessage?: string;
  seedMessages?: unknown[];
};

/** Typed root → CoachChat handoff (draft and/or seedMessages). */
export function navigateToCoachChat(params: CoachChatNavParams = {}): void {
  if (!navigationRef.isReady()) return;
  const mode = params.mode ?? 'coach';
  const chatParams = {
    mode,
    seedDraftMessage: params.seedDraftMessage,
    seedMessages: params.seedMessages,
  };
  if (mode === 'bikesetup') {
    navigationRef.navigate('BikeSetupTab', {
      screen: 'CoachChat',
      params: chatParams,
    });
    return;
  }
  navigationRef.navigate('RiderCoachTab', {
    screen: 'CoachChat',
    params: chatParams,
  });
}

export function navigateToCoachWithDraft(draft: string, seedTab: CoachSeedTab = 'coach'): void {
  navigateToCoachChat({ mode: seedTab, seedDraftMessage: draft });
}

export function navigateToBikeSetupWithDraft(draft: string): void {
  navigateToCoachWithDraft(draft, 'bikesetup');
}

export function navigateToFaqs(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Q&A', { segment: 'faqs' });
}
