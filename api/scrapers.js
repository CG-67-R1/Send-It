/**
 * Headline scrapers for motorcycle/racing news sites.
 * Each returns { title, url, source, sourceId, date, imageUrl? }.
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AU_HEADLINES_FILE = path.join(__dirname, 'data', 'au-headlines.json');

/** AMCN racing categories used for AU feed (off-road excluded). */
export const AMCN_RACING_CATEGORIES = [
  { slug: 'club', id: 'amcn_club', name: 'AMCN Club', limit: 12 },
  { slug: 'asbk', id: 'amcn_asbk', name: 'AMCN ASBK', limit: 10 },
  { slug: 'motogp', id: 'amcn_motogp', name: 'AMCN MotoGP', limit: 8 },
  { slug: 'worldsbk', id: 'amcn_worldsbk', name: 'AMCN WorldSBK', limit: 8 },
  { slug: 'king-of-the-baggers', id: 'amcn_kotb', name: 'AMCN King of the Baggers', limit: 6 },
  { slug: 'bsb', id: 'amcn_bsb', name: 'AMCN BSB', limit: 6 },
  { slug: 'road-racing', id: 'amcn_road_racing', name: 'AMCN Road Racing', limit: 8 },
  { slug: 'esbk', id: 'amcn_esbk', name: 'AMCN ESBK', limit: 6 },
  { slug: 'worldwcr', id: 'amcn_worldwcr', name: 'AMCN WorldWCR', limit: 6 },
  { slug: 'endurance', id: 'amcn_endurance', name: 'AMCN Endurance', limit: 6 },
];

export const BUILTIN_SOURCES = [
  { id: 'ma_roadrace', name: 'Motorcycling Australia (Road Race)' },
  { id: 'mcnews', name: 'MCNews (AU)' },
  ...AMCN_RACING_CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
  { id: 'asbk', name: 'ASBK' },
  { id: 'mcn', name: 'MCN' },
  { id: 'motogp', name: 'MotoGP' },
  { id: 'motogpnews', name: 'MotoGP News' },
  { id: 'gpone', name: 'GPone' },
  { id: 'motor_sport_motogp', name: 'Motor Sport MotoGP' },
  { id: 'worldsbk', name: 'WorldSBK' },
  { id: 'bennetts', name: 'Bennetts BikeSocial' },
];

export const AU_SOURCE_IDS = [
  'ma_roadrace',
  'mcnews',
  'asbk',
  ...AMCN_RACING_CATEGORIES.map((c) => c.id),
];

/** Club headlines for 1-in-6 quota on the Aus feed. */
export const CLUB_SOURCE_IDS = ['amcn_club'];

/** Cap MotoGP-family sources so the world feed stays varied. */
const MOTOGP_FAMILY_IDS = new Set(['motogp', 'motogpnews', 'motor_sport_motogp']);
const MOTOGP_FAMILY_LIMIT = 8;
const DEFAULT_SOURCE_LIMIT = 12;
const MCNEWS_LIMIT = 10;
const MAX_CUSTOM_SOURCES = 4;
const MAX_CUSTOM_RSS_BYTES = 2 * 1024 * 1024;
const MAX_CUSTOM_RSS_REDIRECTS = 3;

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache = { data: null, ts: 0 };

const rssParser = new Parser({
  timeout: 25000,
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

export function normalizeHeadlineTitle(title) {
  return cleanTitle(title)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPrivateIpAddress(address) {
  const value = address.toLowerCase().replace(/^\[|\]$/g, '');
  const mappedIpv4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateIpAddress(mappedIpv4);
  if (value.includes(':')) {
    return (
      value === '::1' ||
      value === '::' ||
      value.startsWith('fc') ||
      value.startsWith('fd') ||
      /^fe[89ab]/.test(value)
    );
  }
  const octets = value.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254) ||
    octets.every((part) => part === 0)
  );
}

async function validateCustomSourceUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Custom RSS URL is invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Custom RSS URL must use http or https');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    isPrivateIpAddress(hostname)
  ) {
    throw new Error('Custom RSS URL points to a private or internal host');
  }
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error('Custom RSS URL resolves to a private or internal host');
  }
  return parsed;
}

