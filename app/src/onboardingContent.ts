/**
 * Fun / motivational facts for favourite riders and bikes.
 * Catalogs: data/onboardingRiders.json + data/onboardingBikes.json
 * Prefer longest alias match; short aliases require an exact match.
 */

import onboardingRiders from './data/onboardingRiders.json';
import onboardingBikes from './data/onboardingBikes.json';

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

export const RACING_STATES: RacingStateInfo[] = [
  {
    code: 'NSW',
    name: 'New South Wales',
    clubs: [
      {
        name: 'St George Motorcycle Club',
        location: 'Sydney Motorsport Park, Eastern Creek',
        website: 'https://stgeorgemcc.com',
        email: 'secretary@stgeorgemcc.com',
      },
      {
        name: 'Motorcycling NSW',
        location: 'NSW (state body)',
        website: 'https://motorcycling.com.au',
        email: 'info@motorcycling.com.au',
      },
    ],
    classes: [
      'Junior and senior production classes (300–400cc)',
      'Supersport (600cc)',
      'Superbike / Unlimited',
      'Clubman / newcomer-friendly grades',
    ],
    coaches: [
      {
        name: 'MotoDNA / motoDNA Rider Academy',
        description: 'Coaching days at Sydney Motorsport Park focused on safe, fast riding and race prep.',
        website: 'https://motodna.com.au',
      },
    ],
  },
  {
    code: 'VIC',
    name: 'Victoria',
    clubs: [
      {
        name: 'Preston Motorcycle Club',
        location: 'Broadford State Motorcycle Sports Complex & Phillip Island',
        website: 'https://prestonmcc.com.au',
        email: 'info@prestonmcc.com.au',
      },
      {
        name: 'Motorcycling Victoria',
        location: 'Victoria (state body)',
        website: 'https://motorcyclingvic.com.au',
        email: 'info@motorcyclingvic.com.au',
      },
    ],
    classes: [
      'Pony Express / club-level road race classes',
      'Supersport (600cc)',
      'Superbike',
      'Historic and twin-cup style categories',
    ],
    coaches: [
      {
        name: 'MotoDNA / motoDNA Rider Academy',
        description: 'Regular coaching at Broadford and Phillip Island.',
        website: 'https://motodna.com.au',
      },
    ],
  },
  {
    code: 'QLD',
    name: 'Queensland',
    clubs: [
      {
        name: 'MQ Road Race clubs (via Motorcycling Queensland)',
        location: 'Morgan Park Raceway & Queensland Raceway',
        website: 'https://mqld.org.au',
        email: 'info@mqld.org.au',
      },
    ],
    classes: [
      'Juniors and senior production (300–400cc)',
      'Supersport / Supersport 300',
      'Superbike',
    ],
    coaches: [
      {
        name: 'MotoDNA / motoDNA Rider Academy',
        description: 'Coaching days and race-prep programs in QLD.',
        website: 'https://motodna.com.au',
      },
    ],
  },
  {
    code: 'SA',
    name: 'South Australia',
    clubs: [
      {
        name: 'Motorcycling SA affiliated road race clubs',
        location: 'The Bend Motorsport Park and other venues',
        website: 'https://motorcyclingsa.org.au',
      },
    ],
    classes: [
      'Club-level production classes',
      'Supersport',
      'Superbike',
    ],
    coaches: [
      {
        name: 'Local track day providers',
        description: 'Check Motorcycling SA or your local club for upcoming coaching days.',
        website: 'https://motorcyclingsa.org.au',
      },
    ],
  },
  {
    code: 'WA',
    name: 'Western Australia',
    clubs: [
      {
        name: 'Motorcycling WA road race clubs',
        location: 'Collie Motorplex & Wanneroo Raceway (Carco.com.au Raceway)',
        website: 'https://motorcyclingwa.org.au',
      },
    ],
    classes: [
      'Clubman and newcomer classes',
      'Supersport',
      'Superbike',
    ],
    coaches: [
      {
        name: 'Local race coaches',
        description:
          'WA clubs regularly run coaching and mentoring days — check with your chosen club for current contacts.',
      },
    ],
  },
  {
    code: 'TAS',
    name: 'Tasmania',
    clubs: [
      {
        name: 'Motorcycling Tasmania road race clubs',
        location: 'Symmons Plains and local circuits',
        website: 'https://mtas.org.au',
      },
    ],
    classes: [
      'Lightweight and production-based classes',
      'Supersport',
      'Superbike',
    ],
    coaches: [
      {
        name: 'Local club coaches',
        description: 'Tasmanian clubs commonly pair newcomers with experienced racers to get started.',
      },
    ],
  },
  {
    code: 'ACT',
    name: 'Australian Capital Territory',
    clubs: [
      {
        name: 'ACT-based riders (via Motorcycling NSW)',
        location: 'Often race at Wakefield Park / NSW circuits',
        website: 'https://motorcycling.com.au',
      },
    ],
    classes: [
      'Access to NSW club-level classes',
      'Production, Supersport and Superbike',
    ],
    coaches: [
      {
        name: 'MotoDNA / NSW-based coaches',
        description: 'Most ACT riders train and race through NSW-based clubs and coaches.',
      },
    ],
  },
  {
    code: 'NT',
    name: 'Northern Territory',
    clubs: [
      {
        name: 'Local NT road race and track day organisers',
        location: 'Hidden Valley and regional circuits/events',
        website: 'https://www.motorsportsnt.com.au',
      },
    ],
    classes: [
      'Local club-level categories',
      'Track days with timing and coaching',
    ],
    coaches: [
      {
        name: 'Local track coaches',
        description:
          'NT events often include coaching sessions — check with your event organiser or club for details.',
      },
    ],
  },
];

export function getRacingStateInfo(code: string): RacingStateInfo | undefined {
  return RACING_STATES.find((s) => s.code === code);
}
