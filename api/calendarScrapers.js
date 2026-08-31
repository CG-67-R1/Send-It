/**
 * Australian road-race calendar scrapers.
 * Reads source catalog from data/au-road-race-sources.json.
 * Each event: { name, start_date, end_date, state, venue, organiser, source_id, source_url, entry_url, discipline, notes, confidence? }
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import pdfParse from 'pdf-parse';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_PATH = join(__dirname, 'data', 'au-road-race-sources.json');

const FACEBOOK_RSS_BRIDGE_BASE =
  process.env.FACEBOOK_RSS_BRIDGE_BASE || 'https://rss-bridge.org/bridge01';

const rssParser = new Parser({ timeout: 15000 });

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

let sourcesConfig = null;

export function loadSourcesConfig() {
  if (sourcesConfig) return sourcesConfig;
  const raw = readFileSync(SOURCES_PATH, 'utf8');
  sourcesConfig = JSON.parse(raw);
  return sourcesConfig;
}

async function safeFetch(url, options = {}) {
  const retries = options.retries ?? 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'RoadRaceCalendar/1.0 (AU events aggregator)',
          ...options.headers,
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429 && attempt < retries) {
        await delay(1500 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if (type.includes('pdf') || url.toLowerCase().endsWith('.pdf')) {
        return Buffer.from(await res.arrayBuffer());
      }
      return await res.text();
    } catch {
      if (attempt < retries) {
        await delay(1000 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href, base) {
  if (!href) return '';
  if (href.startsWith('http')) return href.split('#')[0];
  try {
    return new URL(href, base).href.split('#')[0];
  } catch {
    return '';
  }
}

function parseDateToken(token, defaultYear = new Date().getFullYear()) {
  const t = cleanText(token);
  if (!t) return null;

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) {
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += 2000;
    const m = String(parseInt(dmy[2], 10)).padStart(2, '0');
    const d = String(parseInt(dmy[1], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dMonY = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (dMonY) {
    const mi = MONTHS[dMonY[2].slice(0, 3).toLowerCase()];
    if (mi !== undefined) {
      const d = String(parseInt(dMonY[1], 10)).padStart(2, '0');
      const m = String(mi + 1).padStart(2, '0');
      return `${dMonY[3]}-${m}-${d}`;
    }
  }

  const monDY = t.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (monDY) {
    const mi = MONTHS[monDY[1].slice(0, 3).toLowerCase()];
    if (mi !== undefined) {
      const d = String(parseInt(monDY[2], 10)).padStart(2, '0');
      const m = String(mi + 1).padStart(2, '0');
      return `${monDY[3]}-${m}-${d}`;
    }
  }

  const yearOnly = t.match(/\b(20\d{2})\b/);
  if (yearOnly && t.length < 6) return null;

  const parsed = new Date(t);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= defaultYear - 1) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function extractDateRange(text) {
  const cleaned = cleanText(text);
  const rangeSep = cleaned.match(
    /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*(?:–|-|to|until)\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2})/i
  );
  if (rangeSep) {
    const start = parseDateToken(rangeSep[1]);
    const end = parseDateToken(rangeSep[2]);
    if (start) return { start, end: end || start };
  }

  const patterns = [
    /\d{4}-\d{2}-\d{2}/g,
    /\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}/g,
    /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g,
    /[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/g,
  ];
  for (const re of patterns) {
    const matches = cleaned.match(re);
    if (matches?.length) {
      const start = parseDateToken(matches[0]);
      const end = matches.length > 1 ? parseDateToken(matches[matches.length - 1]) : start;
      if (start) return { start, end: end || start };
    }
  }
  return null;
}

function matchesDiscipline(text, config) {
  const scope = config.meta?.event_scope || {};
  const lower = (text || '').toLowerCase();
  const excludes = scope.exclude_keywords || [];
  for (const kw of excludes) {
    if (lower.includes(kw.toLowerCase())) return false;
  }
  const includes = scope.include_keywords || [];
  if (includes.length === 0) return true;
  return includes.some((kw) => lower.includes(kw.toLowerCase()));
}

function jurisdictionToState(jurisdiction) {
  if (!jurisdiction || jurisdiction === 'AU') return null;
  return jurisdiction;
}

function makeEvent(source, fields) {
  const config = loadSourcesConfig();
  const name = cleanText(fields.name);
  if (!name || name.length < 4) return null;
  if (!fields.start_date) return null;

  const blob = `${name} ${fields.venue || ''} ${fields.notes || ''}`;
  if (!matchesDiscipline(blob, config)) return null;

  return {
    name,
    start_date: fields.start_date,
    end_date: fields.end_date || fields.start_date,
    state: fields.state ?? jurisdictionToState(source.jurisdiction),
    venue: fields.venue ? cleanText(fields.venue) : null,
    organiser: fields.organiser ? cleanText(fields.organiser) : source.name,
    source_id: source.id,
    source_url: source.url,
    entry_url: fields.entry_url || null,
    discipline: fields.discipline || 'road_race',
    notes: fields.notes || null,
    confidence: fields.confidence || 'high',
  };
}

function makeTrackDayEvent(source, fields) {
  const name = cleanText(fields.name);
  if (!name || name.length < 4 || !fields.start_date) return null;
  return {
    name,
    start_date: fields.start_date,
    end_date: fields.end_date || fields.start_date,
    state: fields.state ?? jurisdictionToState(source.jurisdiction),
    venue: fields.venue ? cleanText(fields.venue) : null,
    organiser: fields.organiser ? cleanText(fields.organiser) : 'Champions Ride Days',
    source_id: source.id,
    source_url: source.url,
    entry_url: fields.entry_url || null,
    discipline: 'track_day',
    notes: fields.notes || 'Track day — book via Champions Ride Days',
    confidence: fields.confidence || 'high',
  };
}

const CHAMPIONS_VENUES = [
  { match: /broadford/i, venue: 'Broadford Raceway', state: 'VIC' },
  { match: /the bend/i, venue: 'The Bend Motorsport Park', state: 'SA' },
  { match: /morgan park/i, venue: 'Morgan Park Raceway', state: 'QLD' },
  { match: /mallala/i, venue: 'Mallala Motorsport Park', state: 'SA' },
  { match: /one raceway/i, venue: 'One Raceway', state: 'SA' },
  { match: /collie/i, venue: 'Collie Motorplex', state: 'WA' },
  { match: /wanneroo/i, venue: 'Wanneroo Raceway', state: 'WA' },
  { match: /luddenham/i, venue: 'Luddenham Raceway', state: 'NSW' },
];

function venueFromChampionsTitle(title) {
  for (const { match, venue, state } of CHAMPIONS_VENUES) {
    if (match.test(title)) return { venue, state };
  }
  return { venue: null, state: null };
}

function parseChampionsRideDaysHtml(html) {
  const m = html.match(/var\s+localObj\s*=\s*'(\{.*?\})';/s);
  if (!m) return [];
  try {
    const settings = JSON.parse(m[1]);
    return Array.isArray(settings.events) ? settings.events : [];
  } catch {
    return [];
  }
}

function parseChampionsStart(isoStart) {
  if (!isoStart) return null;
  const d = isoStart.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function parseChampionsEndDate(title, startDate) {
  const range = title.match(/(\d{1,2})\s*(?:Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun|Jul)[a-z]*-(\d{1,2})\s/i);
  if (!range || !startDate) return startDate;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(start);
  if (parseInt(range[2], 10) > parseInt(range[1], 10)) {
    end.setDate(end.getDate() + 1);
  }
  return end.toISOString().slice(0, 10);
}

async function scrapeTrackDayCalendar(source) {
  const html = await safeFetch(source.url);
  if (!html || typeof html !== 'string') return [];
  const raw = parseChampionsRideDaysHtml(html);
  const events = [];
  for (const item of raw) {
    const title = cleanText((item.title || '').replace(/\*\*/g, ' '));
    const start_date = parseChampionsStart(item.start);
    if (!title || !start_date) continue;
    const { venue, state } = venueFromChampionsTitle(title);
    const end_date = parseChampionsEndDate(title, start_date);
    pushUnique(events, makeTrackDayEvent(source, {
      name: title,
      start_date,
      end_date,
      venue,
      state,
      entry_url: item.url || source.url,
    }));
  }
  return events;
}

