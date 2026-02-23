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
const SPORTS_DB_KEY = '123';
const WSBK_LEAGUE_ID = '4454';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache = { data: null, ts: 0 };

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
    seriesLabel: ev.series || series,
  };
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
  const motogp = (staticData.motogp || []).map((e) => normalizeStaticEvent('motogp', e));
  const australia = (staticData.australia || []).map((e) =>
    normalizeStaticEvent('australia', { ...e, series: e.series || 'ASBK' })
  );
  const worldsbk = await fetchWorldSBK();
  const all = [
    ...motogp,
    ...australia,
    ...worldsbk,
  ].filter((e) => e.startDate);
  all.sort((a, b) => a.startDate.localeCompare(b.startDate));
  cache = { data: all, ts: Date.now() };
  return all;
}
