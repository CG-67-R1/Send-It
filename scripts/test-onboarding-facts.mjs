/**
 * Smoke checks for onboarding rider/bike fact matching.
 * Run from repo root: node scripts/test-onboarding-facts.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const riders = JSON.parse(readFileSync(join(root, 'app/src/data/onboardingRiders.json'), 'utf8'));
const bikes = JSON.parse(readFileSync(join(root, 'app/src/data/onboardingBikes.json'), 'utf8'));

const MIN_SUBSTRING_ALIAS_LEN = 3;

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s+]/g, ' ')
    .replace(/\s+/g, ' ');
}

function bestBlurb(input, entries) {
  const n = normalize(input);
  if (!n) return null;
  let bestScore = -1;
  let best = null;
  for (const entry of entries) {
    if (entry.active === false) continue;
    for (const alias of entry.aliases) {
      const a = normalize(alias);
      if (!a) continue;
      let score = -1;
      if (n === a) score = 1000 + a.length;
      else if (a.length >= MIN_SUBSTRING_ALIAS_LEN && n.includes(a)) score = 500 + a.length * 10;
      else if (a.length >= MIN_SUBSTRING_ALIAS_LEN && n.length >= 4 && a.includes(n))
        score = 200 + n.length * 10;
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
  }
  return best;
}

const DEFAULT_RIDER = 'want to ride';
const UNKNOWN_RIDER = 'Solid pick — every favourite rider';
const DEFAULT_BIKE = 'think about when';
const UNKNOWN_BIKE = "that bike's got stories";

function riderFact(name) {
  if (!name.trim()) return DEFAULT_RIDER;
  const hit = bestBlurb(name, riders);
  return hit ? hit.blurb : UNKNOWN_RIDER;
}

function bikeFact(name) {
  if (!name.trim()) return DEFAULT_BIKE;
  const hit = bestBlurb(name, bikes);
  return hit ? hit.blurb : UNKNOWN_BIKE;
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}

assert(riders.length >= 40, `rider catalog size ${riders.length} >= 40`);
assert(bikes.length >= 35, `bike catalog size ${bikes.length} >= 35`);

const cases = [
  ['rider', 'Rossi', 'Valentino Rossi'],
  ['rider', 'The Doctor', 'Valentino Rossi'],
  ['rider', 'Bayliss', 'Troy Bayliss'],
  ['rider', 'Jonathan Rea', 'Jonathan Rea'],
  ['rider', 'Doohan', 'Mick Doohan'],
  ['rider', 'Foggy', 'Carl Fogarty'],
  ['rider', 'Remy Gardner', 'Remy Gardner'],
  ['rider', 'Broc Parkes', 'Broc Parkes'],
  ['rider', 'Joey Dunlop', 'Joey Dunlop'],
  ['rider', 'McGuinness', 'John McGuinness'],
  ['rider', 'Shakey', 'Shane Byrne'],
  ['rider', 'Josh Brookes', 'Josh Brookes'],
  ['rider', 'Mat Mladin', 'Mat Mladin'],
  ['rider', 'Ben Spies', 'Ben Spies'],
  ['rider', 'Cameron Beaubier', 'Cameron Beaubier'],
  ['rider', 'Ai Ogura', 'Ai Ogura'],
  ['rider', 'Joe Roberts', 'Joe Roberts'],
  ['rider', 'Senna Agius', 'Senna Agius'],
  ['rider', 'Bryan Staring', 'Bryan Staring'],
  ['rider', 'David Alonso', 'David Alonso'],
  ['rider', 'Danny Kent', 'Danny Kent'],
  ['rider', 'José Antonio Rueda', 'José Antonio Rueda'],
  ['rider', 'Can Öncü', 'Can Öncü'],
  ['rider', 'Brian Uriarte', 'Brian Uriarte'],
  ['rider', 'Sandro Cortese', 'Sandro Cortese'],
  ['rider', 'Guy Martin', 'Guy Martin'],
  ['rider', 'Norick Abe', 'Norick Abe'],
  ['rider', 'Nitro Nori', 'Noriyuki Haga'],
  ['rider', 'Sete Gibernau', 'Sete Gibernau'],
  ['rider', 'Garry McCoy', 'Garry McCoy'],
  ['rider', 'Barry Sheene', 'Barry Sheene'],
  ['rider', 'Sheene', 'Barry Sheene'],
  ['rider', 'Kenan Sofuoğlu', 'Kenan Sofuoğlu'],
  ['rider', 'Takumi Takahashi', 'Takumi Takahashi'],
  ['rider', 'Steve Hislop', 'Steve Hislop'],
  ['rider', 'Hizzy', 'Steve Hislop'],
  ['rider', 'Marco Simoncelli', 'Marco Simoncelli'],
  ['rider', 'Geoff Duke', 'Geoff Duke'],
  ['bike', '916', 'Ducati 916'],
  ['bike', 'Britten', 'Britten V1000'],
  ['bike', 'Norton Manx', 'Norton Manx'],
  ['bike', 'Commando', 'Norton Commando'],
  ['bike', 'Fireblade', 'Fireblade'],
  ['bike', 'CB750', 'CB750'],
  ['bike', 'Hayabusa', 'Hayabusa'],
  ['bike', 'R1', 'Yamaha'],
  ['bike', 'R3', 'R3'],
  ['bike', 'Ninja H2', 'Ninja H2'],
];

for (const [kind, input, expectSnippet] of cases) {
  const text = kind === 'rider' ? riderFact(input) : bikeFact(input);
  const hit = kind === 'rider' ? bestBlurb(input, riders) : bestBlurb(input, bikes);
  assert(
    text.includes(expectSnippet) || (hit && hit.displayName.includes(expectSnippet.split(' ')[0])),
    `${kind} "${input}" → contains/matches "${expectSnippet}" (got: ${(hit && hit.displayName) || text.slice(0, 60)})`
  );
}

assert(riderFact('').includes('want to ride') || riderFact('').includes('favourite rider'), 'empty rider → default');
assert(bikeFact('').includes('think about') || bikeFact('').includes('favourite bike'), 'empty bike → default');
assert(riderFact('Some Random Local Hero').includes('Solid pick'), 'unknown rider → fallback');
assert(bikeFact("Bob's shed special").includes("bike's got stories"), 'unknown bike → fallback');

// Short alias should not false-hit: bare "rea" should NOT match Jonathan Rea
assert(bestBlurb('rea', riders) === null, 'bare "rea" does not match');
assert(bestBlurb('max', riders) === null, 'bare "max" does not match Biaggi');
// Bare "gardner" stays Wayne; Remy needs first name
assert(bestBlurb('gardner', riders)?.id === 'gardner', 'bare "gardner" → Wayne Gardner');
assert(bestBlurb('remy gardner', riders)?.id === 'remy_gardner', '"remy gardner" → Remy');
assert(bestBlurb('remy', riders)?.id === 'remy_gardner', 'bare "remy" → Remy');
assert(bestBlurb('joe roberts', riders)?.id === 'joe_roberts', '"joe roberts" → Joe (not Kenny)');
assert(bestBlurb('roberts', riders)?.id === 'roberts', 'bare "roberts" → Kenny Roberts');
assert(bestBlurb('michael dunlop', riders)?.id === 'michael_dunlop', '"michael dunlop" → Michael');
assert(bestBlurb('joey dunlop', riders)?.id === 'joey_dunlop', '"joey dunlop" → Joey');

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log(`\nAll onboarding fact smoke checks passed (${riders.length} riders, ${bikes.length} bikes).`);
