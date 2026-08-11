import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import { buildTrackdayPrepReportHtml } from './trackdayPrepReportHtml';
import type { TrackdayPrepDraft } from '../storage/trackdayPrep';

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'trackday-prep';
}

export async function printTrackdayPrepReport(
  draft: TrackdayPrepDraft,
  reportText: string
): Promise<void> {
  const html = await buildTrackdayPrepReportHtml(draft, reportText);
  await Print.printAsync({ html });
}

export async function exportTrackdayPrepReport(
  draft: TrackdayPrepDraft,
  reportText: string
): Promise<void> {
  const html = await buildTrackdayPrepReportHtml(draft, reportText);
  const { uri } = await Print.printToFileAsync({ html });
  const title = `Trackday Prep — ${draft.trackName} — ${draft.dateIso}`;
  await Share.share({
    title,
    url: uri,
    message:
      Platform.OS === 'android'
        ? `${title}\n\nRoadRacer Trackday Prep PDF\n${uri}`
        : title,
  });
}

export function trackdayPrepExportFilename(draft: TrackdayPrepDraft): string {
  return `trackday-prep-${draft.dateIso}-${sanitizeFilename(draft.trackName)}.pdf`;
}
