/**
 * Fun / motivational facts for favourite riders and bikes.
 * Match is case-insensitive and by substring for flexibility.
 */

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function matchRider(input: string, names: string[]): boolean {
  const n = normalize(input);
  return names.some((name) => n.includes(normalize(name)) || normalize(name).includes(n));
}

function matchBike(input: string, terms: string[]): boolean {
  const n = normalize(input);
  return terms.some((t) => n.includes(normalize(t)) || normalize(t).includes(n));
}

const RIDER_FACTS: { names: string[]; fact: string }[] = [
  {
    names: ['valentino', 'rossi', 'the doctor'],
    fact: "Valentino Rossi didn't just win — he made millions want to ride. Also, he once dressed as a chicken to celebrate a bet. You're in good company.",
  },
  {
    names: ['marc', 'márquez', 'marquez', 'marquez'],
    fact: "Marc Márquez has a habit of winning titles and making impossible saves look easy. If you ever thought 'how did he do that?' — you're not alone.",
  },
  {
    names: ['casey', 'stoner'],
    fact: "Casey Stoner left the sport on his own terms and still makes pundits say 'what if.' Respect. You picked a rider who did it his way.",
  },
  {
    names: ['jorge', 'lorenzo'],
    fact: "Jorge Lorenzo was so smooth they called him 'Por Fuera' — and his helmet designs were art. Style and speed: you've got taste.",
  },
  {
    names: ['max', 'biaggi'],
    fact: "Max Biaggi had more personality per square inch than most grids. The Roman Emperor didn't just race — he entertained. Legend.",
  },
  {
    names: ['troy', 'bayliss'],
    fact: "Troy Bayliss came from a shed in Taree and won WSBK. If that doesn't say 'just send it,' nothing does. Aussie legend.",
  },
  {
    names: ['jonathan', 'rea', 'rea'],
    fact: "Jonathan Rea rewrote the WSBK record books. Six titles in a row. He's the kind of rider who makes 'impossible' look like Tuesday.",
  },
  {
    names: ['toprak', 'razgatlioglu'],
    fact: "Toprak Razgatlıoğlu does things on a bike that make physicists nervous. If he's your favourite, you clearly like sending it.",
  },
  {
    names: ['alvaro', 'bautista'],
    fact: "Álvaro Bautista came back to WSBK and decided to win everything. Late bloomer? More like 'when it's your time, send it.'",
  },
  {
    names: ['jack', 'miller'],
    fact: "Jack Miller is the kind of guy who'd say 'just send it' in an interview and then actually do it. You've got a good one.",
  },
  {
    names: ['pecco', 'baggia', 'bagnaia', 'francisco'],
    fact: "Pecco Bagnaia turned Ducati into a title machine. Smooth, smart, and when it's time — he sends it. MotoGP royalty.",
  },
  {
    names: ['fabio', 'quartararo'],
    fact: "Fabio Quartararo made Yamaha cool again and did it with style. El Diablo doesn't overthink — he just goes. Your kind of rider.",
  },
];

const BIKE_FACTS: { terms: string[]; fact: string }[] = [
  {
    terms: ['ducati', 'panigale', 'v4', 'v2'],
    fact: "Ducati Panigale: the bike that sounds like an argument and goes like a missile. You don't choose the Panigale life — it chooses you.",
  },
  {
    terms: ['yamaha', 'r1', 'yzf-r1', 'crossplane'],
    fact: "Yamaha R1: that crossplane howl and the feeling that the front end is reading your mind. One of the greats. No notes.",
  },
  {
    terms: ['kawasaki', 'ninja', 'zx-10r', 'zx10'],
    fact: "Kawasaki Ninja ZX-10R: green meanie. WSBK has a lot to thank this bike for. If you love the Ninja, you love winning.",
  },
  {
    terms: ['honda', 'cbr', 'fireblade', 'rc213v'],
    fact: "Honda CBR / Fireblade: 'The Blade' has been cutting through corners for decades. HRC DNA in a road bike. Classic choice.",
  },
  {
    terms: ['suzuki', 'gsx-r', 'gsxr', 'hayabusa'],
    fact: "Suzuki GSX-R: the original litre-bike hero. Light, flickable, and still making riders grin. Understated excellence.",
  },
  {
    terms: ['bmw', 's1000rr', 's1000'],
    fact: "BMW S1000RR: asymmetric headlights and serious power. The Germans decided to build a superbike. They succeeded.",
  },
  {
    terms: ['aprilia', 'rsv4', 'tuono'],
    fact: "Aprilia RSV4 / Tuono: V4 symphony and Italian attitude. If you picked Aprilia, you don't do boring. We approve.",
  },
  {
    terms: ['mv agusta', 'mv augusta', 'brutale', 'dragster'],
    fact: "MV Agusta: art on two wheels. They don't make many, and they don't need to. You've got rare taste.",
  },
  {
    terms: ['triumph', 'speed triple', 'daytona', 'street triple'],
    fact: "Triumph Triple: that exhaust note. British character and enough torque to make corners optional. Solid choice.",
  },
  {
    terms: ['ktm', 'rc8', 'super duke', '1290'],
    fact: "KTM: ready to race, from the tarmac to the dirt. Orange and unapologetic. You clearly like a bit of chaos.",
  },
];

const DEFAULT_RIDER_FACT =
  "Your favourite rider is the one who makes you want to ride. That's the only fact that matters — and it's a good one.";

const DEFAULT_BIKE_FACT =
  "Your favourite bike is the one you think about when you're not riding. That's not a small thing — that's the dream. Keep it close.";

export function getRiderFact(riderName: string): string {
  if (!riderName) return DEFAULT_RIDER_FACT;
  const found = RIDER_FACTS.find((r) => matchRider(riderName, r.names));
  return found ? found.fact : DEFAULT_RIDER_FACT;
}

export function getBikeFact(bikeName: string): string {
  if (!bikeName) return DEFAULT_BIKE_FACT;
  const found = BIKE_FACTS.find((b) => matchBike(bikeName, b.terms));
  return found ? found.fact : DEFAULT_BIKE_FACT;
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
