import catalogFile from '../../data/gearing/bikePowerbandRef.json';
import type { BikePowerbandRef, EngineConfig } from './types';

type RawRef = {
  id: string;
  manufacturer: string;
  family: string;
  aliases: string[];
  yearFrom: number;
  yearTo: number;
  capacityCc: number;
  engineConfig: EngineConfig;
  peakTorqueRpm: number | null;
  peakPowerRpm: number | null;
  powerbandRpmFrom: number | null;
  powerbandRpmTo: number | null;
  sources: string[];
};

const CATALOG: BikePowerbandRef[] = (catalogFile as { bikes: RawRef[] }).bikes;

export function getBikePowerbandCatalog(): BikePowerbandRef[] {
  return CATALOG;
}

export function getBikePowerbandById(id: string): BikePowerbandRef | null {
  return CATALOG.find((row) => row.id === id) ?? null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s+]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Best alias match for free-text bike identity. Returns null when nothing matches —
 * never invents a row.
 */
export function matchBikePowerbandRef(query: string): BikePowerbandRef | null {
  const normalized = normalize(query);
  if (!normalized) return null;

  let best: BikePowerbandRef | null = null;
  let bestScore = -1;

  for (const row of CATALOG) {
    const names = [row.family, row.manufacturer, `${row.manufacturer} ${row.family}`, ...row.aliases];
    for (const alias of names) {
      const aliasNorm = normalize(alias);
      if (!aliasNorm) continue;
      let score = -1;
      if (normalized === aliasNorm) score = 100 + aliasNorm.length;
      else if (normalized.includes(aliasNorm)) score = 50 + aliasNorm.length;
      else if (aliasNorm.length >= 3 && aliasNorm.includes(normalized)) score = 20 + normalized.length;
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
  }

  return bestScore >= 20 ? best : null;
}

export function filterBikePowerbandCatalog(query: string): BikePowerbandRef[] {
  const normalized = normalize(query);
  if (!normalized) return CATALOG;
  return CATALOG.filter((row) => {
    const hay = normalize(
      `${row.manufacturer} ${row.family} ${row.aliases.join(' ')} ${row.yearFrom} ${row.yearTo}`
    );
    return hay.includes(normalized);
  });
}
