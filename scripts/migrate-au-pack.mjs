/**
 * Copy existing AU product data into packs/regions/au/ (overwrite stubs).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const AU = path.join(ROOT, 'packs', 'regions', 'au');

function writeJson(rel, data) {
  const fp = path.join(AU, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('wrote', rel);
}

function readJson(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

// Calendar
const calSources = readJson(path.join(ROOT, 'api', 'data', 'au-road-race-sources.json'));
writeJson('calendar/sources.json', calSources);

const calStatic = readJson(path.join(ROOT, 'api', 'data', 'calendar-static.json'));
writeJson('calendar/static.json', {
  motogp: calStatic.motogp || [],
  national: calStatic.australia || [],
  club: calStatic.australia_club || [],
  // keep legacy keys for shim compatibility
  australia: calStatic.australia || [],
  australia_club: calStatic.australia_club || [],
});

// Headlines
writeJson('headlines/sources.json', {
  sourceIds: ['ma_roadrace', 'asbk', 'amcn_asbk'],
  sources: [
    {
      id: 'ma_roadrace',
      name: 'Motorcycling Australia (Road Race)',
      type: 'scraper',
      confidence: 'official',
      nodeId: 'au',
    },
    {
      id: 'asbk',
      name: 'ASBK',
      type: 'scraper',
      confidence: 'official',
      nodeId: 'au',
    },
    {
      id: 'amcn_asbk',
      name: 'AMCN ASBK',
      type: 'scraper',
      confidence: 'established-press',
      nodeId: 'au',
    },
  ],
});

// Tracks
const tracks = readJson(path.join(ROOT, 'app', 'src', 'data', 'tracks.json'));
const tracksWithNode = {
  ...tracks,
  tracks: (tracks.tracks || []).map((t) => ({ ...t, nodeId: t.nodeId || 'au', kind: t.kind || 'road_circuit' })),
};
writeJson('tracks/tracks.json', tracksWithNode);

const geofences = readJson(path.join(ROOT, 'app', 'src', 'data', 'catalog_track_geofences.json'));
writeJson('tracks/geofences.json', geofences);

const turnVer = readJson(path.join(ROOT, 'app', 'src', 'data', 'track_turn_verification.json'));
writeJson('tracks/turn_verification.json', turnVer);

// Rules (MoMS)
const moms = readJson(path.join(ROOT, 'api', 'data', 'moms-online-urls.json'));
writeJson('rules/rulebook.json', {
  governingBody: 'Motorcycling Australia',
  shortName: 'MoMS',
  edition: moms.edition,
  sourcePage: moms.sourcePage,
  fullPdfUrl: moms.fullPdfUrl,
  verifiedAt: moms.verifiedAt,
  note: moms.note,
  urls: { fullPdf: moms.fullPdfUrl, sourcePage: moms.sourcePage },
  chapters: moms.chapters,
});
writeJson('rules/technical_variations.json', {
  variations: [
    {
      id: 'au-moms-road-race',
      title: 'MoMS Chapter 6 Road Race',
      nodeId: 'au',
      confidence: 'official',
      notes: 'Primary in-app rules KB for Australian road racing.',
    },
  ],
});

// Organisations
writeJson('organisations/federations.json', {
  items: [
    {
      id: 'ma',
      name: 'Motorcycling Australia',
      role: 'federation',
      nodeId: 'au',
      website: 'https://www.ma.org.au',
      confidence: 'official',
    },
    {
      id: 'mnsw',
      name: 'Motorcycling NSW',
      role: 'state_provincial',
      nodeId: 'au-nsw',
      website: 'https://motorcycling.com.au',
      confidence: 'official',
    },
    {
      id: 'mv',
      name: 'Motorcycling Victoria',
      role: 'state_provincial',
      nodeId: 'au-vic',
      website: 'https://motorcyclingvic.com.au',
      confidence: 'official',
    },
    {
      id: 'mq',
      name: 'Motorcycling Queensland',
      role: 'state_provincial',
      nodeId: 'au-qld',
      website: 'https://mqld.org.au',
      confidence: 'official',
    },
    {
      id: 'msa',
      name: 'Motorcycling South Australia',
      role: 'state_provincial',
      nodeId: 'au-sa',
      website: 'https://motorcyclingsa.org.au',
      confidence: 'official',
    },
    {
      id: 'mwa',
      name: 'Motorcycling WA',
      role: 'state_provincial',
      nodeId: 'au-wa',
      website: 'https://motorcyclingwa.org.au',
      confidence: 'official',
    },
    {
      id: 'mtas',
      name: 'Motorcycling Tasmania',
      role: 'state_provincial',
      nodeId: 'au-tas',
      website: 'https://mtas.org.au',
      confidence: 'official',
    },
  ],
});

writeJson('competitions/series.json', {
  series: [
    {
      id: 'asbk',
      name: 'mi-bike Australian Superbike Championship',
      nodeId: 'au',
      local: true,
      confidence: 'official',
      website: 'https://www.asbk.com.au',
    },
    { id: 'au_club', name: 'Australian club road racing', nodeId: 'au', local: true },
    { id: 'au_national', name: 'Australian national road racing', nodeId: 'au', local: true },
    { id: 'au_track_day', name: 'Australian track / ride days', nodeId: 'au', local: true },
    { id: 'australia', name: 'Australia (legacy calendar key)', nodeId: 'au', local: true },
  ],
});

writeJson('competitions/classes.json', {
  classes: [
    { id: 'superbike', name: 'Superbike', nodeId: 'au' },
    { id: 'supersport', name: 'Supersport', nodeId: 'au' },
    { id: 'ssp300', name: 'Supersport 300', nodeId: 'au' },
    { id: 'production', name: 'Production / clubman', nodeId: 'au' },
    { id: 'historic', name: 'Historic road race', nodeId: 'au' },
  ],
});

writeJson('news/sources.json', {
  sources: [
    {
      id: 'amcn',
      name: 'AMCN',
      url: 'https://amcn.com.au',
      confidence: 'established-press',
      nodeId: 'au',
    },
    {
      id: 'asbk-news',
      name: 'ASBK News',
      url: 'https://www.asbk.com.au',
      confidence: 'official',
      nodeId: 'au',
    },
  ],
});

writeJson('licensing/pathways.json', {
  pathways: [
    {
      id: 'au-ma-club',
      title: 'MA club licence pathway',
      nodeId: 'au',
      steps: [
        'Join an MA-affiliated club',
        'Obtain appropriate MA competition licence for road race',
        'Meet medical and protective equipment requirements (MoMS)',
      ],
      urls: ['https://www.ma.org.au/licences-rules/'],
      confidence: 'official',
    },
  ],
});

writeJson('progression/pathways.json', {
  pathways: [
    {
      id: 'au-trackday-to-club',
      title: 'Track day → club racing → ASBK pathway',
      nodeId: 'au',
      stages: ['Track / ride days', 'Club racing', 'State titles', 'ASBK / national'],
      confidence: 'community',
    },
  ],
});

writeJson('terminology.json', {
  terms: [
    { id: 'moms', term: 'MoMS', definition: 'Manual of Motorcycle Sport (MA rule book)', locale: 'en-AU' },
    { id: 'asbk', term: 'ASBK', definition: 'Australian Superbike Championship', locale: 'en-AU' },
    { id: 'ride-day', term: 'ride day', definition: 'Organised track day / practice day', locale: 'en-AU' },
  ],
});

writeJson('emergency.json', {
  contacts: [
    {
      id: 'au-000',
      name: 'Emergency services',
      phone: '000',
      nodeId: 'au',
      notes: 'Australia-wide emergency number',
    }
  ],
  notes: 'At circuits follow organiser / flag marshal instructions first.',
});

writeJson('weather/sources.json', {
  sources: [
    {
      id: 'bom',
      name: 'Bureau of Meteorology',
      url: 'https://www.bom.gov.au',
      confidence: 'official',
      nodeId: 'au',
    },
  ],
});

writeJson('ai/prompts.json', {
  coachHomeContext:
    'You are an expert motorcycle road racing and track day coach specializing in Australian track day riding. Keep Australian context and safety first.',
  bikeSetupHomeContext:
    'You are an expert motorcycle road racing and track day technical advisor specializing in Australian track day riding.',
  askPriority:
    'Priority order: Australia first (ASBK, Motorcycling Australia, state/club motorcycle road racing, Australian circuits and riders), then world level (MotoGP, WorldSBK, international motorcycle road racing).',
  rulesModeName: 'Manual of Motorcycle Sport (MoMS)',
  rulesHomeContext:
    'You are an official Manual of Motorcycle Sport (MoMS) rule-check assistant for Australian motorcycle sport.',
  webSearchCountry: 'AU',
  spellingLocale: 'en-AU',
  tyreSpelling: 'tyre',
});

writeJson('ai/knowledge/index.json', {
  files: [
    {
      path: 'docs/gpt-knowledge/track_geometry_australia.json',
      role: 'track_geometry',
      nodeId: 'au',
    },
    {
      path: 'docs/gpt-knowledge/TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json',
      role: 'track_diagnostic_bias',
      nodeId: 'au',
    },
    {
      path: 'docs/gpt-knowledge/Track_Knowledge_Base_Australia_v2.md',
      role: 'track_kb',
      nodeId: 'au',
    },
  ],
});

writeJson('i18n/strings.json', {
  locales: {
    'en-AU': {
      localFeed: 'Australian headlines',
      localCalendar: 'Australia',
      worldFeed: 'World',
    },
  },
});

// Onboarding areas (from onboardingContent.ts RacingStates)
writeJson('onboarding/areas.json', {
  areas: [
    {
      code: 'NSW',
      nodeId: 'au-nsw',
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
      nodeId: 'au-vic',
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
      nodeId: 'au-qld',
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
      nodeId: 'au-sa',
      name: 'South Australia',
      clubs: [
        {
          name: 'Motorcycling SA affiliated road race clubs',
          location: 'The Bend Motorsport Park and other venues',
          website: 'https://motorcyclingsa.org.au',
        },
      ],
      classes: ['Club-level production classes', 'Supersport', 'Superbike'],
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
      nodeId: 'au-wa',
      name: 'Western Australia',
      clubs: [
        {
          name: 'Motorcycling WA road race clubs',
          location: 'Collie Motorplex & Wanneroo Raceway (Carco.com.au Raceway)',
          website: 'https://motorcyclingwa.org.au',
        },
      ],
      classes: ['Clubman and newcomer classes', 'Supersport', 'Superbike'],
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
      nodeId: 'au-tas',
      name: 'Tasmania',
      clubs: [
        {
          name: 'Motorcycling Tasmania road race clubs',
          location: 'Symmons Plains and local circuits',
          website: 'https://mtas.org.au',
        },
      ],
      classes: ['Lightweight and production-based classes', 'Supersport', 'Superbike'],
      coaches: [
        {
          name: 'Local club coaches',
          description: 'Tasmanian clubs commonly pair newcomers with experienced racers to get started.',
        },
      ],
    },
    {
      code: 'ACT',
      nodeId: 'au-act',
      name: 'Australian Capital Territory',
      clubs: [
        {
          name: 'ACT-based riders (via Motorcycling NSW)',
          location: 'Often race at Wakefield Park / NSW circuits',
          website: 'https://motorcycling.com.au',
        },
      ],
      classes: ['Access to NSW club-level classes', 'Production, Supersport and Superbike'],
      coaches: [
        {
          name: 'MotoDNA / NSW-based coaches',
          description: 'Most ACT riders train and race through NSW-based clubs and coaches.',
        },
      ],
    },
    {
      code: 'NT',
      nodeId: 'au-nt',
      name: 'Northern Territory',
      clubs: [
        {
          name: 'Local NT road race and track day organisers',
          location: 'Hidden Valley and regional circuits/events',
          website: 'https://www.motorsportsnt.com.au',
        },
      ],
      classes: ['Local club-level categories', 'Track days with timing and coaching'],
      coaches: [
        {
          name: 'Local track coaches',
          description:
            'NT events often include coaching sessions — check with your event organiser or club for details.',
        },
      ],
    },
  ],
});

writeJson('organisations/clubs.json', {
  items: [
    {
      id: 'st-george',
      name: 'St George Motorcycle Club',
      role: 'club',
      nodeId: 'au-nsw',
      website: 'https://stgeorgemcc.com',
      confidence: 'community',
    },
    {
      id: 'preston',
      name: 'Preston Motorcycle Club',
      role: 'club',
      nodeId: 'au-vic',
      website: 'https://prestonmcc.com.au',
      confidence: 'community',
    },
  ],
});

writeJson('organisations/coaching.json', {
  items: [
    {
      id: 'motodna',
      name: 'MotoDNA / motoDNA Rider Academy',
      role: 'coaching',
      nodeId: 'au',
      website: 'https://motodna.com.au',
      confidence: 'established-press',
    },
  ],
});

writeJson('suppliers.json', { items: [] });
writeJson('services.json', { items: [] });

// Update manifest status + spelling
const manifest = readJson(path.join(AU, 'manifest.json'));
manifest.status = 'active';
manifest.spelling = { tyre: 'tyre', dateFormat: 'DD/MM/YYYY' };
manifest.defaultLocalLabel = 'Australia';
fs.writeFileSync(path.join(AU, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('updated manifest.json');
console.log('migrate-au-pack complete');
