/**
 * Check trivia wording before it can be shown to riders.
 *
 *   node scripts/validate-trivia-language.mjs
 *
 * Exits 1 when a hand-written question fails. The generated bank is reported
 * and is filtered again when the API loads it.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { triviaLanguageIssues } from '../api/triviaLanguage.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function check(label, question, answer, failures) {
  const issues = triviaLanguageIssues(question, answer);
  if (issues.length === 0) return;
  failures.push({ label, question, answer, issues });
}

const handFailures = [];
const { EASY_QA, HARD_QA } = await import('../api/triviaBankData.js');
for (const item of [...EASY_QA, ...HARD_QA]) check('seed', item.q, item.a, handFailures);

const { UK_TRIVIA } = await import('../api/triviaUk.js');
for (const item of UK_TRIVIA) check('uk', item.question, item.options?.[item.correct_index], handFailures);

const { AU_EXTRA_TRIVIA } = await import('../api/triviaAuExtra.js');
for (const item of AU_EXTRA_TRIVIA) check('au', item.question, item.options?.[item.correct_index], handFailures);

const bankPath = path.join(root, 'Q&A', 'trivia-bank.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const bankFailures = [];
for (const bucket of ['easy', 'hard']) {
  for (const item of bank[bucket] || []) {
    check(`bank ${item.id || bucket}`, item.q, item.correct, bankFailures);
  }
}

if (handFailures.length) {
  console.log(`Hand-written trivia: ${handFailures.length} failed`);
  for (const row of handFailures) {
    console.log(`- [${row.label}] ${row.question}`);
    console.log(`  ${row.issues.join('; ')}`);
  }
} else {
  console.log('Hand-written trivia: ok');
}

console.log(`Generated bank: ${bankFailures.length} items would be hidden`);
for (const row of bankFailures.slice(0, 12)) {
  console.log(`- ${row.question} — ${row.issues.join('; ')}`);
}
if (bankFailures.length > 12) console.log(`- … and ${bankFailures.length - 12} more`);

if (handFailures.length) process.exit(1);
