import { createNavigationContainerRef } from '@react-navigation/native';

export type RootTabParamList = {
  HeadlinesTab: undefined;
  CalendarTab: undefined;
  'Q&A': undefined;
  TrackWalkTab: undefined;
  RiderCoachTab:
    | {
        screen: 'RiderCoach';
        params?: { seedDraftMessage?: string; seedMessages?: unknown[] };
      }
    | undefined;
};

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigateToCoachWithDraft(draft: string): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('RiderCoachTab', {
    screen: 'RiderCoach',
    params: { seedDraftMessage: draft },
  });
}
