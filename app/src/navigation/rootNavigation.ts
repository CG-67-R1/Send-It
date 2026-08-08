import { createNavigationContainerRef } from '@react-navigation/native';

export type CoachSeedTab = 'coach' | 'bikesetup';

export type RootTabParamList = {
  HeadlinesTab: undefined;
  CalendarTab: undefined;
  'Q&A': undefined;
  RiderCoachTab:
    | {
        screen: 'CoachChat' | 'RiderCoach' | 'TrackWalk';
        params?: {
          mode?: CoachSeedTab;
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
    screen: 'CoachChat',
    params: { mode: seedTab, seedDraftMessage: draft },
  });
}

export function navigateToBikeSetupWithDraft(draft: string): void {
  navigateToCoachWithDraft(draft, 'bikesetup');
}