async function fetchCustomRssXml(initialUrl) {
  let currentUrl = initialUrl;
  for (let redirects = 0; redirects <= MAX_CUSTOM_RSS_REDIRECTS; redirects++) {
    const validated = await validateCustomSourceUrl(currentUrl);
    const res = await fetch(validated, {
      redirect: 'manual',
      headers: { 'User-Agent': 'RoadRaceHeadlines/1.0 (News aggregator)' },
      signal: AbortSignal.timeout(12000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location || redirects === MAX_CUSTOM_RSS_REDIRECTS) {
        throw new Error('Custom RSS redirect limit exceeded');
      }
      currentUrl = new URL(location, validated).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Custom RSS returned HTTP ${res.status}`);
    const contentLength = Number(res.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_CUSTOM_RSS_BYTES) {
      throw new Error('Custom RSS response is too large');
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of res.body) {
      bytes += chunk.length;
      if (bytes > MAX_CUSTOM_RSS_BYTES) {
        res.body.destroy();
        throw new Error('Custom RSS response is too large');
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new Error('Custom RSS redirect limit exceeded');
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
    const feed = options.customSource
      ? await rssParser.parseString(await fetchCustomRssXml(feedUrl))
      : await rssParser.parseURL(feedUrl);
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
  return items.slice(0, MCNEWS_LIMIT);
}

function parseMaDate(text) {
  const m = cleanTitle(text).match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i
  );
  if (!m) return null;
  const d = new Date(`${m[1]} ${m[2]}, ${m[3]}`);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function scrapeMARoadRace() {
  const html = await safeFetch('https://www.ma.org.au/category/news/road-race/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.ma.org.au';
  $('article, .post, .type-post').each((_, article) => {
    const link = $(article).find('h2 a, h3 a, .entry-title a').first();
    const href = link.attr('href');
    const title = cleanTitle(link.text());
    if (!href || title.length < 15 || title.length > 200) return;
    const dateText = $(article).find('time, .entry-date, .posted-on').first().text();
    pushUnique(items, {
      title,
      url: absoluteUrl(href, base),
      source: 'Motorcycling Australia (Road Race)',
      sourceId: 'ma_roadrace',
      date: parseMaDate(dateText),
      imageUrl:
        $(article).find('img').first().attr('src') &&
        absoluteUrl($(article).find('img').first().attr('src'), base),
    });
  });
  if (items.length === 0) {
    $('h2 a[href*="ma.org.au"]').each((_, el) => {
      const href = $(el).attr('href');
      const title = cleanTitle($(el).text());
      if (!href || title.length < 15 || title.length > 200) return;
      pushUnique(items, {
        title,
        url: absoluteUrl(href, base),
        source: 'Motorcycling Australia (Road Race)',
        sourceId: 'ma_roadrace',
        date: null,
        imageUrl: imageNearElement($, el, base),
      });
    });
  }
  return items.slice(0, 15);
}

export async function scrapeAMCNCategory({ slug, id, name, limit = 10 }) {
  const pageUrl = `https://amcn.com.au/categories/racing/${slug}/`;
  const html = await safeFetch(pageUrl);
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://amcn.com.au';
  $('a[href*="/editorial/"]').each((_, el) => {
    const href = $(el).attr('href');
    let title = cleanTitle($(el).text());
    title = title
      .replace(/^(Features?|News|Racing|Analysis)\s+/i, '')
      .replace(/^(Club|ASBK|MotoGP|WorldSBK|Off-road|BSB|Endurance|Road Racing)(?=[A-Z0-9])/i, '')
      .replace(/^(Club|ASBK|MotoGP|WorldSBK|Off-road|BSB|Endurance|Road Racing)\s+/i, '')
      .trim();
    if (!href || title.length < 15 || title.length > 200) return;
    pushUnique(items, {
      title,
      url: absoluteUrl(href, base),
      source: name,
      sourceId: id,
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, limit);
}

export async function scrapeAMCNRacingCategories() {
  const batches = await Promise.all(
    AMCN_RACING_CATEGORIES.map((cat) => scrapeAMCNCategory(cat))
  );
  return batches.flat();
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
  return items.slice(0, DEFAULT_SOURCE_LIMIT);
}

export async function scrapeGPone() {
  const rssItems = await fetchRssHeadlines(
    'https://www.gpone.com/en/article-feed.xml',
    'GPone',
    'gpone',
    DEFAULT_SOURCE_LIMIT
  );
  if (rssItems.length > 0) return rssItems;

  const html = await safeFetch('https://www.gpone.com/en/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  const base = 'https://www.gpone.com';
  $('a[href*="/en/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = cleanTitle($(el).text());
    if (!href || text.length < 15 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '');
    if (!path.includes('/en/') || path === '/en/' || path === '/en') return;
    pushUnique(items, {
      title: text,
      url: absoluteUrl(href, base),
      source: 'GPone',
      sourceId: 'gpone',
      date: null,
      imageUrl: imageNearElement($, el, base),
    });
  });
  return items.slice(0, DEFAULT_SOURCE_LIMIT);
}

export async function scrapeMotoGPNews() {
  const items = await fetchRssHeadlines(
    'https://www.motogpnews.com/feed/',
    'MotoGP News',
    'motogpnews',
    MOTOGP_FAMILY_LIMIT
  );
  return items.map((item) => ({
    ...item,
    date: item.date || dateFromMotogpnewsUrl(item.url),
  }));
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
  return items.slice(0, MOTOGP_FAMILY_LIMIT);
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
  return items.slice(0, DEFAULT_SOURCE_LIMIT);
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
  return items.slice(0, DEFAULT_SOURCE_LIMIT);
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
  return items.slice(0, MOTOGP_FAMILY_LIMIT);
}

async function fetchOgImage(url) {
  const html = await safeFetch(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const og =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[property="twitter:image"]').attr('content');
  return og ? absoluteUrl(og, url) : null;
}

/** Fill missing thumbnails for the first N headlines (best-effort, capped fetches). */
export async function enrichHeadlineImages(headlines, limit = 15) {
  const enriched = headlines.map((h) => ({ ...h }));
  const targets = enriched.filter((h) => !h.imageUrl).slice(0, limit);
  await Promise.all(
    targets.map(async (item) => {
      const imageUrl = await fetchOgImage(item.url);
      if (imageUrl) item.imageUrl = imageUrl;
    })
  );
  return enriched;
}

const SCRAPER_REGISTRY = [
  { id: 'ma_roadrace', fn: scrapeMARoadRace },
  { id: 'mcnews', fn: scrapeMCNews },
  { id: 'amcn_racing', fn: scrapeAMCNRacingCategories },
  { id: 'asbk', fn: scrapeASBK },
  { id: 'mcn', fn: scrapeMCN },
  { id: 'motogp', fn: scrapeMotoGP },
  { id: 'motogpnews', fn: scrapeMotoGPNews },
  { id: 'gpone', fn: scrapeGPone },
  { id: 'motor_sport_motogp', fn: scrapeMotorSportMotoGP },
  { id: 'worldsbk', fn: scrapeWorldSBK },
  { id: 'bennetts', fn: scrapeBennetts },
];

export const AU_SCRAPERS = SCRAPER_REGISTRY.filter(
  (s) => AU_SOURCE_IDS.includes(s.id) || s.id === 'amcn_racing'
);

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
  const seenTitles = new Set();
  const deduped = merged.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    const normalizedTitle = normalizeHeadlineTitle(i.title);
    if (normalizedTitle && seenTitles.has(normalizedTitle)) return false;
    if (normalizedTitle) seenTitles.add(normalizedTitle);
    return true;
  });
  deduped.forEach((i) => {
    if (!i.sourceId) i.sourceId = i.source?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
  });
  deduped.sort((a, b) => (a.source + a.title).localeCompare(b.source + b.title));
  const withImages = await enrichHeadlineImages(deduped, 15);
  setCache(withImages);
  return withImages;
}

export async function fetchCustomHeadlines(customSources) {
  if (!Array.isArray(customSources) || customSources.length === 0) return [];
  const all = [];
  for (let idx = 0; idx < Math.min(customSources.length, MAX_CUSTOM_SOURCES); idx++) {
    const source = customSources[idx];
    if (!source || typeof source.url !== 'string') continue;
    const { url, name, id } = source;
    const sourceId = id || `custom_${idx + 1}`;
    const items = await fetchRssHeadlines(
      url,
      typeof name === 'string' && name.trim() ? name.trim() : `Custom source ${idx + 1}`,
      sourceId,
      15,
      { customSource: true }
    );
    all.push(...items);
  }
  return all;
}
