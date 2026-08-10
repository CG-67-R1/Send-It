import { createNavigationContainerRef } from '@react-navigation/native';

export type CoachSeedTab = 'coach' | 'bikesetup';

export type RootTabParamList = {
  HeadlinesTab: undefined;
  CalendarTab: undefined;
  'Q&A': undefined;
  RiderCoachTab:
    | {
        screen: 'CoachChat' | 'RiderCoach' | 'TrackWalk' | 'TrackMemory';
        params?: {
          mode?: CoachSeedTab;
          seedDraftMessage?: string;
          seedMessages?: unknown[];
          seedTab?: CoachSeedTab;
        };
      }
    | undefined;
  FaqsTab: undefined;
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
  navigationRef.navigate('RiderCoachTab', {
    screen: 'CoachChat',
    params: {
      mode: params.mode ?? 'coach',
      seedDraftMessage: params.seedDraftMessage,
      seedMessages: params.seedMessages,
    },
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
  navigationRef.navigate('FaqsTab');
}
