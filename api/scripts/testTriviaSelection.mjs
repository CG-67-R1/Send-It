/**
 * Trivia selection checks: unique-by-text picking, 70/30 mix, option shuffle.
 *
 * Usage: node api/scripts/testTriviaSelection.mjs
 * Exit 0 on pass, 1 on fail.
 */
import {
  filterAvailableIndices,
  pickTriviaIndex,
  regionForTriviaOrder,
  shuffleTriviaOptions,
  uniqueQuestionKey,
} from '../triviaSelect.js';
import { AU_EXTRA_TRIVIA } from '../triviaAuExtra.js';
import { getTriviaQuestion } from '../qa.js';

let failed = 0;

function assert(label, cond) {
  if (cond) {
    console.log(`OK   ${label}`);
    return;
  }
  failed += 1;
  console.error(`FAIL ${label}`);
}

function regionMix() {
  const counts = { au: 0, global: 0 };
  for (let i = 0; i < 100; i++) {
    counts[regionForTriviaOrder(i)] += 1;
  }
  assert('70/30 mix over 100 questions is 70 AU / 30 world', counts.au === 70 && counts.global === 30);
  assert('first question is Australian', regionForTriviaOrder(0) === 'au');
}

function paraphraseKeys() {
  const a = uniqueQuestionKey('Pick the correct statement: How many venues were used for the first World Championship season in 1949?');
  const b = uniqueQuestionKey('How many venues were used for the first World Championship season in 1949?');
  const c = uniqueQuestionKey('About what number of times did riders lean per race (2013–2015)?');
  const d = uniqueQuestionKey('About how many times did riders lean per race (2013–2015)?');
  assert('strips pick-the-correct-statement prefix', a === b);
  assert('collapses about-what-number paraphrases', c === d);
}

function uniquePickSkipsDuplicates() {
  const bank = [
    { question: 'What does ASBK stand for?', difficulty_rating: 2 },
    { question: 'What does ASBK stand for?', difficulty_rating: 2 },
    { question: 'Where is Phillip Island?', difficulty_rating: 2 },
  ];
  const available = filterAvailableIndices(bank, [0], (item) => item.question);
  assert('used index also excludes duplicate text', available.length === 1 && available[0] === 2);
  const picked = pickTriviaIndex(bank, available, 2, () => 0);
  assert('next pick is the other unique question', picked === 2);
}

function difficultyWindowExpands() {
  const bank = [
    { question: 'Easy A', difficulty_rating: 2 },
    { question: 'Easy A copy', difficulty_rating: 2 },
    { question: 'Mid A', difficulty_rating: 5 },
    { question: 'Mid B', difficulty_rating: 5 },
    { question: 'Mid C', difficulty_rating: 5 },
    { question: 'Mid D', difficulty_rating: 5 },
  ];
  // uniqueQuestionKey of "Easy A" vs "Easy A copy" are different — make them the same:
  bank[1].question = 'Easy A';
  const available = [0, 1, 2, 3, 4, 5];
  const counts = { 2: 0, 5: 0 };
  for (let i = 0; i < 40; i++) {
    const idx = pickTriviaIndex(bank, available, 2);
    const rating = bank[idx].difficulty_rating;
    counts[rating] += 1;
  }
  assert('difficulty window includes nearby unique questions when exact band is tiny', counts[5] > 0);
}

function shuffleKeepsAnswer() {
  const { options, correctIndex } = shuffleTriviaOptions(
    ['right', 'wrong1', 'wrong2', 'joke'],
    0,
    () => 0.99
  );
  assert('shuffled options keep the correct text', options[correctIndex] === 'right');
}

function extraBankHasSpread() {
  const keys = new Set(AU_EXTRA_TRIVIA.map((item) => uniqueQuestionKey(item.question)));
  assert('AU extra bank has 80+ unique questions', keys.size >= 80);
  const easy = AU_EXTRA_TRIVIA.filter((item) => item.difficulty_rating <= 4).length;
  const hard = AU_EXTRA_TRIVIA.filter((item) => item.difficulty_rating >= 5).length;
  assert('AU extras cover easy and harder ratings', easy >= 20 && hard >= 20);
}

async function liveUniqueDraw() {
  const seen = new Set();
  const used = [];
  for (let i = 0; i < 12; i++) {
    const q = await getTriviaQuestion(used, { region: 'au', difficulty: 2 });
    if (q.error) {
      assert(`AU draw ${i + 1} returned a question`, false);
      return;
    }
    const key = uniqueQuestionKey(q.question);
    if (seen.has(key)) {
      assert('12 AU draws are unique question texts', false);
      return;
    }
    seen.add(key);
    used.push(q.triviaIndex);
  }
  assert('12 AU draws are unique question texts', seen.size === 12);
}

regionMix();
paraphraseKeys();
uniquePickSkipsDuplicates();
difficultyWindowExpands();
shuffleKeepsAnswer();
extraBankHasSpread();
await liveUniqueDraw();

if (failed) {
  console.error(`\n${failed} trivia selection check(s) failed`);
  process.exit(1);
}
console.log('\nAll trivia selection checks passed');
