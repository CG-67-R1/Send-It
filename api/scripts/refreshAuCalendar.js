/**
 * Refresh AU road-race calendar cache file.
 * Usage: node scripts/refreshAuCalendar.js
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  scrapeAllSources,
  dedupeEvents,
  filterByCatalogPeriod,
  loadSourcesConfig,
} from '../calendarScrapers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, '..', 'data', 'au-road-race-events.json');
const STATIC_FILE = path.join(__dirname, '..', 'data', 'calendar-static.json');

async function loadExistingEvents() {
  try {
    const raw = await fs.readFile(OUT_FILE, 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : (data.events || []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function loadStaticDedupeKeys() {
  try {
    const raw = await fs.readFile(STATIC_FILE, 'utf8');
    const data = JSON.parse(raw);
    const keys = new Set();
    for (const ev of [...(data.australia || []), ...(data.australia_club || [])]) {
      const start = ev.startDate;
      const name = (ev.title || '').toLowerCase();
      const venue = (ev.venue || '').toLowerCase();
      if (start) keys.add(`${name}|${start}|${venue}`);
    }
    return keys;
  } catch {
    return new Set();
  }
}

function disciplineCount(events, discipline) {
  return events.filter((ev) => (ev.discipline || '').toLowerCase() === discipline).length;
}

function validateRefreshOutput(events, previousEvents, config) {
  const failures = [];
  const trackDayCount = disciplineCount(events, 'track_day');
  const previousTrackDayCount = disciplineCount(previousEvents, 'track_day');
  const minTrackDays = Number(config.meta?.champions_ride_days?.minimum_events ?? 0);

  if (minTrackDays > 0 && trackDayCount < minTrackDays) {
    failures.push(`track_day count ${trackDayCount} below minimum ${minTrackDays}`);
  }
  if (
    previousTrackDayCount >= minTrackDays &&
    previousTrackDayCount > 0 &&
    trackDayCount < Math.ceil(previousTrackDayCount * 0.5)
  ) {
    failures.push(
      `track_day count dropped from ${previousTrackDayCount} to ${trackDayCount}`
    );
  }

  const inverted = events.filter(
    (ev) => ev.start_date && ev.end_date && ev.end_date < ev.start_date
  );
  if (inverted.length > 0) {
    failures.push(
      `events with end_date before start_date: ${inverted
        .slice(0, 3)
        .map((ev) => `${ev.name} (${ev.start_date} > ${ev.end_date})`)
        .join('; ')}`
    );
  }

  if (failures.length > 0) {
    throw new Error(`Refusing to overwrite AU calendar cache: ${failures.join('; ')}`);
  }
}

async function main() {
  const config = loadSourcesConfig();
  const previousEvents = await loadExistingEvents();
  const { events: scraped, errors } = await scrapeAllSources();

  const staticKeys = await loadStaticDedupeKeys();
  const withoutStaticDupes = scraped.filter((ev) => {
    const key = `${(ev.name || '').toLowerCase()}|${ev.start_date}|${(ev.venue || '').toLowerCase()}`;
    return !staticKeys.has(key);
  });

  const deduped = dedupeEvents(withoutStaticDupes);
  const inPeriod = filterByCatalogPeriod(deduped, config);
  inPeriod.sort((a, b) => a.start_date.localeCompare(b.start_date));
  validateRefreshOutput(inPeriod, previousEvents, config);

  const payload = {
    updatedAt: new Date().toISOString(),
    sourceCount: config.sources.length,
    eventCount: inPeriod.length,
    errors,
    events: inPeriod,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${inPeriod.length} AU calendar events to ${OUT_FILE}`);
  if (errors.length) console.warn(`Errors (${errors.length}):`, errors.join('; '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
