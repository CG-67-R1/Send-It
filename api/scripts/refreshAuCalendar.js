/**
 * Refresh AU road-race calendar cache file.
 * Usage: node scripts/refreshAuCalendar.js
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  scrapeAllSources,
  dedupeEvents,
  filterByCatalogPeriod,
  loadSourcesConfig,
} from '../calendarScrapers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, '..', 'data', 'au-road-race-events.json');
const STATIC_FILE = path.join(__dirname, '..', 'data', 'calendar-static.json');

export async function loadPreviousCacheEvents() {
  try {
    const raw = await fs.readFile(OUT_FILE, 'utf8');
    const data = JSON.parse(raw);
    const events = Array.isArray(data) ? data : (data.events || []);
    return Array.isArray(events) ? events : [];
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

export function retainMissingSourceEvents(scrapedEvents, previousEvents, config, errors) {
  const scrapedSourceIds = new Set(
    scrapedEvents.map((ev) => ev?.source_id).filter((sourceId) => typeof sourceId === 'string')
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const retained = [];

  for (const source of config.sources || []) {
    if (!source?.id || source.type === 'club_directory_reference') continue;
    if (scrapedSourceIds.has(source.id)) continue;

    const previousForSource = previousEvents.filter(
      (ev) => ev?.source_id === source.id && (ev.end_date || ev.start_date || '') >= todayStr
    );
    if (previousForSource.length === 0) continue;

    retained.push(...previousForSource);
    errors.push(
      `${source.id}: returned 0 events; retained ${previousForSource.length} previous cache event(s)`
    );
  }

  return [...scrapedEvents, ...retained];
}

async function main() {
  const config = loadSourcesConfig();
  const { events: scraped, errors } = await scrapeAllSources();
  const previousEvents = await loadPreviousCacheEvents();
  const scrapedWithRetained = retainMissingSourceEvents(scraped, previousEvents, config, errors);

  const staticKeys = await loadStaticDedupeKeys();
  const withoutStaticDupes = scrapedWithRetained.filter((ev) => {
    const key = `${(ev.name || '').toLowerCase()}|${ev.start_date}|${(ev.venue || '').toLowerCase()}`;
    return !staticKeys.has(key);
  });

  const deduped = dedupeEvents(withoutStaticDupes);
  const inPeriod = filterByCatalogPeriod(deduped, config);
  inPeriod.sort((a, b) => a.start_date.localeCompare(b.start_date));

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
