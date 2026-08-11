export interface TrackWeatherSummary {
  summary: string;
}

const WMO_LABELS: Record<number, string> = {
  0: 'clear',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'light showers',
  81: 'showers',
  82: 'heavy showers',
  95: 'thunderstorms',
};

function windCompass(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(degrees / 45) % 8;
  return dirs[idx];
}

function weatherLabel(code: number): string {
  return WMO_LABELS[code] ?? 'variable conditions';
}

export async function fetchTrackWeather(lat: number, lng: number): Promise<TrackWeatherSummary | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m',
      timezone: 'auto',
      wind_speed_unit: 'kmh',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current;
    if (!current) return null;

    const temp = current.temperature_2m;
    const code = current.weather_code;
    const windKmh = current.wind_speed_10m;
    const windDir = current.wind_direction_10m;

    const parts: string[] = [];
    if (typeof temp === 'number') parts.push(`${Math.round(temp)}°C`);
    if (typeof code === 'number') parts.push(weatherLabel(code));
    if (typeof windKmh === 'number' && windKmh > 0) {
      const dir = typeof windDir === 'number' ? ` from ${windCompass(windDir)}` : '';
      parts.push(`wind ${Math.round(windKmh)} km/h${dir}`);
    }

    if (!parts.length) return null;
    return { summary: parts.join(', ') };
  } catch {
    return null;
  }
}

/**
 * Daily forecast summary for a specific local calendar date (YYYY-MM-DD).
 * Open-Meteo typically covers ~7–16 days ahead.
 */
export async function fetchTrackForecastForDate(
  lat: number,
  lng: number,
  dateIso: string
): Promise<TrackWeatherSummary | null> {
  const target = dateIso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return null;

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
      timezone: 'auto',
      wind_speed_unit: 'kmh',
      forecast_days: '16',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const daily = data?.daily;
    const times: unknown[] = Array.isArray(daily?.time) ? daily.time : [];
    const idx = times.findIndex((t) => t === target);
    if (idx < 0) return null;

    const code = daily?.weather_code?.[idx];
    const tmax = daily?.temperature_2m_max?.[idx];
    const tmin = daily?.temperature_2m_min?.[idx];
    const precip = daily?.precipitation_probability_max?.[idx];
    const windMax = daily?.wind_speed_10m_max?.[idx];

    const parts: string[] = [];
    if (typeof tmin === 'number' && typeof tmax === 'number') {
      parts.push(`${Math.round(tmin)}–${Math.round(tmax)}°C`);
    } else if (typeof tmax === 'number') {
      parts.push(`high ${Math.round(tmax)}°C`);
    }
    if (typeof code === 'number') parts.push(weatherLabel(code));
    if (typeof precip === 'number') parts.push(`${Math.round(precip)}% rain chance`);
    if (typeof windMax === 'number' && windMax > 0) {
      parts.push(`wind up to ${Math.round(windMax)} km/h`);
    }

    if (!parts.length) return null;
    return { summary: parts.join(', ') };
  } catch {
    return null;
  }
}
