import { createNavigationContainerRef } from '@react-navigation/native';

export type CoachSeedTab = 'coach' | 'bikesetup';

export type RootTabParamList = {
  HeadlinesTab: undefined;
  CalendarTab: undefined;
  'Q&A': undefined;
  TrackWalkTab: undefined;
  RiderCoachTab:
    | {
        screen: 'RiderCoach';
        params?: {
          seedDraftMessage?: string;
          seedMessages?: unknown[];
          seedTab?: CoachSeedTab;
        };
      }
    | undefined;
};

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigateToCoachWithDraft(draft: string, seedTab: CoachSeedTab = 'coach'): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('RiderCoachTab', {
    screen: 'RiderCoach',
    params: { seedDraftMessage: draft, seedTab },
  });
}

export function navigateToBikeSetupWithDraft(draft: string): void {
  navigateToCoachWithDraft(draft, 'bikesetup');
}
