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

/**
 * A failed scrape returns no rows (sources swallow fetch errors) and the weekly
 * workflow commits whatever this script writes. Refuse to replace a populated
 * cache with an empty list, or to cut it in half, which is what one dead
 * upstream source does (Champions Ride Days is about half the file).
 */
export function calendarRefreshWouldWipeCache(previousCount, nextCount) {
  if (!Number.isFinite(previousCount) || previousCount <= 0) return false;
  if (!Number.isFinite(nextCount) || nextCount < 0) return true;
  if (nextCount === 0) return true;
  return previousCount >= 10 && nextCount * 2 < previousCount;
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

async function loadPreviousEventCount() {
  try {
    const raw = await fs.readFile(OUT_FILE, 'utf8');
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data?.events;
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const config = loadSourcesConfig();
  const previousCount = await loadPreviousEventCount();
  const { events: scraped, errors } = await scrapeAllSources();

  const staticKeys = await loadStaticDedupeKeys();
  const withoutStaticDupes = scraped.filter((ev) => {
    const key = `${(ev.name || '').toLowerCase()}|${ev.start_date}|${(ev.venue || '').toLowerCase()}`;
    return !staticKeys.has(key);
  });

  const deduped = dedupeEvents(withoutStaticDupes);
  const inPeriod = filterByCatalogPeriod(deduped, config);
  inPeriod.sort((a, b) => a.start_date.localeCompare(b.start_date));

  if (calendarRefreshWouldWipeCache(previousCount, inPeriod.length)) {
    console.error(
      `Refusing to replace ${previousCount} cached AU events with ${inPeriod.length}. ` +
        'The scrape looks failed, so the existing cache was left unchanged.'
    );
    if (errors.length) console.warn(`Errors (${errors.length}):`, errors.join('; '));
    process.exit(1);
  }

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

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
