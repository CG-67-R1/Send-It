/**
 * Calendar aggregation: MotoGP + WorldSBK + Australian road racing.
 * - MotoGP & Australia: from static JSON (curated, update when calendars are released).
 * - WorldSBK: from TheSportsDB free API (league id 4454), grouped by round.
 */
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_PATH = join(__dirname, 'data', 'calendar-static.json');
const AU_EVENTS_PATH = join(__dirname, 'data', 'au-road-race-events.json');
const SPORTS_DB_KEY = '123';
const WSBK_LEAGUE_ID = '4454';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Lower number = higher prominence in the app.
const SERIES_PRIORITY = {
  // Australian national + club/state road racing
  asbk: 1,
  au_club: 1,
  au_national: 1,

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

let cache = { data: null, ts: 0 };

function getSeriesPriority(series) {
  return SERIES_PRIORITY[series] ?? 999;
}

function loadStatic() {
  try {
    const raw = readFileSync(STATIC_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Calendar: failed to load static data', e.message);
    return { motogp: [], australia: [] };
  }
}

function normalizeStaticEvent(series, ev) {
  return {
    series,
    title: ev.title,
    venue: ev.venue || null,
    country: ev.country || null,
    startDate: ev.startDate,
    endDate: ev.endDate || ev.startDate,
    url: ev.url || null,
    // Prefer explicit label, then series name, then series key.
    seriesLabel: ev.seriesLabel || ev.series || series,
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
    if (!Array.isArray(data)) return [];
    return data
      .filter((ev) => (ev.discipline || '').toLowerCase() === 'road_race')
      .map((ev) => {
        const name = ev.name || 'Road race event';
        const organiser = ev.organiser || '';
        const isASBK =
          /asbk/i.test(name) ||
          /asbk/i.test(organiser) ||
          /australian superbike/i.test(name);
        const series = isASBK ? 'asbk' : 'au_club';
        return {
          series,
          seriesLabel: isASBK ? 'ASBK' : organiser || 'AU Road Race',
          title: name,
          venue: ev.venue || null,
          country: 'Australia',
          startDate: ev.start_date,
          endDate: ev.end_date || ev.start_date,
          url: ev.entry_url || ev.source_url || null,
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
async function fetchWorldSBK(season = '2025') {
  const url = `https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_KEY}/eventsseason.php?id=${WSBK_LEAGUE_ID}&s=${season}`;
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
