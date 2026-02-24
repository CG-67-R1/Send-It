/**
 * Headline scrapers for motorcycle/racing news sites.
 * Each returns an array of { title, url, source, sourceId, date }.
 */
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

export const BUILTIN_SOURCES = [
  { id: 'mcnews', name: 'MCNews (AU)' },
  { id: 'amcn', name: 'AMCN' },
  { id: 'asbk', name: 'ASBK' },
  { id: 'mcn', name: 'MCN' },
  { id: 'motor_sport', name: 'Motor Sport' },
  { id: 'motor_sport_motogp', name: 'Motor Sport MotoGP' },
  { id: 'bennetts', name: 'Bennetts BikeSocial' },
  { id: 'worldsbk', name: 'WorldSBK' },
  { id: 'motogp', name: 'MotoGP' },
];

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cache = { data: null, ts: 0 };

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

/** MCNews.com.au – Australian motorcycle news (local/AU). */
export async function scrapeMCNews() {
  const html = await safeFetch('https://www.mcnews.com.au/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="mcnews.com.au"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    // Skip nav, gallery, about – want article paths like /article-slug/ or /category/article/
    if (!href || !text || text.length < 20 || text.length > 200) return;
    const path = href.replace(/^https?:\/\/[^/]+/i, '').replace(/\?.*$/, '');
    if (path.length < 10 || /^\/(about|contact|gallery|forum|popular-reading)/i.test(path)) return;
    const url = href.startsWith('http') ? href : `https://www.mcnews.com.au${href}`;
    if (!items.some((i) => i.url === url)) {
      items.push({ title: text, url, source: 'MCNews (AU)', sourceId: 'mcnews', date: null });
    }
  });
  return items.slice(0, 20);
}

export async function scrapeAMCN() {
  const html = await safeFetch('https://amcn.com.au/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/editorial/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 15 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://amcn.com.au${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'AMCN', sourceId: 'amcn', date: null });
    }
  });
  return items.slice(0, 20);
}

export async function scrapeMCN() {
  const html = await safeFetch('https://www.motorcyclenews.com/news/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 15 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://www.motorcyclenews.com${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'MCN', sourceId: 'mcn', date: null });
    }
  });
  return items.slice(0, 20);
}

export async function scrapeMotorSportMagazine() {
  const html = await safeFetch('https://www.motorsportmagazine.com/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="motorsportmagazine.com"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 20 && text.length < 180) {
      const url = href.startsWith('http') ? href : `https://www.motorsportmagazine.com${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'Motor Sport', sourceId: 'motor_sport', date: null });
    }
  });
  return items.slice(0, 15);
}

export async function scrapeMotorSportMotoGP() {
  const html = await safeFetch('https://www.motorsportmagazine.com/articles/category/motorcycles/motogp/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/articles/motorcycles/motogp/"], a[href*="/archive/article/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 15 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://www.motorsportmagazine.com${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'Motor Sport MotoGP', sourceId: 'motor_sport_motogp', date: null });
    }
  });
  return items.slice(0, 15);
}

export async function scrapeBennetts() {
  const html = await safeFetch('https://www.bennetts.co.uk/bikesocial/news-and-views');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/bikesocial/news-and-views/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 10 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://www.bennetts.co.uk${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'Bennetts BikeSocial', sourceId: 'bennetts', date: null });
    }
  });
  return items.slice(0, 15);
}

export async function scrapeASBK() {
  const html = await safeFetch('https://www.asbk.com.au/all/news/');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 15 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://www.asbk.com.au${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'ASBK', sourceId: 'asbk', date: null });
    }
  });
  return items.slice(0, 15);
}

export async function scrapeWorldSBK() {
  const html = await safeFetch('https://www.worldsbk.com/en/news');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/en/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 15 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://www.worldsbk.com${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'WorldSBK', sourceId: 'worldsbk', date: null });
    }
  });
  return items.slice(0, 15);
}

export async function scrapeMotoGP() {
  const html = await safeFetch('https://www.motogp.com/en/news');
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = [];
  $('a[href*="/en/news/"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    if (href && text && text.length > 15 && text.length < 200) {
      const url = href.startsWith('http') ? href : `https://www.motogp.com${href}`;
      if (!items.some(i => i.url === url)) items.push({ title: text, url, source: 'MotoGP', sourceId: 'motogp', date: null });
    }
  });
  return items.slice(0, 20);
}

const allScrapers = [
  scrapeMCNews,
  scrapeAMCN,
  scrapeASBK,
  scrapeMCN,
  scrapeMotorSportMagazine,
  scrapeMotorSportMotoGP,
  scrapeBennetts,
  scrapeWorldSBK,
  scrapeMotoGP,
];

export async function getAllHeadlines(bypassCache = false) {
  const cached = !bypassCache ? fromCache() : null;
  if (cached) return cached;

  const results = await Promise.allSettled(allScrapers.map((fn) => fn()));
  const all = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) all.push(...r.value);
  }
  // Dedupe by url
  const seen = new Set();
  const deduped = all.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });
  // Ensure sourceId for backwards compat
  deduped.forEach((i) => { if (!i.sourceId) i.sourceId = i.source?.toLowerCase().replace(/\s+/g, '_') || 'unknown'; });
  // Sort by source then title for stable order
  deduped.sort((a, b) => (a.source + a.title).localeCompare(b.source + b.title));
  setCache(deduped);
  return deduped;
}

const rssParser = new Parser({ timeout: 10000 });

/**
 * Fetch headlines from RSS/Atom feed URLs (for user-added custom sources).
 * @param {Array<{ url: string, name: string, id?: string }>} customSources
 * @returns {Promise<Array<{ title, url, source, sourceId, date }>>}
 */
export async function fetchCustomHeadlines(customSources) {
  if (!Array.isArray(customSources) || customSources.length === 0) return [];
  const all = [];
  for (let idx = 0; idx < customSources.length; idx++) {
    const { url, name, id } = customSources[idx];
    const sourceId = id || `custom_${idx + 1}`;
    try {
      const feed = await rssParser.parseURL(url);
      const items = (feed.items || []).slice(0, 15).map((item) => ({
        title: item.title?.trim() || 'Untitled',
        url: item.link || item.guid || '',
        source: name,
        sourceId,
        date: item.pubDate ? parseDate(item.pubDate) : null,
      })).filter((i) => i.url);
      all.push(...items);
    } catch {
      // skip failed feed
    }
  }
  return all;
}