function pushUnique(events, event) {
  if (!event) return;
  const key = `${event.name}|${event.start_date}|${event.venue || ''}|${event.organiser || ''}`.toLowerCase();
  if (!events.some((e) => `${e.name}|${e.start_date}|${e.venue || ''}|${e.organiser || ''}`.toLowerCase() === key)) {
    events.push(event);
  }
}

function parseDmySlash(token) {
  const m = cleanText(token).match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  return `${y}-${String(parseInt(m[2], 10)).padStart(2, '0')}-${String(parseInt(m[1], 10)).padStart(2, '0')}`;
}

function parseMonthDayYear(text, defaultYear) {
  const t = cleanText(text);
  const monDY = t.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:,(\d{1,2}))?(?:,(\d{1,2}))?(?:\s+(\d{4}))?/);
  if (!monDY) return null;
  const mi = MONTHS[monDY[1].slice(0, 3).toLowerCase()];
  if (mi === undefined) return null;
  const y = monDY[5] ? parseInt(monDY[5], 10) : defaultYear;
  const d1 = parseInt(monDY[2], 10);
  const dLast = monDY[4] ? parseInt(monDY[4], 10) : (monDY[3] ? parseInt(monDY[3], 10) : d1);
  const m = String(mi + 1).padStart(2, '0');
  const start = `${y}-${m}-${String(d1).padStart(2, '0')}`;
  const end = `${y}-${m}-${String(dLast).padStart(2, '0')}`;
  return { start, end };
}

