import type { Headline } from '../types';

/** Built-in Australian headline source IDs (must match api/scrapers.js AU_SOURCE_IDS). */
export const LOCAL_SOURCE_IDS = [
  'ma_roadrace',
  'mcnews',
  'asbk',
  'amcn_club',
  'amcn_asbk',
  'amcn_motogp',
  'amcn_worldsbk',
  'amcn_kotb',
  'amcn_bsb',
  'amcn_road_racing',
  'amcn_esbk',
  'amcn_worldwcr',
  'amcn_endurance',
] as const;

/** Legacy id kept for cached headlines from older builds. */
const LEGACY_AU_SOURCE_IDS = ['amcn'] as const;

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

/**
 * Round-robin across sources so one outlet cannot dominate the feed.
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

/** World feed: diversify international sources, then enforce 1-in-4 AU minimum. */
export function buildWorldFeed(
  headlines: Headline[],
  priorityOrder: string[],
  auIds: readonly string[] = LOCAL_SOURCE_IDS
): Headline[] {
  const au = headlines.filter((h) => isAuSource(h.sourceId, auIds));
  const world = headlines.filter((h) => !isAuSource(h.sourceId, auIds));
  const diversifiedWorld = roundRobinBySource(world, {
    maxPerSource: 8,
    sourceOrder: priorityOrder,
  });
  const diversifiedAu = roundRobinBySource(au, {
    maxPerSource: 6,
    sourceOrder: priorityOrder,
  });
  return interleaveAuQuota([...diversifiedWorld, ...diversifiedAu], auIds, AU_EVERY_N);
}

/** Aus feed: diversify AU sources and enforce 1 club article per 6 items minimum. */
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
  return interleaveClubQuota(diversified, CLUB_SOURCE_IDS, CLUB_EVERY_N);
}
