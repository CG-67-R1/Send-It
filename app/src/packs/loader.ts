/**
 * App-side regional pack loader (bundled subset of packs/).
 * Re-run `npm run sync-app-packs` from api/ or repo root after pack edits.
 */
import active from './bundled/active.json';
import registry from './bundled/registry.json';
import auManifest from './bundled/au/manifest.json';
import auSeries from './bundled/au/competitions/series.json';
import auHeadlines from './bundled/au/headlines/sources.json';
import auOnboarding from './bundled/au/onboarding/areas.json';
import auTracks from './bundled/au/tracks/tracks.json';
import auI18n from './bundled/au/i18n/strings.json';

type Manifest = {
  id: string;
  displayName: string;
  defaultLocalLabel?: string;
  status: string;
  locales?: string[];
  isoCountries?: string[];
};

type SeriesEntry = { id: string; name?: string; local?: boolean };

const MANIFESTS: Record<string, Manifest> = {
  au: auManifest as Manifest,
};

const SERIES: Record<string, { series: SeriesEntry[] }> = {
  au: auSeries as { series: SeriesEntry[] },
};

const HEADLINES: Record<string, { sourceIds: string[] }> = {
  au: auHeadlines as { sourceIds: string[] },
};

const ONBOARDING: Record<string, { areas: RacingArea[] }> = {
  au: auOnboarding as { areas: RacingArea[] },
};

const TRACKS: Record<string, { version?: number; tracks: unknown[] }> = {
  au: auTracks as { version?: number; tracks: unknown[] },
};

const I18N: Record<string, { locales: Record<string, Record<string, string>> }> = {
  au: auI18n as { locales: Record<string, Record<string, string>> },
};

export interface RacingClub {
  name: string;
  location: string;
  website?: string;
  email?: string;
}

export interface RacingCoach {
  name: string;
  description: string;
  website?: string;
  email?: string;
}

export interface RacingArea {
  code: string;
  nodeId?: string;
  name: string;
  clubs: RacingClub[];
  classes: string[];
  coaches: RacingCoach[];
}

export function listActivePacks(): string[] {
  return (active.packs as string[]) || ['au'];
}

export function getPrimaryPackId(): string {
  return listActivePacks()[0] || 'au';
}

export function getPrimaryManifest(): Manifest | null {
  return MANIFESTS[getPrimaryPackId()] || null;
}

export function getLocalUiLabel(): string {
  const manifest = getPrimaryManifest();
  return manifest?.defaultLocalLabel || manifest?.displayName || 'Local';
}

export function getLocalSeriesIds(): Set<string> {
  const ids = new Set<string>();
  for (const packId of listActivePacks()) {
    for (const s of SERIES[packId]?.series || []) {
      if (s.id) ids.add(s.id);
    }
  }
  return ids;
}

export function getLocalCountryNames(): Set<string> {
  const names = new Set<string>();
  for (const packId of listActivePacks()) {
    const m = MANIFESTS[packId];
    if (m?.displayName) names.add(m.displayName);
    for (const countryCode of m?.isoCountries || []) {
      if (countryCode === 'AU') names.add('Australia');
      if (countryCode === 'GB') names.add('United Kingdom');
      if (countryCode === 'ES') names.add('Spain');
      if (countryCode === 'IT') names.add('Italy');
    }
  }
  return names;
}

export function getHeadlineSourceIds(): string[] {
  const ids = new Set<string>();
  for (const packId of listActivePacks()) {
    for (const sid of HEADLINES[packId]?.sourceIds || []) ids.add(sid);
  }
  return [...ids];
}

export function getOnboardingAreas(): RacingArea[] {
  const areas: RacingArea[] = [];
  for (const packId of listActivePacks()) {
    areas.push(...(ONBOARDING[packId]?.areas || []));
  }
  return areas;
}

export function getBundledTracksCatalog(): { version: number; tracks: unknown[] } {
  const tracks: unknown[] = [];
  const seen = new Set<string>();
  let version = 1;
  for (const packId of listActivePacks()) {
    const trackCatalog = TRACKS[packId];
    if (!trackCatalog) continue;
    version = trackCatalog.version || version;
    for (const track of trackCatalog.tracks || []) {
      const id = (track as { id?: string }).id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      tracks.push(track);
    }
  }
  return { version, tracks };
}

export function getI18nString(key: string, fallback: string): string {
  const packId = getPrimaryPackId();
  const locales = I18N[packId]?.locales || {};
  const primaryLocale =
    getPrimaryManifest()?.locales?.[0] || Object.keys(locales)[0] || 'en';
  return locales[primaryLocale]?.[key] || locales.en?.[key] || fallback;
}

export function getRegistryNodes() {
  return registry.nodes || [];
}