function stateFromLocation(location) {
  const m = (location || '').match(/\((Vic|SA|NSW|QLD|Tas|NT|WA|VIC|QLD)\)/i);
  if (!m) return null;
  const map = { vic: 'VIC', sa: 'SA', nsw: 'NSW', qld: 'QLD', tas: 'TAS', nt: 'NT', wa: 'WA' };
  return map[m[1].toLowerCase()] || m[1].toUpperCase();
}

function extractVenue(text) {
  const venues = [
    'Phillip Island', 'Broadford', 'Mallala', 'Mac Park', 'McDonald Park',
    'Sydney Motorsport Park', 'Sydney Motor Sport Park', 'Eastern Creek', 'Queensland Raceway', 'Morgan Park',
    'Winton', 'Baskerville', 'Collie', 'Barbagallo', 'Hidden Valley',
    'One Raceway', 'Wakefield Park', 'Sandown', 'Calder', 'Lakeside',
    'The Bend', 'Tailem Bend', 'Symmons Plains', 'Mt Gambier', 'Mount Gambier',
  ];
  const lower = (text || '').toLowerCase();
  for (const v of venues) {
    if (lower.includes(v.toLowerCase())) return v;
  }
  return null;
}

function unfoldIcs(text) {
  return (text || '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function parseIcsDateValue(value) {
  const v = (value || '').trim();
  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  const dateTime = v.match(/^(\d{4})(\d{2})(\d{2})T/);
  if (dateTime) return `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`;
  return parseDateToken(v);
}

function icsEndDateInclusive(dtend, dtstart) {
  const end = parseIcsDateValue(dtend);
  const start = parseIcsDateValue(dtstart);
  if (!end) return start;
  if (!start || end <= start) return end;
  // ICS DTEND is exclusive for all-day events.
  const d = new Date(`${end}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function parseIcsField(block, field) {
  const re = new RegExp(`^${field}[^:]*:(.+)$`, 'm');
  const raw = block.match(re)?.[1];
  if (!raw) return null;
  return cleanText(raw.replace(/\\n/g, ' ').replace(/\\,/g, ','));
}

function parseIcsLocation(location, source) {
  const loc = cleanText(location || '');
  if (!loc) return { venue: null, state: jurisdictionToState(source.jurisdiction) };
  const parts = loc.split('@').map((p) => cleanText(p));
  const venuePart = parts[0] || loc;
  const addressPart = parts[1] || loc;
  return {
    venue: venuePart || extractVenue(loc) || null,
    state: stateFromLocation(loc) || stateFromLocation(addressPart) || jurisdictionToState(source.jurisdiction),
  };
}

export function buildTimelyIcsUrl(source, config) {
  const timely = config.meta?.timely || {};
  const base = timely.base_url || `https://timelyapp.time.ly/api/calendars/${timely.calendar_id || '54704199'}/export?format=ics&target=copy`;
  const startDate = new Date().toISOString().slice(0, 10);
  let url = `${base}&start_date=${startDate}`;
  if (source.timely_filter_groups) {
    url += `&filter_groups=${source.timely_filter_groups}`;
  }
  const tag = timely.road_race_tag || '677551074';
  url += `&tags=${tag}`;
  return url;
}

function parseIcsEvents(icsText, source) {
  const unfolded = unfoldIcs(icsText);
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events = [];

  for (const block of blocks) {
    const summary = parseIcsField(block, 'SUMMARY');
    const dtstart = parseIcsField(block, 'DTSTART');
    const dtend = parseIcsField(block, 'DTEND');
    const location = parseIcsField(block, 'LOCATION');
    const url = parseIcsField(block, 'URL');
    const categories = parseIcsField(block, 'CATEGORIES');
    const start_date = parseIcsDateValue(dtstart);
    if (!summary || !start_date) continue;

    const { venue, state } = parseIcsLocation(location, source);
    const end_date = icsEndDateInclusive(dtend, dtstart) || start_date;

    pushUnique(events, makeEvent(source, {
      name: summary,
      start_date,
      end_date,
      state,
      venue,
      organiser: source.name,
      entry_url: url || source.url,
      notes: categories ? `Timely: ${categories}` : null,
      confidence: 'high',
    }));
  }
  return events;
}

async function scrapeTimelyIcs(source) {
  const config = loadSourcesConfig();
  const url = buildTimelyIcsUrl(source, config);
  const ics = await safeFetch(url, { retries: 2 });
  if (!ics || typeof ics !== 'string' || !ics.includes('BEGIN:VCALENDAR')) {
    console.warn(`[calendar] Timely ICS empty or invalid for ${source.id}`);
    return [];
  }
  return parseIcsEvents(ics, source);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseComputimeTable(html, source) {
  const $ = cheerio.load(html);
  const events = [];
  $('table tr').each((_, el) => {
    const cells = [];
    $(el).find('td').each((__, c) => cells.push(cleanText($(c).text())));
    if (cells.length < 6) return;
    const start = parseDmySlash(cells[0]);
    const end = parseDmySlash(cells[1]) || start;
    if (!start) return;
    const name = cells[3];
    const round = cells[4] ? ` Round ${cells[4]}` : '';
    const location = cells[5];
    const fullName = `${name}${round}`.trim();
    pushUnique(events, makeEvent(source, {
      name: fullName,
      start_date: start,
      end_date: end,
      state: stateFromLocation(location) || source.jurisdiction,
      venue: location.replace(/\s*\([^)]+\)\s*$/, '').trim() || extractVenue(location),
      organiser: 'Computime',
      entry_url: source.url,
    }));
  });
  return events;
}

function parsePhoenixTable(html, source) {
  const $ = cheerio.load(html);
  const events = [];
  const config = loadSourcesConfig();
  const defaultYear = (config.meta?.period?.start_date || '').slice(0, 4) || String(new Date().getFullYear());
  $('table tr').each((_, el) => {
    const cells = [];
    $(el).find('td, th').each((__, c) => cells.push(cleanText($(c).text())));
    if (cells.length < 3) return;
    const datePart = cells.length >= 4 ? `${cells[0]} ${cells[1]}` : cells[0];
    const titlePart = cells.length >= 4 ? cells[2] : cells[1];
    const venueHint = cells.length >= 4 ? cells[3] : cells[2];
    const dates = parseMonthDayYear(datePart, parseInt(defaultYear, 10));
    if (!dates) return;
    pushUnique(events, makeEvent(source, {
      name: titlePart,
      start_date: dates.start,
      end_date: dates.end,
      state: source.jurisdiction,
      venue: extractVenue(`${titlePart} ${venueHint}`) || 'Mallala Motor Sport Park',
      organiser: 'Phoenix MCC',
      entry_url: source.url,
    }));
  });
  return events;
}

function parseHtmlEvents(html, source, baseUrl) {
  const $ = cheerio.load(html);
  const events = [];
  const seen = new Set();

  function addFromBlock(blockText, linkHref, organiserOverride) {
    const text = cleanText(blockText);
    if (text.length < 8 || text.length > 500) return;
    const dates = extractDateRange(text);
    if (!dates) return;

    const key = `${dates.start}|${text.slice(0, 80)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const title = text
      .replace(/\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}/gi, '')
      .replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      .replace(/\s*(–|-|to|until)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const name = title.length >= 4 ? title : text.slice(0, 120);
    pushUnique(events, makeEvent(source, {
      name,
      start_date: dates.start,
      end_date: dates.end,
      venue: extractVenue(text),
      organiser: organiserOverride || source.name,
      entry_url: linkHref ? absoluteUrl(linkHref, baseUrl) : null,
    }));
  }

  $('time[datetime]').each((_, el) => {
    const dt = $(el).attr('datetime');
    const start = parseDateToken(dt);
    if (!start) return;
    const container = $(el).closest('article, li, tr, .event, .fc-event, [class*="event"]');
    const text = container.length ? container.text() : $(el).parent().text();
    const link = container.find('a[href]').first().attr('href') || $(el).closest('a').attr('href');
    addFromBlock(`${text} ${dt}`, link);
  });

  $('tr, article, li, .event, .fc-event, [class*="calendar"] [class*="event"], .tribe-events-calendar-list__event-row').each((_, el) => {
    const text = $(el).text();
    const link = $(el).find('a[href]').first().attr('href');
    addFromBlock(text, link);
  });

  $('a[href]').each((_, el) => {
    const text = $(el).text();
    const parentText = $(el).parent().text();
    const combined = `${parentText} ${text}`;
    if (combined.length > 200) return;
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
    addFromBlock(combined, href);
  });

  return events;
}

async function scrapeGoverningBodyCalendar(source) {
  const html = await safeFetch(source.url);
  if (!html || typeof html !== 'string') return [];
  return parseHtmlEvents(html, source, source.url);
}

async function scrapeAggregatorCalendar(source) {
  const html = await safeFetch(source.url);
  if (!html || typeof html !== 'string') return [];
  if (source.id === 'club_vic_computime') {
    return parseComputimeTable(html, source);
  }
  return parseHtmlEvents(html, source, source.url);
}

async function scrapeClubCalendar(source) {
  if (source.url.toLowerCase().includes('/download') || source.url.toLowerCase().endsWith('.pdf')) {
    return scrapePdfCalendar(source);
  }
  const html = await safeFetch(source.url);
  if (!html || typeof html !== 'string') return [];
  if (source.id === 'club_sa_phoenixmcc') {
    return parsePhoenixTable(html, source);
  }
  return parseHtmlEvents(html, source, source.url);
}

async function scrapeUpdatesPage(source) {
  const html = await safeFetch(source.url);
  if (!html || typeof html !== 'string') return [];
  const $ = cheerio.load(html);
  const events = [];
  $('article, .post, .entry, li').each((_, el) => {
    const text = $(el).text();
    const link = $(el).find('a[href]').first().attr('href');
    const dates = extractDateRange(text);
    if (!dates) return;
    const title = cleanText($(el).find('h1, h2, h3, .entry-title, a').first().text()) || cleanText(text).slice(0, 100);
    pushUnique(events, makeEvent(source, {
      name: title,
      start_date: dates.start,
      end_date: dates.end,
      venue: extractVenue(text),
      entry_url: link ? absoluteUrl(link, source.url) : null,
      notes: 'From announcements page — verify dates',
      confidence: 'medium',
    }));
  });
  return events;
}

async function scrapePdfCalendar(source) {
  const data = await safeFetch(source.url);
  if (!data || typeof data === 'string') return [];
  try {
    const parsed = await pdfParse(data);
    const text = parsed.text || '';
    const events = [];
    const lines = text.split(/\n+/).map((l) => cleanText(l)).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dates = extractDateRange(line);
      if (!dates) continue;
      const nextLine = lines[i + 1] || '';
      const name = line.replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g, '').trim() || nextLine;
      pushUnique(events, makeEvent(source, {
        name: name.slice(0, 150),
        start_date: dates.start,
        end_date: dates.end,
        venue: extractVenue(`${line} ${nextLine}`),
        notes: 'From PDF calendar — verify dates',
        confidence: 'medium',
      }));
    }
    return events;
  } catch {
    return [];
  }
}

async function scrapeSeriesCalendar(source) {
  return scrapeClubCalendar(source);
}

function extractDateFromFacebookPost(title, content) {
  const blob = `${title} ${content}`;
  return extractDateRange(blob);
}

export async function scrapeFacebookEvents(source) {
  const pageSlug = source.facebook_page;
  if (!pageSlug) return [];

  const feedUrl = `${FACEBOOK_RSS_BRIDGE_BASE}/?action=display&bridge=Facebook&u=${encodeURIComponent(pageSlug)}&format=Atom`;
  try {
    const feed = await rssParser.parseURL(feedUrl);
    const events = [];
    for (const item of (feed.items || []).slice(0, 30)) {
      const title = cleanText(item.title);
      const content = cleanText(item.contentSnippet || item.content || item.summary || '');
      const blob = `${title} ${content}`;
      if (!matchesDiscipline(blob, loadSourcesConfig())) continue;

      const dates = extractDateFromFacebookPost(title, content);
      if (!dates) continue;

      const name = title.length >= 4 ? title : content.slice(0, 120);
      pushUnique(events, makeEvent(source, {
        name,
        start_date: dates.start,
        end_date: dates.end,
        venue: extractVenue(blob),
        entry_url: item.link || `https://www.facebook.com/${pageSlug}`,
        notes: 'From Facebook — verify dates on club page',
        confidence: 'low',
      }));
    }
    return events;
  } catch (e) {
    console.warn(`[calendar] Facebook RSS failed for ${source.id}:`, e.message || e);
    return [];
  }
}

