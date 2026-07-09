import type { Headline } from '../types';

/** Built-in Australian headline source IDs (must match api/scrapers.js AU_SOURCE_IDS). */
export const LOCAL_SOURCE_IDS = ['mcnews', 'amcn', 'asbk'] as const;

/** Minimum AU share in World feed: 1 AU item per this many total items. */
export const AU_EVERY_N = 4;

/**
 * Interleave headlines so at least 1 in `everyN` is Australian when AU items exist.
 * Pattern: (everyN - 1) world items, then 1 AU item, repeat.
 */
export function interleaveAuQuota(
  headlines: Headline[],
  auIds: readonly string[] = LOCAL_SOURCE_IDS,
  everyN = AU_EVERY_N
): Headline[] {
  const au = headlines.filter((h) => (auIds as readonly string[]).includes(h.sourceId));
  const rest = headlines.filter((h) => !(auIds as readonly string[]).includes(h.sourceId));
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
