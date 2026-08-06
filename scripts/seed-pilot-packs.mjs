/**
 * Seed UK, Spain, Italy regional packs (status: seed).
 * No fabricated corner geometry — circuit inventory + GPS only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function writeJson(packId, rel, data) {
  const fp = path.join(ROOT, 'packs', 'regions', packId, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(packId, rel);
}

function setManifestStatus(packId, status, extras = {}) {
  const fp = path.join(ROOT, 'packs', 'regions', packId, 'manifest.json');
  const m = JSON.parse(fs.readFileSync(fp, 'utf8'));
  Object.assign(m, extras, { status });
  fs.writeFileSync(fp, JSON.stringify(m, null, 2) + '\n');
}

// ——— United Kingdom ———
writeJson('uk', 'organisations/federations.json', {
  items: [
    {
      id: 'acu',
      name: 'Auto-Cycle Union (ACU)',
      role: 'federation',
      nodeId: 'uk-england',
      website: 'https://www.acu.org.uk',
      confidence: 'official',
      notes: 'Primary GB governing body for many motorcycle disciplines including road race.',
    },
    {
      id: 'sacu',
      name: 'Scottish Auto-Cycle Union (SACU)',
      role: 'federation',
      nodeId: 'uk-scotland',
      website: 'https://www.sacu.co.uk',
      confidence: 'official',
    },
    {
      id: 'mcui',
      name: 'Motor Cycle Union of Ireland (MCUI)',
      role: 'federation',
      nodeId: 'uk-northern-ireland',
      website: 'https://www.mcui-uc.org.uk',
      confidence: 'official',
      notes: 'Covers Northern Ireland road racing context; verify current affiliation pathways.',
    },
    {
      id: 'acu-wales',
      name: 'ACU Cymru / Wales centres',
      role: 'state_provincial',
      nodeId: 'uk-wales',
      website: 'https://www.acu.org.uk',
      confidence: 'community',
    },
  ],
});

writeJson('uk', 'tracks/tracks.json', {
  version: 1,
  tracks: [
    {
      id: 'silverstone',
      name: 'Silverstone Circuit',
      nodeId: 'uk-england',
      kind: 'road_circuit',
      lat: 52.0733,
      lng: -1.0147,
      layout: 'GP',
      direction: 'clockwise',
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'donington',
      name: 'Donington Park',
      nodeId: 'uk-england',
      kind: 'road_circuit',
      lat: 52.8305,
      lng: -1.375,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'brands-hatch',
      name: 'Brands Hatch',
      nodeId: 'uk-england',
      kind: 'road_circuit',
      lat: 51.3567,
      lng: 0.2617,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'oulton-park',
      name: 'Oulton Park',
      nodeId: 'uk-england',
      kind: 'road_circuit',
      lat: 53.1803,
      lng: -2.6139,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'snetterton',
      name: 'Snetterton Circuit',
      nodeId: 'uk-england',
      kind: 'road_circuit',
      lat: 52.4636,
      lng: 0.9517,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'cadwell-park',
      name: 'Cadwell Park',
      nodeId: 'uk-england',
      kind: 'road_circuit',
      lat: 53.3106,
      lng: -0.0633,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'knockhill',
      name: 'Knockhill Racing Circuit',
      nodeId: 'uk-scotland',
      kind: 'road_circuit',
      lat: 56.1292,
      lng: -3.5036,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'anglesey',
      name: 'Anglesey Circuit (Trac Môn)',
      nodeId: 'uk-wales',
      kind: 'road_circuit',
      lat: 53.1917,
      lng: -4.5083,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
  ],
});

writeJson('uk', 'competitions/series.json', {
  series: [
    {
      id: 'bsb',
      name: 'Bennetts British Superbike Championship',
      nodeId: 'uk',
      local: true,
      website: 'https://www.britishsuperbike.com',
      confidence: 'official',
    },
    {
      id: 'uk_club',
      name: 'UK club road racing',
      nodeId: 'uk',
      local: true,
      confidence: 'community',
    },
    {
      id: 'isle_of_man_tt',
      name: 'Isle of Man TT',
      nodeId: 'uk',
      local: true,
      website: 'https://www.iomtt.com',
      confidence: 'official',
      notes: 'Crown Dependency event; often followed by UK riders.',
    },
  ],
});

writeJson('uk', 'headlines/sources.json', {
  sourceIds: ['mcn', 'bennetts'],
  sources: [
    {
      id: 'mcn',
      name: 'MCN',
      type: 'scraper',
      confidence: 'established-press',
      nodeId: 'uk',
    },
    {
      id: 'bennetts',
      name: 'Bennetts BikeSocial',
      type: 'scraper',
      confidence: 'established-press',
      nodeId: 'uk',
    },
  ],
});

writeJson('uk', 'news/sources.json', {
  sources: [
    {
      id: 'mcn-web',
      name: 'Motor Cycle News',
      url: 'https://www.motorcyclenews.com',
      confidence: 'established-press',
      nodeId: 'uk',
    },
    {
      id: 'bsb-news',
      name: 'British Superbike',
      url: 'https://www.britishsuperbike.com',
      confidence: 'official',
      nodeId: 'uk',
    },
    {
      id: 'bike-social',
      name: 'Bennetts BikeSocial',
      url: 'https://www.bennetts.co.uk/bikesocial',
      confidence: 'established-press',
      nodeId: 'uk',
    },
  ],
});

writeJson('uk', 'calendar/sources.json', {
  meta: {
    timezone: 'Europe/London',
    event_scope: { discipline: 'road_race' },
  },
  sources: [
    {
      id: 'bsb_calendar',
      name: 'BSB Calendar',
      type: 'series_calendar',
      url: 'https://www.britishsuperbike.com',
      nodeId: 'uk',
      confidence: 'official',
    },
    {
      id: 'acu_events',
      name: 'ACU Events',
      type: 'governing_body_calendar',
      url: 'https://www.acu.org.uk',
      nodeId: 'uk',
      confidence: 'official',
    },
  ],
});

writeJson('uk', 'licensing/pathways.json', {
  pathways: [
    {
      id: 'uk-acu-competition',
      title: 'ACU competition licence pathway',
      nodeId: 'uk-england',
      steps: [
        'Join an ACU-affiliated club',
        'Apply for appropriate ACU competition licence',
        'Complete any required training / medical checks',
      ],
      urls: ['https://www.acu.org.uk'],
      confidence: 'official',
    },
    {
      id: 'uk-sacu',
      title: 'SACU licence pathway (Scotland)',
      nodeId: 'uk-scotland',
      steps: ['Contact SACU / Scottish club for current road-race licence route'],
      urls: ['https://www.sacu.co.uk'],
      confidence: 'official',
    },
  ],
});

writeJson('uk', 'ai/prompts.json', {
  coachHomeContext:
    'You are an expert motorcycle road racing and track day coach specializing in UK track day and British road racing. Prefer British Superbike (BSB), ACU context, and UK circuits. Use British English (tyre, favour).',
  bikeSetupHomeContext:
    'You are an expert motorcycle road racing technical advisor for UK track days and BSB-style racing. Use British English (tyre).',
  askPriority:
    'Priority order: United Kingdom first (BSB, ACU, UK club racing, UK circuits), then world level (MotoGP, WorldSBK).',
  rulesModeName: 'ACU Standing Regulations / event regulations',
  rulesHomeContext:
    'For official UK rules, prefer ACU / event supplementary regulations. Do not invent clause numbers. Link out when in-app KB is incomplete.',
  webSearchCountry: 'GB',
  spellingLocale: 'en-GB',
  tyreSpelling: 'tyre',
});

writeJson('uk', 'i18n/strings.json', {
  locales: {
    'en-GB': {
      localFeed: 'UK headlines',
      localCalendar: 'United Kingdom',
      worldFeed: 'World',
    },
  },
});

writeJson('uk', 'rules/rulebook.json', {
  governingBody: 'Auto-Cycle Union',
  shortName: 'ACU',
  edition: null,
  urls: { sourcePage: 'https://www.acu.org.uk' },
  chapters: {},
  note: 'Seed: link-out to ACU standing regs; in-app KB not yet ingested.',
});

writeJson('uk', 'emergency.json', {
  contacts: [{ id: 'uk-999', name: 'Emergency services', phone: '999', nodeId: 'uk' }],
  notes: 'Follow circuit control / marshals. European emergency 112 also works in UK.',
});

writeJson('uk', 'weather/sources.json', {
  sources: [
    {
      id: 'metoffice',
      name: 'Met Office',
      url: 'https://www.metoffice.gov.uk',
      confidence: 'official',
      nodeId: 'uk',
    },
  ],
});

writeJson('uk', 'onboarding/areas.json', {
  areas: [
    {
      code: 'ENG',
      nodeId: 'uk-england',
      name: 'England',
      clubs: [
        {
          name: 'ACU-affiliated road race clubs',
          location: 'England',
          website: 'https://www.acu.org.uk',
        },
      ],
      classes: ['British Superbike support classes', 'Clubman / national classes'],
      coaches: [
        {
          name: 'Circuit / school coaching providers',
          description: 'Many UK circuits offer coach-led track days — check venue programmes.',
        },
      ],
    },
    {
      code: 'SCT',
      nodeId: 'uk-scotland',
      name: 'Scotland',
      clubs: [{ name: 'SACU-affiliated clubs', location: 'Scotland', website: 'https://www.sacu.co.uk' }],
      classes: ['Scottish championship / club road race classes'],
      coaches: [],
    },
    {
      code: 'WLS',
      nodeId: 'uk-wales',
      name: 'Wales',
      clubs: [{ name: 'Welsh / ACU centre clubs', location: 'Wales', website: 'https://www.acu.org.uk' }],
      classes: ['Club and national classes'],
      coaches: [],
    },
    {
      code: 'NIR',
      nodeId: 'uk-northern-ireland',
      name: 'Northern Ireland',
      clubs: [
        {
          name: 'MCUI / local road race clubs',
          location: 'Northern Ireland',
          website: 'https://www.mcui-uc.org.uk',
        },
      ],
      classes: ['Irish road racing / short circuit classes'],
      coaches: [],
    },
  ],
});

writeJson('uk', 'competitions/classes.json', {
  classes: [
    { id: 'bsb-superbike', name: 'British Superbike', nodeId: 'uk' },
    { id: 'supersport', name: 'Supersport', nodeId: 'uk' },
    { id: 'superstock', name: 'Superstock', nodeId: 'uk' },
    { id: 'clubman', name: 'Clubman / national', nodeId: 'uk' },
  ],
});

writeJson('uk', 'progression/pathways.json', {
  pathways: [
    {
      id: 'uk-trackday-bsb',
      title: 'Track day → club → BSB pathway',
      nodeId: 'uk',
      stages: ['Track days', 'Club racing', 'National / Superstock', 'BSB'],
      confidence: 'community',
    },
  ],
});

writeJson('uk', 'terminology.json', {
  terms: [
    { id: 'bsb', term: 'BSB', definition: 'British Superbike Championship', locale: 'en-GB' },
    { id: 'acu', term: 'ACU', definition: 'Auto-Cycle Union', locale: 'en-GB' },
  ],
});

setManifestStatus('uk', 'seed', {
  defaultLocalLabel: 'United Kingdom',
  spelling: { tyre: 'tyre', dateFormat: 'DD/MM/YYYY' },
});

// ——— Spain ———
writeJson('es', 'organisations/federations.json', {
  items: [
    {
      id: 'rfme',
      name: 'Real Federación Motociclista Española (RFME)',
      role: 'federation',
      nodeId: 'es',
      website: 'https://www.rfme.com',
      confidence: 'official',
    },
  ],
});

writeJson('es', 'tracks/tracks.json', {
  version: 1,
  tracks: [
    {
      id: 'jerez',
      name: 'Circuito de Jerez – Ángel Nieto',
      nodeId: 'es',
      kind: 'road_circuit',
      lat: 36.7083,
      lng: -6.0328,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'catalunya',
      name: 'Circuit de Barcelona-Catalunya',
      nodeId: 'es',
      kind: 'road_circuit',
      lat: 41.57,
      lng: 2.2611,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'valencia-ricardo-tormo',
      name: 'Circuit Ricardo Tormo (Valencia)',
      nodeId: 'es',
      kind: 'road_circuit',
      lat: 39.4897,
      lng: -0.6283,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'motorland-aragon',
      name: 'MotorLand Aragón',
      nodeId: 'es',
      kind: 'road_circuit',
      lat: 41.0783,
      lng: -0.2067,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'navarra',
      name: 'Circuito de Navarra',
      nodeId: 'es',
      kind: 'road_circuit',
      lat: 42.3294,
      lng: -1.8708,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'jarama',
      name: 'Circuito del Jarama',
      nodeId: 'es',
      kind: 'road_circuit',
      lat: 40.6172,
      lng: -3.5856,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
  ],
});

writeJson('es', 'competitions/series.json', {
  series: [
    {
      id: 'esbk',
      name: 'Campeonato de España de Superbike (ESBK)',
      nodeId: 'es',
      local: true,
      website: 'https://www.rfme.com',
      confidence: 'official',
    },
    {
      id: 'es_club',
      name: 'Spanish club / territorial road racing',
      nodeId: 'es',
      local: true,
      confidence: 'community',
    },
  ],
});

writeJson('es', 'headlines/sources.json', {
  sourceIds: [],
  sources: [],
  notes: 'Seed: no dedicated in-app scrapers yet; use news/sources for research shortlist.',
});

writeJson('es', 'news/sources.json', {
  sources: [
    {
      id: 'rfme-news',
      name: 'RFME',
      url: 'https://www.rfme.com',
      confidence: 'official',
      nodeId: 'es',
    },
    {
      id: 'motociclismo',
      name: 'Motociclismo',
      url: 'https://www.motociclismo.es',
      confidence: 'established-press',
      nodeId: 'es',
    },
    {
      id: 'solo-moto',
      name: 'Solo Moto',
      url: 'https://www.solomoto.es',
      confidence: 'established-press',
      nodeId: 'es',
    },
  ],
});

writeJson('es', 'calendar/sources.json', {
  meta: { timezone: 'Europe/Madrid', event_scope: { discipline: 'road_race' } },
  sources: [
    {
      id: 'rfme_calendar',
      name: 'RFME calendar',
      type: 'governing_body_calendar',
      url: 'https://www.rfme.com',
      nodeId: 'es',
      confidence: 'official',
    },
  ],
});

writeJson('es', 'licensing/pathways.json', {
  pathways: [
    {
      id: 'es-rfme',
      title: 'RFME competition licence pathway',
      nodeId: 'es',
      steps: [
        'Affiliate with a club recognised by RFME / territorial federation',
        'Obtain RFME licence appropriate to road racing category',
        'Meet medical and equipment requirements',
      ],
      urls: ['https://www.rfme.com'],
      confidence: 'official',
    },
  ],
});

writeJson('es', 'ai/prompts.json', {
  coachHomeContext:
    'You are an expert motorcycle road racing and track day coach specializing in Spanish circuits and RFME / ESBK context. Prefer Spanish venues (Jerez, Catalunya, Valencia, Aragón). Spanish or English answers OK; use tyre spelling in EN.',
  bikeSetupHomeContext:
    'You are an expert motorcycle setup advisor for Spanish track days and national road racing.',
  askPriority:
    'Priority order: Spain first (RFME, ESBK, Spanish circuits), then world championships (MotoGP, WorldSBK).',
  rulesModeName: 'RFME regulations',
  rulesHomeContext:
    'For official Spanish rules, prefer RFME / territorial federation regulations. Do not invent clause numbers.',
  webSearchCountry: 'ES',
  spellingLocale: 'es-ES',
  tyreSpelling: 'tyre',
});

writeJson('es', 'i18n/strings.json', {
  locales: {
    'es-ES': {
      localFeed: 'Noticias España',
      localCalendar: 'España',
      worldFeed: 'Mundo',
    },
    en: {
      localFeed: 'Spain headlines',
      localCalendar: 'Spain',
      worldFeed: 'World',
    },
  },
});

writeJson('es', 'rules/rulebook.json', {
  governingBody: 'RFME',
  shortName: 'RFME',
  urls: { sourcePage: 'https://www.rfme.com' },
  chapters: {},
  note: 'Seed: link-out; in-app rules KB not ingested.',
});

writeJson('es', 'emergency.json', {
  contacts: [{ id: 'es-112', name: 'Emergency services', phone: '112', nodeId: 'es' }],
  notes: 'Follow circuit medical / race control procedures.',
});

writeJson('es', 'weather/sources.json', {
  sources: [
    {
      id: 'aemet',
      name: 'AEMET',
      url: 'https://www.aemet.es',
      confidence: 'official',
      nodeId: 'es',
    },
  ],
});

writeJson('es', 'onboarding/areas.json', {
  areas: [
    {
      code: 'ES',
      nodeId: 'es',
      name: 'Spain',
      clubs: [
        {
          name: 'RFME-affiliated clubs',
          location: 'Spain',
          website: 'https://www.rfme.com',
        },
      ],
      classes: ['ESBK Superbike / Supersport', 'Territorial championships', 'Track days'],
      coaches: [
        {
          name: 'Circuit rider schools',
          description: 'Many Spanish GP circuits host escuela / track-day coaching programmes.',
        },
      ],
    },
  ],
});

writeJson('es', 'competitions/classes.json', {
  classes: [
    { id: 'superbike', name: 'Superbike', nodeId: 'es' },
    { id: 'supersport', name: 'Supersport', nodeId: 'es' },
    { id: 'stock', name: 'Stock / production', nodeId: 'es' },
  ],
});

writeJson('es', 'progression/pathways.json', {
  pathways: [
    {
      id: 'es-track-esbk',
      title: 'Track day → territorial → ESBK',
      nodeId: 'es',
      stages: ['Track days', 'Territorial racing', 'ESBK'],
      confidence: 'community',
    },
  ],
});

writeJson('es', 'terminology.json', {
  terms: [
    { id: 'rfme', term: 'RFME', definition: 'Real Federación Motociclista Española', locale: 'es-ES' },
    { id: 'esbk', term: 'ESBK', definition: 'Campeonato de España de Superbike', locale: 'es-ES' },
  ],
});

setManifestStatus('es', 'seed', {
  defaultLocalLabel: 'Spain',
  spelling: { tyre: 'tyre', dateFormat: 'DD/MM/YYYY' },
});

// ——— Italy ———
writeJson('it', 'organisations/federations.json', {
  items: [
    {
      id: 'fmi',
      name: 'Federazione Motociclistica Italiana (FMI)',
      role: 'federation',
      nodeId: 'it',
      website: 'https://www.federmoto.it',
      confidence: 'official',
    },
  ],
});

writeJson('it', 'tracks/tracks.json', {
  version: 1,
  tracks: [
    {
      id: 'mugello',
      name: 'Autodromo Internazionale del Mugello',
      nodeId: 'it',
      kind: 'road_circuit',
      lat: 43.9975,
      lng: 11.3719,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'misano',
      name: 'Misano World Circuit Marco Simoncelli',
      nodeId: 'it',
      kind: 'road_circuit',
      lat: 43.9614,
      lng: 12.6833,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'monza',
      name: 'Autodromo Nazionale Monza',
      nodeId: 'it',
      kind: 'road_circuit',
      lat: 45.6156,
      lng: 9.2811,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'imola',
      name: 'Autodromo Enzo e Dino Ferrari (Imola)',
      nodeId: 'it',
      kind: 'road_circuit',
      lat: 44.3439,
      lng: 11.7167,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
    {
      id: 'cremona',
      name: 'Cremona Circuit',
      nodeId: 'it',
      kind: 'road_circuit',
      lat: 45.085,
      lng: 10.116,
      corners: [],
      isOther: false,
      confidence: 'community',
    },
    {
      id: 'vallelunga',
      name: 'Autodromo Vallelunga',
      nodeId: 'it',
      kind: 'road_circuit',
      lat: 42.1589,
      lng: 12.3889,
      corners: [],
      isOther: false,
      confidence: 'official',
    },
  ],
});

writeJson('it', 'competitions/series.json', {
  series: [
    {
      id: 'civ',
      name: 'Campionato Italiano Velocità (CIV)',
      nodeId: 'it',
      local: true,
      website: 'https://www.civ.tv',
      confidence: 'official',
    },
    {
      id: 'it_club',
      name: 'Italian club / regional road racing',
      nodeId: 'it',
      local: true,
      confidence: 'community',
    },
  ],
});

writeJson('it', 'headlines/sources.json', {
  sourceIds: ['gpone'],
  sources: [
    {
      id: 'gpone',
      name: 'GPone',
      type: 'scraper',
      confidence: 'established-press',
      nodeId: 'it',
    },
  ],
});

writeJson('it', 'news/sources.json', {
  sources: [
    {
      id: 'fmi-news',
      name: 'FMI',
      url: 'https://www.federmoto.it',
      confidence: 'official',
      nodeId: 'it',
    },
    {
      id: 'gpone-web',
      name: 'GPone',
      url: 'https://www.gpone.com',
      confidence: 'established-press',
      nodeId: 'it',
    },
    {
      id: 'civ-news',
      name: 'CIV',
      url: 'https://www.civ.tv',
      confidence: 'official',
      nodeId: 'it',
    },
  ],
});

writeJson('it', 'calendar/sources.json', {
  meta: { timezone: 'Europe/Rome', event_scope: { discipline: 'road_race' } },
  sources: [
    {
      id: 'civ_calendar',
      name: 'CIV Calendar',
      type: 'series_calendar',
      url: 'https://www.civ.tv',
      nodeId: 'it',
      confidence: 'official',
    },
    {
      id: 'fmi_calendar',
      name: 'FMI events',
      type: 'governing_body_calendar',
      url: 'https://www.federmoto.it',
      nodeId: 'it',
      confidence: 'official',
    },
  ],
});

writeJson('it', 'licensing/pathways.json', {
  pathways: [
    {
      id: 'it-fmi',
      title: 'FMI competition licence pathway',
      nodeId: 'it',
      steps: [
        'Join an FMI-affiliated motorcycle club (Moto Club)',
        'Obtain FMI licence for velocità / road racing category',
        'Complete medical certificate and equipment checks',
      ],
      urls: ['https://www.federmoto.it'],
      confidence: 'official',
    },
  ],
});

writeJson('it', 'ai/prompts.json', {
  coachHomeContext:
    'You are an expert motorcycle road racing and track day coach specializing in Italian circuits and FMI / CIV context. Prefer Mugello, Misano, Imola, Monza. Italian or English answers OK.',
  bikeSetupHomeContext:
    'You are an expert motorcycle setup advisor for Italian track days and CIV-style racing.',
  askPriority:
    'Priority order: Italy first (FMI, CIV, Italian circuits), then world championships (MotoGP, WorldSBK).',
  rulesModeName: 'FMI regulations',
  rulesHomeContext:
    'For official Italian rules, prefer FMI regulations and event supplementary regs. Do not invent clause numbers.',
  webSearchCountry: 'IT',
  spellingLocale: 'it-IT',
  tyreSpelling: 'tyre',
});

writeJson('it', 'i18n/strings.json', {
  locales: {
    'it-IT': {
      localFeed: 'Notizie Italia',
      localCalendar: 'Italia',
      worldFeed: 'Mondo',
    },
    en: {
      localFeed: 'Italy headlines',
      localCalendar: 'Italy',
      worldFeed: 'World',
    },
  },
});

writeJson('it', 'rules/rulebook.json', {
  governingBody: 'Federazione Motociclistica Italiana',
  shortName: 'FMI',
  urls: { sourcePage: 'https://www.federmoto.it' },
  chapters: {},
  note: 'Seed: link-out; in-app rules KB not ingested.',
});

writeJson('it', 'emergency.json', {
  contacts: [{ id: 'it-112', name: 'Emergency services', phone: '112', nodeId: 'it' }],
  notes: 'Follow circuit medical / direzione gara procedures.',
});

writeJson('it', 'weather/sources.json', {
  sources: [
    {
      id: 'meteo-it',
      name: 'Meteo Aeronautica / national forecasts',
      url: 'https://www.meteoam.it',
      confidence: 'official',
      nodeId: 'it',
    },
  ],
});

writeJson('it', 'onboarding/areas.json', {
  areas: [
    {
      code: 'IT',
      nodeId: 'it',
      name: 'Italy',
      clubs: [
        {
          name: 'FMI Moto Clubs',
          location: 'Italy',
          website: 'https://www.federmoto.it',
        },
      ],
      classes: ['CIV Superbike / Supersport', 'Regional velocità', 'Track days'],
      coaches: [
        {
          name: 'Piste / riding school providers',
          description: 'Italian circuits commonly host scuole di guida and coach-led sessions.',
        },
      ],
    },
  ],
});

writeJson('it', 'competitions/classes.json', {
  classes: [
    { id: 'superbike', name: 'Superbike', nodeId: 'it' },
    { id: 'supersport', name: 'Supersport', nodeId: 'it' },
    { id: 'stock', name: 'Stock / production', nodeId: 'it' },
  ],
});

writeJson('it', 'progression/pathways.json', {
  pathways: [
    {
      id: 'it-track-civ',
      title: 'Track day → regional → CIV',
      nodeId: 'it',
      stages: ['Track days', 'Regional racing', 'CIV'],
      confidence: 'community',
    },
  ],
});

writeJson('it', 'terminology.json', {
  terms: [
    { id: 'fmi', term: 'FMI', definition: 'Federazione Motociclistica Italiana', locale: 'it-IT' },
    { id: 'civ', term: 'CIV', definition: 'Campionato Italiano Velocità', locale: 'it-IT' },
  ],
});

setManifestStatus('it', 'seed', {
  defaultLocalLabel: 'Italy',
  spelling: { tyre: 'tyre', dateFormat: 'DD/MM/YYYY' },
});

console.log('seed-pilot-packs complete');
