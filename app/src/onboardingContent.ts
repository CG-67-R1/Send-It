/**
 * Fun / motivational facts for favourite riders and bikes.
 * Catalogs: data/onboardingRiders.json + data/onboardingBikes.json
 * Prefer longest alias match; short aliases require an exact match.
 */

import onboardingRiders from './data/onboardingRiders.json';
import onboardingBikes from './data/onboardingBikes.json';
import { getOnboardingAreas } from './packs/loader';

export interface OnboardingFactEntry {
  id: string;
  displayName: string;
  aliases: string[];
  blurb: string;
  active?: boolean;
  era?: string;
  series?: string[];
  characteristics?: {
    style?: string[];
    vibe?: string[];
    character?: string[];
    signature?: string;
  };
}

const RIDERS = onboardingRiders as OnboardingFactEntry[];
const BIKES = onboardingBikes as OnboardingFactEntry[];

/** Aliases shorter than this only match when the whole input equals the alias (e.g. "R1", "46"). */
const MIN_SUBSTRING_ALIAS_LEN = 3;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s+]/g, ' ')
    .replace(/\s+/g, ' ');
}

function bestBlurb(input: string, entries: OnboardingFactEntry[]): string | null {
  const n = normalize(input);
  if (!n) return null;

  let bestScore = -1;
  let bestBlurbText: string | null = null;

  for (const entry of entries) {
    if (entry.active === false) continue;
    for (const alias of entry.aliases) {
      const a = normalize(alias);
      if (!a) continue;

      let score = -1;
      if (n === a) {
        score = 1000 + a.length;
      } else if (a.length >= MIN_SUBSTRING_ALIAS_LEN && n.includes(a)) {
        score = 500 + a.length * 10;
      } else if (a.length >= MIN_SUBSTRING_ALIAS_LEN && n.length >= 4 && a.includes(n)) {
        score = 200 + n.length * 10;
      } else if (a.length < MIN_SUBSTRING_ALIAS_LEN) {
        // short alias: exact only (handled above)
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestBlurbText = entry.blurb;
      }
    }
  }

  return bestBlurbText;
}

const DEFAULT_RIDER_FACT =
  "Your favourite rider is the one who makes you want to ride. That's the only fact that matters — and it's a good one.";

const DEFAULT_BIKE_FACT =
  "Your favourite bike is the one you think about when you're not riding. That's not a small thing — that's the dream. Keep it close.";

const UNKNOWN_RIDER_FACT =
  "Solid pick — every favourite rider has a story. Keep that inspiration close; that's what this app is for.";

const UNKNOWN_BIKE_FACT =
  "Solid pick — that bike's got stories whether or not it's in our book. Keep the dream close.";

export function getRiderFact(riderName: string): string {
  const trimmed = riderName.trim();
  if (!trimmed) return DEFAULT_RIDER_FACT;
  return bestBlurb(trimmed, RIDERS) ?? UNKNOWN_RIDER_FACT;
}

export function getBikeFact(bikeName: string): string {
  const trimmed = bikeName.trim();
  if (!trimmed) return DEFAULT_BIKE_FACT;
  return bestBlurb(trimmed, BIKES) ?? UNKNOWN_BIKE_FACT;
}

/** Test/helpers: active catalog sizes. */
export function getOnboardingCatalogStats(): { riders: number; bikes: number } {
  return {
    riders: RIDERS.filter((r) => r.active !== false).length,
    bikes: BIKES.filter((b) => b.active !== false).length,
  };
}

export interface RacingClub {
  name: string;
  location: string;
  website?: string;
  email?: string;
}

export interface RacingCoach {
  name: string;
  description: string;
  website?: string;
  email?: string;
}

export interface RacingStateInfo {
  code: string;
  name: string;
  clubs: RacingClub[];
  classes: string[];
  coaches: RacingCoach[];
}

/** Area packs from active regional pack onboarding data. */
export const RACING_STATES: RacingStateInfo[] = getOnboardingAreas().map((a) => ({
  code: a.code,
  name: a.name,
  clubs: a.clubs || [],
  classes: a.classes || [],
  coaches: a.coaches || [],
}));

export function getRacingStateInfo(code: string): RacingStateInfo | undefined {
  return RACING_STATES.find((s) => s.code === code);
}
