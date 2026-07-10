/**
 * Headline scrapers for motorcycle/racing news sites.
 * Each returns { title, url, source, sourceId, date, imageUrl? }.
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AU_HEADLINES_FILE = path.join(__dirname, 'data', 'au-headlines.json');

const PETERBOM_PODCAST_FEED =
  process.env.PETERBOM_PODCAST_FEED_URL || 'https://feeds.buzzsprout.com/2181509.rss';

/** Public RSS-Bridge Instagram feeds are often empty (login/rate limits). Override only if you run a private bridge with session cookies. */
const PETERBOM_INSTAGRAM_FEED =
  process.env.PETERBOM_INSTAGRAM_FEED_URL ||
  'https://rss-bridge.org/bridge01/?action=display&bridge=Instagram&u=peterbom4racing&format=Atom';

export const BUILTIN_SOURCES = [
  { id: 'mcnews', name: 'MCNews (AU)' },
  { id: 'amcn', name: 'AMCN' },
  { id: 'asbk', name: 'ASBK' },
  { id: 'mcn', name: 'MCN' },
  { id: 'motogp', name: 'MotoGP' },
  { id: 'motogpnews', name: 'MotoGP News' },
  { id: 'peterbom', name: 'Peter Bom (Podcast)' },
  { id: 'gpone', name: 'GPone' },
  { id: 'motor_sport_motogp', name: 'Motor Sport MotoGP' },
  { id: 'worldsbk', name: 'WorldSBK' },
  { id: 'bennetts', name: 'Bennetts BikeSocial' },
];

export const AU_SOURCE_IDS = ['mcnews', 'amcn', 'asbk'];

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache = { data: null, ts: 0 };

const rssParser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
    ],
  },
});

function fromCache() {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  return null;
}

function setCache(data) {
  cache = { data, ts: Date.now() };
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'RoadRaceHeadlines/1.0 (News aggregator)',
        ...options.headers,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function cleanTitle(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href, base) {
  if (!href) return '';
  if (href.startsWith('http')) return href.split('?')[0];
  return `${base}${href.startsWith('/') ? '' : '/'}${href}`.split('?')[0];
}

function pushUnique(items, item) {
  if (!item.url || !item.title || item.title.length < 10) return;
  if (!items.some((i) => i.url === item.url)) items.push(item);
}

function imageFromHtmlFragment(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] || null;
}

function imageFromRssItem(item) {
  if (item.enclosure?.url) {
    const type = item.enclosure.type || '';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }
  const media = item.mediaContent?.[0] || item.mediaThumbnail?.[0];
  if (media?.$?.url) return media.$.url;
  return (
    imageFromHtmlFragment(item['content:encoded']) ||
    imageFromHtmlFragment(item.content) ||
    imageFromHtmlFragment(item.summary) ||
    null
  );
}

function imageNearElement($, el, base) {
  const src =
    $(el).find('img').attr('src') ||
    $(el).closest('article').find('img').first().attr('src') ||
    $(el).parent().find('img').first().attr('src') ||
    $(el).siblings('img').first().attr('src');
  return src ? absoluteUrl(src, base) : null;
}

function motorSportArticleTitle(text) {
  let title = cleanTitle(text);
  title = title.replace(/^(MotoGP|Subscriber Archive|Features?|News|Racing|Bike reviews?)\s+/i, '');
  const byMatch = title.match(/^(.+?)\s+By\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/);
  if (byMatch && byMatch[1].length >= 15) title = byMatch[1].trim();
  const dateMatch = title.match(/^(.+?)\s+\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4}/);
  if (dateMatch && dateMatch[1].length >= 15) title = dateMatch[1].trim();
  if (title.length > 160) title = `${title.slice(0, 157)}...`;
  return title;
}

