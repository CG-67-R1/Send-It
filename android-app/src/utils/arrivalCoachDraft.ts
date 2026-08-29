import type { TrackWeatherSummary } from '../location/trackWeather';

export function buildArrivalCoachDraft(
  trackName: string,
  weather: TrackWeatherSummary | null,
  at: Date = new Date()
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

  lines.push('', 'Help me think about what I want to achieve with my riding today.');
  return lines.join('\n');
}