const SCRAPER_BY_TYPE = {
  timely_ics: scrapeTimelyIcs,
  governing_body_calendar: scrapeGoverningBodyCalendar,
  club_calendar: scrapeClubCalendar,
  aggregator_calendar: scrapeAggregatorCalendar,
  club_updates_page: scrapeUpdatesPage,
  series_calendar: scrapeSeriesCalendar,
  club_homepage: scrapeClubCalendar,
  track_day_calendar: scrapeTrackDayCalendar,
};

export async function scrapeSource(source) {
  const events = [];
  const fn = SCRAPER_BY_TYPE[source.type];
  if (fn) {
    const items = await fn(source);
    events.push(...items);
  }
  if (source.facebook_page) {
    const fbItems = await scrapeFacebookEvents(source);
    events.push(...fbItems);
  }
  return events;
}

export async function scrapeAllSources() {
  const config = loadSourcesConfig();
  const allEvents = [];
  const errors = [];

  for (const source of config.sources) {
    if (source.type === 'club_directory_reference') continue;
    try {
      if (source.type === 'timely_ics') {
        await delay(600);
      }
      const items = await scrapeSource(source);
      console.log(`[calendar] ${source.id}: ${items.length} events`);
      allEvents.push(...items);
    } catch (e) {
      const msg = `${source.id}: ${e.message || e}`;
      console.warn(`[calendar] ${msg}`);
      errors.push(msg);
    }
  }
  return { events: allEvents, errors };
}

function normalizeDedupeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isGoverningBodySource(ev) {
  return /^gov_/i.test(ev?.source_id || '');
}

/** Prefer MA national calendar over SCB copies of the same meeting. */
function governingBodyPreference(ev) {
  let score = 0;
  const id = ev?.source_id || '';
  if (id === 'gov_ma_national_calendar') score += 100;
  else if (isGoverningBodySource(ev)) score += 40;
  if (ev?.confidence === 'high') score += 10;
  else if (ev?.confidence === 'medium') score += 5;
  if (ev?.entry_url) score += 2;
  if (ev?.state) score += 1;
  if (ev?.venue) score += 1;
  if (ev?.notes) score += 1;
  return score;
}

/**
 * Cross-source dedupe. MA + SCB Timely calendars often list the same meeting with
 * different organisers — merge those on name|date|venue and keep MA when present.
 * Club / track-day sources still keep organiser in the key so distinct promoters
 * on the same day/venue are not collapsed.
 */
export function dedupeEvents(events) {
  const bestByKey = new Map();
  for (const ev of events || []) {
    if (!ev?.start_date) continue;
    const base = `${normalizeDedupeText(ev.name)}|${ev.start_date}|${normalizeDedupeText(ev.venue || ev.state || '')}`;
    const key = isGoverningBodySource(ev)
      ? `gov|${base}`
      : `other|${base}|${normalizeDedupeText(ev.organiser)}`;
    const existing = bestByKey.get(key);
    if (!existing || governingBodyPreference(ev) > governingBodyPreference(existing)) {
      bestByKey.set(key, ev);
    }
  }
  return [...bestByKey.values()];
}

export function filterByCatalogPeriod(events, config) {
  const start = config.meta?.period?.start_date;
  const end = config.meta?.period?.end_date;
  if (!start || !end) return filterFutureEvents(events);
  return events.filter((ev) => ev.start_date >= start && ev.start_date <= end);
}

export function filterFutureEvents(events, lookbackDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return events.filter((ev) => ev.start_date >= cutoffStr);
}