function isMotorSportArticlePath(href) {
  if (!href || href.includes('/articles/category/') || href.includes('/articles/author/')) return false;
  return /\/articles\/[^/?#]+\/[^/?#]+/.test(href);
}

function dateFromMotogpnewsUrl(url) {
  const m = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Buzzsprout and some podcast feeds omit item.link; derive a page URL when possible. */
function urlFromRssItem(item) {
  if (item.link) return item.link;
  const guid = typeof item.guid === 'string' ? item.guid : '';
  if (guid.startsWith('http')) return guid;
  const enc = item.enclosure?.url || '';
  if (enc.includes('buzzsprout.com/episodes/')) {
    return enc.replace(/\.mp3(\?.*)?$/i, '');
  }
  const buzzId = guid.match(/^Buzzsprout-(\d+)$/);
  const showId = enc.match(/buzzsprout\.com\/(\d+)\/episodes\//);
  if (buzzId && showId) {
    return `https://www.buzzsprout.com/${showId[1]}/episodes/${buzzId[1]}`;
  }
  return guid || '';
}

async function fetchRssHeadlines(feedUrl, source, sourceId, limit = 20, options = {}) {
  try {
    const feed = await rssParser.parseURL(feedUrl);
    const feedImage = options.feedImageUrl || feed.itunes?.image || feed.image?.url || null;
    return (feed.items || []).slice(0, limit).map((item) => ({
      title: cleanTitle(item.title) || 'Untitled',
      url: urlFromRssItem(item),
      source,
      sourceId,
      date: item.pubDate ? parseDate(item.pubDate) : null,
      imageUrl: imageFromRssItem(item) || feedImage,
    })).filter((i) => i.url);
  } catch (e) {
    console.warn(`[headlines] RSS failed for ${sourceId}:`, e.message || e);
    return [];
  }
}

export async function scrapeMCNews() {
  const html = await safeFetch('https://www.mcnews.com.au/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.mcnews.com.au';
  $('a[href*="mcnews.com.au"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanTitle($(el).text());
    if (!href || text.length < 20 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '').replace(/\?.*$/, '');
    if (path.length < 10 || /^\/(about|contact|gallery|forum|popular-reading)/i.test(path)) return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'MCNews (AU)',
      sourceId: 'mcnews',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 20);
}

export async function scrapeAMCN() {
  const html = await safeFetch('https://amcn.com.au/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://amcn.com.au';
  $('a[href*="/editorial/"]').each((_, el) => {
    const href = $(el).attr('href');
    const title = cleanTitle($(el).text()).replace(/^(Features?|News|Racing|MotoGP|WorldSBK|ASBK)\s+/i, '').trim();
    if (href && title.length >= 15 && title.length <= 200) {
      pushUnique(items, {
        title,
        url: absoluteUrl(href, base),
        source: 'AMCN',
        sourceId: 'amcn',
        date: null,
        imageUrl: imageNearElement($, el, base),
      });
    }
  });
  return items.slice(0, 20);
}

export async function scrapeMCN() {
  const html = await safeFetch('https://www.motorcyclenews.com/news/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.motorcyclenews.com';
  $('a[href*="/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanTitle($(el).text());
    if (!href || text.length < 15 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '');
    if (path === '/news/' || path === '/news') return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'MCN',
      sourceId: 'mcn',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 20);
}

export async function scrapeGPone() {
  return fetchRssHeadlines('https://www.gpone.com/en/article-feed.xml', 'GPone', 'gpone', 20);
}

export async function scrapeMotoGPNews() {
  const items = await fetchRssHeadlines('https://www.motogpnews.com/feed/', 'MotoGP News', 'motogpnews', 20);
  return items.map((item) => ({
    ...item,
    date: item.date || dateFromMotogpnewsUrl(item.url),
  }));
}

export async function scrapePeterBom() {
  if (process.env.PETERBOM_INSTAGRAM_FEED_URL) {
    const instagram = await fetchRssHeadlines(
      PETERBOM_INSTAGRAM_FEED,
      'Peter Bom (Instagram)',
      'peterbom',
      15
    );
    if (instagram.length > 0) return instagram;
    console.warn('[headlines] peterbom Instagram feed returned 0 items; using podcast feed');
  }
  return fetchRssHeadlines(
    PETERBOM_PODCAST_FEED,
    'Peter Bom (Podcast)',
    'peterbom',
    15
  );
}

function titleFromArticleLink($, el) {
  const link = $(el);
  const candidates = [
    link.text(),
    link.attr('title') || '',
    link.find('img').attr('alt') || '',
    link.closest('article').find('h2, h3').first().text(),
    link.parent().find('h2, h3').first().text(),
  ];
  for (const raw of candidates) {
    const title = motorSportArticleTitle(raw);
    if (title.length >= 15 && !title.includes('height=')) return title;
  }
  return '';
}

export async function scrapeMotorSportMotoGP() {
  const html = await safeFetch('https://www.motorsportmagazine.com/articles/category/motorcycles/motogp/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.motorsportmagazine.com';
  $('a[href*="/articles/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!isMotorSportArticlePath(href)) return;
    const title = titleFromArticleLink($, el);
    if (title.length < 15) return;
    pushUnique(items, {
      title,
      url: absoluteUrl(href, base),
      source: 'Motor Sport MotoGP',
      sourceId: 'motor_sport_motogp',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 20);
}

export async function scrapeBennetts() {
  const html = await safeFetch('https://www.bennetts.co.uk/bikesocial/news-and-views');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.bennetts.co.uk';
  $('a[href*="/bikesocial/news-and-views/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanTitle($(el).text());
    if (!href || text.length < 12 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '');
    if (path === '/bikesocial/news-and-views' || path === '/bikesocial/news-and-views/') return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'Bennetts BikeSocial',
      sourceId: 'bennetts',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 15);
}

export async function scrapeASBK() {
  const html = await safeFetch('https://www.asbk.com.au/all/news/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.asbk.com.au';
  $('a[href*="/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanTitle($(el).text());
    if (!href || text.length < 15 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '');
    if (path === '/all/news/' || path === '/news/') return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'ASBK',
      sourceId: 'asbk',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 15);
}

export async function scrapeWorldSBK() {
  const html = await safeFetch('https://www.worldsbk.com/en/news');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.worldsbk.com';
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    let text = cleanTitle($(el).text());
    text = text.replace(/^NEWS\s+\d+\s*\w*\s*ago\s+/i, '').replace(/\s+Read now$/i, '').trim();
    if (!href.includes('/news/') || href.endsWith('/news') || href.endsWith('/news/')) return;
    if (text.length < 15 || text.length > 200) return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'WorldSBK',
      sourceId: 'worldsbk',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 20);
}

export async function scrapeMotoGP() {
  const html = await safeFetch('https://www.motogp.com/en/news');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.motogp.com';
  $('a[href*="/en/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanTitle($(el).text());
    if (!href || text.length < 15 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '');
    if (path === '/en/news' || path === '/en/news/') return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'MotoGP',
      sourceId: 'motogp',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, 20);
}

const SCRAPER_REGISTRY = [
  { id: 'mcnews', fn: scrapeMCNews },
  { id: 'amcn', fn: scrapeAMCN },
  { id: 'asbk', fn: scrapeASBK },
  { id: 'mcn', fn: scrapeMCN },
  { id: 'motogp', fn: scrapeMotoGP },
  { id: 'motogpnews', fn: scrapeMotoGPNews },
  { id: 'peterbom', fn: scrapePeterBom },
  { id: 'gpone', fn: scrapeGPone },
  { id: 'motor_sport_motogp', fn: scrapeMotorSportMotoGP },
  { id: 'worldsbk', fn: scrapeWorldSBK },
  { id: 'bennetts', fn: scrapeBennetts },
];

export const AU_SCRAPERS = SCRAPER_REGISTRY.filter((s) => AU_SOURCE_IDS.includes(s.id));

async function loadAuHeadlinesFile() {
  try {
    const raw = await fs.readFile(AU_HEADLINES_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.headlines) ? data.headlines : [];
  } catch {
    return [];
  }
}

function mergeHeadlines(liveHeadlines, fileHeadlines) {
  const fileBySource = new Map();
  for (const item of fileHeadlines) {
    if (!AU_SOURCE_IDS.includes(item.sourceId)) continue;
    if (!fileBySource.has(item.sourceId)) fileBySource.set(item.sourceId, []);
    fileBySource.get(item.sourceId).push(item);
  }

  const mergedAu = [];
  const seen = new Set();
  for (const sourceId of AU_SOURCE_IDS) {
    const liveForSource = liveHeadlines.filter((h) => h.sourceId === sourceId);
    const pool = liveForSource.length > 0 ? liveForSource : (fileBySource.get(sourceId) || []);
    for (const item of pool) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      mergedAu.push(item);
    }
  }

  const nonAu = liveHeadlines.filter((h) => !AU_SOURCE_IDS.includes(h.sourceId));
  return [...nonAu, ...mergedAu];
}

export async function getAllHeadlines(bypassCache = false) {
  const cached = !bypassCache ? fromCache() : null;
  if (cached) return cached;

  const results = await Promise.allSettled(SCRAPER_REGISTRY.map((s) => s.fn()));
  const live = [];
  for (let i = 0; i < results.length; i++) {
    const { id } = SCRAPER_REGISTRY[i];
    const r = results[i];
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      if (r.value.length === 0) console.warn(`[headlines] ${id} returned 0 items`);
      live.push(...r.value);
    } else {
      console.warn(`[headlines] ${id} failed:`, r.reason?.message || r.reason || 'unknown error');
    }
  }

  const fileAu = await loadAuHeadlinesFile();
  const merged = mergeHeadlines(live, fileAu);

  const seen = new Set();
  const deduped = merged.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });
  deduped.forEach((i) => {
    if (!i.sourceId) i.sourceId = i.source?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  });
  deduped.sort((a, b) => (a.source + a.title).localeCompare(b.source + b.title));
  setCache(deduped);
  return deduped;
}

export async function fetchCustomHeadlines(customSources) {
  if (!Array.isArray(customSources) || customSources.length === 0) return [];
  const all = [];
  for (let idx = 0; idx < customSources.length; idx++) {
    const { url, name, id } = customSources[idx];
    const sourceId = id || `custom_${idx + 1}`;
    const items = await fetchRssHeadlines(url, name, sourceId, 15);
    all.push(...items);
  }
  return all;
}
