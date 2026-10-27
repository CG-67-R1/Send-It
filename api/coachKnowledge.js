/**
 * Track notes and tyre rules added to Coach / Bike Setup prompts.
 * Track hands are copied from api/data/coach-track-notes.json. Missing hands stay missing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const NOTES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'coach-track-notes.json');

const WEAK_LAYOUT = new Set(['west', 'east', 'gt']);
const TYRE_PATTERN =
  /\b(tyre|tire|pressure|pressures|psi|bar|wear|compound|slick|slicks|cold|hot|grip|tear)\b/i;

let cached = null;

function loadTracks() {
  if (cached) return cached;
  try {
    cached = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')).tracks || [];
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('coach track notes load error:', err.message);
    cached = [];
  }
  return cached;
}

const FAQ_STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'from', 'at', 'my', 'me',
  'i', 'is', 'it', 'do', 'can', 'you', 'your', 'how', 'what', 'why', 'this', 'that', 'have',
  'about', 'when', 'just', 'more', 'into', 'over', 'help', 'please', 'track', 'bike', 'riding',
]);

function faqTokens(text) {
  return [...new Set(normalize(text).split(' ').filter((word) => word.length > 2 && !FAQ_STOP.has(word)))];
}

function scoreFaq(item, tokens) {
  const question = normalize(item.question);
  const answer = normalize(item.answer);
  let score = 0;
  for (const token of tokens) {
    if (question.includes(token)) score += 2;
    else if (answer.includes(token)) score += 1;
  }
  return score;
}

export function selectFaqs(items, query, limit = 3) {
  const tokens = faqTokens(query);
  if (!tokens.length || !items?.length) return [];
  return items
    .map((item) => ({ item, score: scoreFaq(item, tokens) }))
    .filter((row) => row.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.item);
}

/** Related notes already written in the rider FAQs. Ids point at those notes. */
const SYMPTOM_LINKS = [
  {
    pattern: /run(?:ning|s)? wide|wide on (?:the )?exit/,
    coach: ['coach_003', 'coach_008', 'coach_006', 'coach_009'],
    setup: ['bikesetup_009', 'bikesetup_005'],
    spansBoth: true,
    drill:
      'Do this: one corner, one turn-in point, the same brake release. Judge the session on whether the exit repeats, not on lap time. If that is already repeatable and it still runs wide, finish the turn before driving. Leave the chassis alone until the line and throttle repeat.',
  },
  {
    pattern: /apex/,
    coach: ['coach_007', 'coach_005', 'coach_009'],
    setup: [],
    spansBoth: false,
    drill:
      'Do this: pick one corner and one reference for turn-in. Hit that same point for the session. Say whether the miss is early, late, inside, or outside before adding anything else.',
  },
  {
    pattern: /trail brak|brake release|braking/,
    coach: ['coach_006', 'coach_004', 'coach_005'],
    setup: ['bikesetup_010'],
    spansBoth: true,
    drill:
      'Do this: one fixed brake marker. Judge the session on repeating the release, not on lap time. Trail braking here means letting the brake off while the bike turns. Do not push a novice into it before the marker and the release are repeatable. If the front feels vague, pressure comes before a clicker.',
  },
  {
    pattern: /throttle|exit drive|pickup/,
    coach: ['coach_008', 'coach_003'],
    setup: ['bikesetup_009', 'bikesetup_005'],
    spansBoth: true,
    drill:
      'Do this: on one corner, finish turning before strong drive, then roll on as the bike stands up. Separate early throttle, a sudden roll-on, and throttle before the bike is pointed. Do not change geometry until that is repeatable.',
  },
  {
    pattern: /body position|bar pressure|tense arm/,
    coach: ['coach_009', 'coach_011'],
    setup: [],
    spansBoth: false,
    drill:
      'Do this: one corner. Notice bar pressure and whether the line is early. Body position and line are different. Without a video, say the confidence is low and do not prescribe a riding position in detail.',
  },
  {
    pattern: /vague|push(?:es|ing)?|mid-?corner|understeer/,
    coach: ['coach_005', 'coach_006', 'coach_019'],
    setup: ['bikesetup_010', 'bikesetup_005', 'bikesetup_006'],
    spansBoth: true,
    drill:
      'Do this: write down the front hot pressure and where it happens, entry or mid-corner. Check pressure, temperature, and entry speed before a chassis change. One cause only.',
  },
  {
    pattern: /tear(?:ing)?|tyre wear|tire wear/,
    coach: ['coach_008'],
    setup: ['bikesetup_008', 'bikesetup_004', 'bikesetup_006', 'bikesetup_005'],
    spansBoth: true,
    drill:
      'Do this: hot pressure immediately after pit-in, then compound and throttle timing, then suspension. Do not call a photo cold tear from the word shredded. One change, then look at the tyre again.',
  },
  {
    pattern: /\bsag\b|ride height|spring rate/,
    coach: ['coach_019'],
    setup: ['bikesetup_002', 'bikesetup_011', 'bikesetup_017'],
    spansBoth: true,
    drill:
      'Do this: measure static sag and rider sag before a spring or ride-height change. If the complaint is the line or the throttle, that belongs in Coach. A leaking shock, unknown spring, or a change that does not behave logically needs a technician.',
  },
  {
    pattern: /clicker|rebound|compression|damping/,
    coach: ['coach_019'],
    setup: ['bikesetup_011', 'bikesetup_006', 'bikesetup_012'],
    spansBoth: true,
    drill:
      'Do this: write the current click and the hot pressure first. No clicker until pressure, temperature, and what the rider did are known. One direction only, then the next session.',
  },
  {
    pattern: /compound|softer|harder/,
    coach: [],
    setup: ['bikesetup_007', 'bikesetup_006', 'bikesetup_019'],
    spansBoth: false,
    drill:
      'Do this: brand, compound, track temperature, and the wear. Do not assume a softer tyre has more grip. Do not invent a pressure.',
  },
  {
    pattern: /\bslide\b|near-crash|rear spin|highside|high side/,
    coach: ['coach_010', 'coach_008', 'coach_019'],
    setup: ['bikesetup_005', 'bikesetup_008'],
    spansBoth: true,
    drill:
      'Do this: one slower, repeatable input on the same corner. Do not tell the rider to push. If the tyre is tearing or the hot pressure is unknown, that check comes before another riding drill.',
  },
  {
    pattern: /cold track|hot track|\bweather\b|raining|drying|warmer/,
    coach: [],
    setup: ['bikesetup_019', 'bikesetup_006', 'bikesetup_007'],
    spansBoth: false,
    drill:
      'Do this: ambient, track temperature, and the hot pressure just after pit-in. Weather changes the window. Do not invent a pressure.',
  },
];

