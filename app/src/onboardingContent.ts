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
