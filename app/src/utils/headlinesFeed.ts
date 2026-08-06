import type { Headline } from '../types';
import { getHeadlineSourceIds } from '../packs/loader';

/** Built-in local headline source IDs from active regional pack(s). */
export const LOCAL_SOURCE_IDS = (
  getHeadlineSourceIds().length
    ? getHeadlineSourceIds()
    : ['ma_roadrace', 'asbk', 'amcn_asbk']
) as readonly string[];

/** Legacy ids kept for cached headlines from older builds. */
const LEGACY_AU_SOURCE_IDS = [
  'amcn',
  'mcnews',
  'amcn_club',
  'amcn_motogp',
  'amcn_worldsbk',
  'amcn_kotb',
  'amcn_bsb',
  'amcn_road_racing',
  'amcn_esbk',
  'amcn_worldwcr',
  'amcn_endurance',
] as const;

/** Club sources for 1-in-6 quota on the Aus feed. */
export const CLUB_SOURCE_IDS = ['amcn_club'] as const;

/** Minimum AU share in World feed: 1 AU item per this many total items. */
export const AU_EVERY_N = 4;

/** Minimum club share in Aus feed: 1 club item per this many total items. */
export const CLUB_EVERY_N = 6;

const MOTOGP_FAMILY_IDS = new Set(['motogp', 'motogpnews', 'motor_sport_motogp']);

function isAuSource(sourceId: string, auIds: readonly string[]): boolean {
  return (
    (auIds as readonly string[]).includes(sourceId) ||
    (LEGACY_AU_SOURCE_IDS as readonly string[]).includes(sourceId)
  );
}

function isClubSource(sourceId: string, clubIds: readonly string[]): boolean {
  return (clubIds as readonly string[]).includes(sourceId);
}

function sourceLimit(sourceId: string, maxPerSource: number): number {
  return MOTOGP_FAMILY_IDS.has(sourceId) ? Math.min(4, maxPerSource) : maxPerSource;
}

function headlineTime(date: string | null | undefined): number {
  if (!date) return NaN;
  const t = Date.parse(date);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Newest first. Undated items sink below dated ones so old/unknown stories
 * cannot sit above fresher headlines.
 */
export function sortByDateDesc(
  headlines: Headline[],
  priorityOrder: string[] = []
): Headline[] {
  const orderMap = new Map(priorityOrder.map((id, i) => [id, i]));
  return [...headlines].sort((a, b) => {
    const ta = headlineTime(a.date);
    const tb = headlineTime(b.date);
    const aHas = Number.isFinite(ta);
    const bHas = Number.isFinite(tb);
    if (aHas && bHas && ta !== tb) return tb - ta;
    if (aHas !== bHas) return aHas ? -1 : 1;
    const pa = orderMap.get(a.sourceId) ?? 9999;
    const pb = orderMap.get(b.sourceId) ?? 9999;
    if (pa !== pb) return pa - pb;
    return (a.title || '').localeCompare(b.title || '');
  });
}

/**
 * Round-robin across sources so one outlet cannot dominate the feed.
 * Each source bucket is pre-sorted newest-first.
 */
export function roundRobinBySource(
  headlines: Headline[],
  options?: { maxPerSource?: number; sourceOrder?: string[] }
): Headline[] {
  const maxPerSource = options?.maxPerSource ?? 8;
  const buckets = new Map<string, Headline[]>();
  for (const h of headlines) {
    const list = buckets.get(h.sourceId) || [];
    list.push(h);
    buckets.set(h.sourceId, list);
  }

  for (const [id, list] of buckets) {
    buckets.set(id, sortByDateDesc(list, options?.sourceOrder));
  }

  const orderedIds: string[] = [];
  if (options?.sourceOrder?.length) {
    for (const id of options.sourceOrder) {
      if (buckets.has(id)) orderedIds.push(id);
    }
  }
  for (const id of buckets.keys()) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }

  const counts = new Map<string, number>();
  const out: Headline[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const id of orderedIds) {
      const used = counts.get(id) || 0;
      const cap = sourceLimit(id, maxPerSource);
      if (used >= cap) continue;
      const bucket = buckets.get(id)!;
      if (used < bucket.length) {
        out.push(bucket[used]);
        counts.set(id, used + 1);
        progress = true;
      }
    }
  }
  return out;
}

/**
 * Interleave headlines so at least 1 in `everyN` is Australian when AU items exist.
 * Pattern: (everyN - 1) world items, then 1 AU item, repeat.
 */
export function interleaveAuQuota(
  headlines: Headline[],
  auIds: readonly string[] = LOCAL_SOURCE_IDS,
  everyN = AU_EVERY_N
): Headline[] {
  const au = headlines.filter((h) => isAuSource(h.sourceId, auIds));
  const rest = headlines.filter((h) => !isAuSource(h.sourceId, auIds));
  if (au.length === 0) return rest;
  if (rest.length === 0) return au;

  const out: Headline[] = [];
  let ai = 0;
  let ri = 0;
  const worldChunk = Math.max(1, everyN - 1);

  while (ri < rest.length || ai < au.length) {
    for (let i = 0; i < worldChunk && ri < rest.length; i++) {
      out.push(rest[ri++]);
    }
    if (ai < au.length) {
      out.push(au[ai++]);
    } else if (ri < rest.length) {
      out.push(rest[ri++]);
    }
  }

  return out;
}

/**
 * Interleave club headlines so at least 1 in `everyN` is club-level when club items exist.
 * Pattern: (everyN - 1) other AU items, then 1 club item, repeat.
 */
export function interleaveClubQuota(
  headlines: Headline[],
  clubIds: readonly string[] = CLUB_SOURCE_IDS,
  everyN = CLUB_EVERY_N
): Headline[] {
  const club = headlines.filter((h) => isClubSource(h.sourceId, clubIds));
  const rest = headlines.filter((h) => !isClubSource(h.sourceId, clubIds));
  if (club.length === 0) return rest;
  if (rest.length === 0) return club;

  const out: Headline[] = [];
  let ci = 0;
  let ri = 0;
  const otherChunk = Math.max(1, everyN - 1);

  while (ri < rest.length || ci < club.length) {
    for (let i = 0; i < otherChunk && ri < rest.length; i++) {
      out.push(rest[ri++]);
    }
    if (ci < club.length) {
      out.push(club[ci++]);
    } else if (ri < rest.length) {
      out.push(rest[ri++]);
    }
  }

  return out;
}

/** World feed: all non-custom headlines, newest first. */
export function buildWorldFeed(
  headlines: Headline[],
  priorityOrder: string[],
  _auIds: readonly string[] = LOCAL_SOURCE_IDS
): Headline[] {
  // Cap per-source so one outlet cannot flood the list, then sort by date.
  const diversified = roundRobinBySource(headlines, {
    maxPerSource: 8,
    sourceOrder: priorityOrder,
  });
  return sortByDateDesc(diversified, priorityOrder);
}

/** Aus feed: Australian sources only, newest first. */
export function buildAuFeed(
  headlines: Headline[],
  priorityOrder: string[],
  auIds: readonly string[] = LOCAL_SOURCE_IDS
): Headline[] {
  const au = headlines.filter((h) => isAuSource(h.sourceId, auIds));
  const diversified = roundRobinBySource(au, {
    maxPerSource: 8,
    sourceOrder: priorityOrder,
  });
  return sortByDateDesc(diversified, priorityOrder);
}