function sameNote(a, b) {
  if (a?.id && b?.id) return a.id === b.id;
  return a?.question === b?.question;
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function takeIds(items, ids, limit) {
  const map = byId(items);
  const picked = [];
  for (const id of ids) {
    const item = map.get(id);
    if (!item || picked.some((row) => row.id === id)) continue;
    picked.push(item);
    if (picked.length >= limit) break;
  }
  return picked;
}

/**
 * Notes for this mode, plus the other mode when the same symptom can be riding or the bike.
 * @param {{ coach?: object[], bikesetup?: object[] }} faqs
 * @param {'coach' | 'bikesetup'} mode
 * @param {string} query
 * @param {string} [packId]
 */
export function adviceForQuery(faqs, mode, query, packId = 'au') {
  const primaryItems = mode === 'bikesetup' ? faqs.bikesetup : faqs.coach;
  const otherItems = mode === 'bikesetup' ? faqs.coach : faqs.bikesetup;
  const link = SYMPTOM_LINKS.find((row) => row.pattern.test(query || ''));
  const wanted = link ? (mode === 'bikesetup' ? link.setup : link.coach) : [];
  const primary = takeIds(primaryItems, wanted, 4);
  for (const item of selectFaqs(primaryItems, query, 3)) {
    if (primary.length >= 4) break;
    if (!primary.some((row) => sameNote(row, item))) primary.push(item);
  }
  const other = link?.spansBoth
    ? takeIds(otherItems, mode === 'bikesetup' ? link.coach : link.setup, 2)
    : [];
  const country = packId === 'uk' ? 'UK' : 'Australian';
  const localize = (item) => {
    if (item.id !== 'coach_015' && item.id !== 'bikesetup_018') return item;
    const swap = (text) => String(text || '').replaceAll('Australian', country);
    return { ...item, question: swap(item.question), answer: swap(item.answer) };
  };
  return {
    primary: primary.map(localize),
    other: other.map(localize),
    spansBoth: Boolean(link?.spansBoth),
    drill: link?.drill || '',
  };
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasPhrase(text, phrase) {
  const needle = normalize(phrase);
  if (!needle) return false;
  if (needle.includes(' ')) return ` ${text} `.includes(` ${needle} `);
  return new RegExp(`\\b${needle}\\b`).test(text);
}

function formatTurns(turns) {
  if (!turns.length) return 'No verified left or right is in the notes. Do not guess a hand.';
  const lines = turns.map((turn) => {
    const name = turn.label ? ` ${turn.label}` : '';
    return `T${turn.n} ${turn.hand}${name}`;
  });
  return lines.join('. ');
}

function formatEntry(entry) {
  const place = entry.layout ? `${entry.venue}, ${entry.layout}` : entry.venue;
  const facts = [
    entry.lengthKm ? `${entry.lengthKm} km` : '',
    entry.turnCount ? `${entry.turnCount} turns` : '',
    entry.direction || '',
  ]
    .filter(Boolean)
    .join(', ');
  const lines = [`Track notes for ${place}${facts ? ` (${facts})` : ''}. Use only these hands.`];
  lines.push(formatTurns(entry.turns));
  if (entry.bias) lines.push(`Coaching bias only, not turn direction: ${entry.bias}.`);
  return lines.join('\n');
}

/**
 * @param {string} query
 * @param {string} [packId]
 * @returns {string}
 */
export function trackNotesForQuery(query, packId = 'au') {
  const text = normalize(query);
  if (!text) return '';
  const tracks = loadTracks();
  const preferred = packId === 'uk' ? 'uk' : 'au';

  const venueHits = tracks.filter((track) => track.match.some((phrase) => hasPhrase(text, phrase)));
  const layoutHits = tracks.filter((track) => {
    const tokens = track.layoutMatch.filter((token) => token.length >= 4 && hasPhrase(text, token));
    if (!tokens.length) return false;
    if (tokens.every((token) => WEAK_LAYOUT.has(token))) {
      return track.match.some((name) => hasPhrase(text, name));
    }
    return true;
  });

  let pool = layoutHits.length ? layoutHits : venueHits;
  if (!pool.length) return '';

  pool = pool.filter((track) => track.pack === preferred);
  if (!pool.length) return '';

  const groups = new Set(pool.map((track) => track.group));
  if (groups.size > 1) {
    const names = [...new Set(pool.map((track) => track.venue))];
    return `More than one circuit matches. Ask which one: ${names.join(', ')}. Do not guess turn hands.`;
  }

  const group = pool[0].group;
  const layouts = tracks.filter((track) => track.group === group && track.pack === pool[0].pack);
  const namedLayout = layouts.filter((track) =>
    track.layoutMatch.some((token) => hasPhrase(text, token))
  );
  if (layouts.length > 1 && !namedLayout.length) {
    const names = layouts.map((track) => track.layout).filter(Boolean);
    return `${layouts[0].venue} has more than one layout in the notes: ${names.join(', ')}. Ask which layout. Do not guess turn hands.`;
  }

  return formatEntry((namedLayout[0] || pool[0]));
}

/**
 * @param {string} query
 * @param {boolean} [hasImage]
 * @returns {string}
 */
export function tyreNotesForQuery(query, hasImage = false) {
  if (!hasImage && !TYRE_PATTERN.test(query || '')) return '';
  const lines = [
    'Tyre notes: do not invent a pressure, compound, or cold-tear call.',
    'Order is pressure, then temperature and conditions, then compound, then rider, then suspension, then geometry.',
    'A number is allowed only when the rider stated it or it is written in these notes. These notes have no pressure table.',
  ];
  if (hasImage) {
    lines.push(
      'Photo reply, and nothing more unless they ask for technical detail: Call. Why, one line. Do this. Then ask if they want the technical detail.'
    );
  }
  return lines.join('\n');
}

/**
 * @param {{ query: string, packId?: string, hasImage?: boolean }} input
 * @returns {string}
 */
export function coachEvidenceBlock(input) {
  const parts = [
    tyreNotesForQuery(input.query, input.hasImage),
    trackNotesForQuery(input.query, input.packId),
  ].filter(Boolean);
  if (!parts.length) return '';
  return `\n\nUse these notes when they apply. If a fact is not here and the rider did not say it, say so and ask.\n${parts.join('\n\n')}`;
}
