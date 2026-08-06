/**
 * Calendar aggregation: MotoGP + WorldSBK + Australian road racing.
 * - MotoGP & Australia: from static JSON (curated, update when calendars are released).
 * - WorldSBK: from TheSportsDB free API (league id 4454), grouped by round.
 */
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dedupeEvents } from './calendarScrapers.js';
import {
  getCalendarStatic,
  getLocalSeriesIds,
  getPrimaryManifest,
} from './packLoader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_PATH = join(__dirname, 'data', 'calendar-static.json');
const AU_EVENTS_PATH = join(__dirname, 'data', 'au-road-race-events.json');
const SPORTS_DB_KEY = '123';
const WSBK_LEAGUE_ID = '4454';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Lower number = higher prominence in the app.
const SERIES_PRIORITY = {
  // Local national + club/state road racing + track days (pack-driven ids also get priority 1)
  asbk: 1,
  au_club: 1,
  au_national: 1,
  au_track_day: 1,
  bsb: 1,
  uk_club: 1,
  esbk: 1,
  es_club: 1,
  civ: 1,
  it_club: 1,

  // World championships
  motogp: 2,
  worldsbk: 3,

  // Junior / support series
  asia_moto4: 4,
  red_bull_rookies: 5,
  isle_of_man_tt: 6,
  manx_gp: 6,
  junior_gp_suzuka: 7,
};

function localCountryLabel() {
  return getPrimaryManifest()?.displayName || 'Australia';
}

let cache = { data: null, ts: 0 };

function getSeriesPriority(series) {
  if (SERIES_PRIORITY[series] != null) return SERIES_PRIORITY[series];
  if (getLocalSeriesIds().has(series)) return 1;
  return 999;
}

function loadStatic() {
  try {
    const fromPack = getCalendarStatic();
    if (fromPack) {
      return {
        motogp: fromPack.motogp || [],
        australia: fromPack.national || fromPack.australia || [],
        australia_club: fromPack.club || fromPack.australia_club || [],
      };
    }
    const raw = readFileSync(STATIC_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Calendar: failed to load static data', e.message);
    return { motogp: [], australia: [] };
  }
}

function normalizeStaticEvent(series, ev) {
  const isLocal =
    getLocalSeriesIds().has(series) ||
    ['asbk', 'au_club', 'au_national', 'australia'].includes(series);
  return {
    series,
    title: ev.title,
    venue: ev.venue || null,
    country: ev.country || null,
    startDate: ev.startDate,
    endDate: ev.endDate || ev.startDate,
    url: ev.url || null,
    seriesLabel: ev.seriesLabel || ev.series || series,
    state: ev.state || null,
    organiser: ev.organiser || null,
    notes: ev.notes || null,
    detailTier: isLocal ? 'full' : 'summary',
  };
}

/**
 * Load Australian road-race events produced by the scraper.
 * Expected shape (array of objects):
 * {
 *   name, start_date, end_date, state, venue, organiser,
 *   source_id, source_url, entry_url, discipline, notes
 * }
 */
function loadAuEvents() {
  try {
    const raw = readFileSync(AU_EVENTS_PATH, 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : (data.events || []);
    if (!Array.isArray(list)) return [];
    // Drop MA/SCB duplicates even if the cache was written before gov-aware dedupe.
    const deduped = dedupeEvents(list);
    return deduped
      .filter((ev) => ['road_race', 'track_day'].includes((ev.discipline || '').toLowerCase()))
      .map((ev) => {
        const name = ev.name || 'Road race event';
        const organiser = ev.organiser || '';
        const discipline = (ev.discipline || '').toLowerCase();
        const isTrackDay = discipline === 'track_day';
        const isASBK =
          !isTrackDay &&
          (/asbk/i.test(name) ||
            /asbk/i.test(organiser) ||
            /australian superbike/i.test(name));
        const series = isASBK ? 'asbk' : isTrackDay ? 'au_track_day' : 'au_club';
        return {
          series,
          seriesLabel: isASBK ? 'ASBK' : isTrackDay ? 'Track Day' : organiser || 'AU Road Race',
          title: name,
          venue: ev.venue || null,
          country: localCountryLabel(),
          startDate: ev.start_date,
          endDate: ev.end_date || ev.start_date,
          url: ev.entry_url || ev.source_url || null,
          state: ev.state || null,
          organiser: organiser || null,
          notes: ev.notes || null,
          detailTier: 'full',
          confidence: ev.confidence || 'high',
        };
      })
      .filter((ev) => ev.startDate);
  } catch {
    return [];
  }
}

/**
 * Fetch WorldSBK 2025 from TheSportsDB; group by round (one entry per weekend).
 */
async function fetchWorldSBK(season) {
  const year = season || String(new Date().getFullYear());
  const url = `https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_KEY}/eventsseason.php?id=${WSBK_LEAGUE_ID}&s=${year}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RoadRaceCalendar/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events = data.events || [];
    // Group by intRound: same round = same weekend
    const byRound = new Map();
    for (const e of events) {
      const round = e.intRound || e.dateEvent;
      if (!byRound.has(round)) {
        byRound.set(round, []);
      }
      byRound.get(round).push(e);
    }
    const rounds = [];
    for (const [, roundEvents] of byRound) {
      const dates = roundEvents.map((e) => e.dateEvent).filter(Boolean);
      const first = roundEvents[0];
      const title = (first.strEvent || '')
        .replace(/\s*(Race 1|Race 2|Superpole Race)$/i, '')
        .trim() || `Round ${first.intRound || ''}`;
      rounds.push({
        series: 'worldsbk',
        seriesLabel: 'WorldSBK',
        title,
        venue: first.strVenue || null,
        country: first.strCountry || null,
        startDate: dates.length ? dates.sort()[0] : null,
        endDate: dates.length ? dates.sort().pop() : null,
        url: 'https://www.worldsbk.com/en/calendar-e-circuits.html',
        detailTier: 'summary',
      });
    }
    return rounds.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  } catch (e) {
    console.error('Calendar: WorldSBK fetch failed', e.message);
    return [];
  }
}

/**
 * Returns all calendar events (MotoGP, WorldSBK, Australia) sorted by startDate.
 */
export async function getCalendarEvents(bypassCache = false) {
  if (!bypassCache && cache.data && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }
  const staticData = loadStatic();
  const motogp = (staticData.motogp || []).map((e) =>
    normalizeStaticEvent('motogp', { ...e, seriesLabel: 'MotoGP' })
  );
  const australia = (staticData.australia || []).map((e) =>
    normalizeStaticEvent('asbk', { ...e, series: 'asbk', seriesLabel: 'ASBK' })
  );
  const auClubFromFile = loadAuEvents();
  const auClubStatic = (staticData.australia_club || []).map((e) =>
    normalizeStaticEvent(e.series || 'au_club', { ...e, seriesLabel: e.seriesLabel || 'AU Road Race' })
  );
  const auClub = [...auClubFromFile, ...auClubStatic];
  const worldsbk = await fetchWorldSBK();
  const all = [
    // Highest interest: Aussie national + club/state road-race events
    ...auClub,
    ...australia,
    // Then world championships + junior/support series
    ...motogp,
    ...worldsbk,
  ].filter((e) => e.startDate);
  all.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    const pa = getSeriesPriority(a.series);
    const pb = getSeriesPriority(b.series);
    if (pa !== pb) return pa - pb;
    return (a.title || '').localeCompare(b.title || '');
  });
  cache = { data: all, ts: Date.now() };
  return all;
}
