import type { TrackWeatherSummary } from '../location/trackWeather';
import type { RiderAiSkill } from '../navigation/homeMode';

export function buildArrivalCoachDraft(
  trackName: string,
  weather: TrackWeatherSummary | null,
  at: Date = new Date(),
  skill: RiderAiSkill = 'novice'
): string {
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const lines = [
    `I'm at ${trackName} on ${dateFormatter.format(at)} at ${timeFormatter.format(at)}.`,
  ];

  if (weather?.summary) {
    lines.push('', `Conditions: ${weather.summary}.`);
  }

  if (skill === 'novice') {
    lines.push('', 'Help me pick one simple thing to work on today. Everyday language.');
  } else if (skill === 'advanced') {
    lines.push(
      '',
      'Help me set a focused session plan — technique and setup checks — for this visit.'
    );
  } else {
    lines.push('', 'Help me think about what I want to achieve with my riding today.');
  }
  return lines.join('\n');
}
