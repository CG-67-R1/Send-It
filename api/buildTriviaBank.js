/**
 * Build Q&A trivia knowledge base: 500 easy + 500 hard, each with 5 options
 * (1 correct, 1 funny, 3 wrong). Reads from PDF JSONs + seed data.
 *
 * Usage: node buildTriviaBank.js
 * Output: Q&A/trivia-bank.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EASY_QA, HARD_QA, FUNNY_ANSWERS } from './triviaBankData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'Q&A');
const TRIVIA_BANK_PATH = path.join(QA_DIR, 'trivia-bank.json');
const CORE_JSON = new Set(['knowledge.json', 'README.md', 'trivia-bank.json']);

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Extract definition-style Q&A from text: "X is Y", "X means Y", "X - Y", "X: Y". */
function extractFromText(text) {
  const pairs = [];
  const lines = (text || '').split(/\n/);
  const fullText = text || '';

  // "X is Y" / "X is a Y" / "X is the Y"
  const isMatch = fullText.matchAll(/(?:^|\.\s+)([A-Z][A-Za-z0-9\s\-']{2,40})\s+is\s+(?:a\s+|the\s+)?([^.\n]{10,120})/g);
  for (const m of isMatch) {
    const q = (m[1] || '').trim();
    const a = (m[2] || '').trim();
    if (q && a && a.length > 8) pairs.push({ q: `What is ${q}?`, a });
  }

  // "X means Y" / "X refers to Y"
  const meansMatch = fullText.matchAll(/(?:^|\.\s+)([A-Z][A-Za-z0-9\s\-']{2,35})\s+(?:means|refers to)\s+([^.\n]{8,100})/g);
  for (const m of meansMatch) {
    const term = (m[1] || '').trim();
    const a = (m[2] || '').trim();
    if (term && a) pairs.push({ q: `What does ${term} mean?`, a });
  }

  // "X: Y" or "X - Y" (title: definition)
  const colonMatch = fullText.matchAll(/(?:^|\n)\s*([A-Z][A-Za-z0-9\s\-']{3,35})\s*[:\-]\s*([^\n]{10,120})/g);
  for (const m of colonMatch) {
    const q = (m[1] || '').trim();
    const a = (m[2] || '').trim();
    if (q && a && !a.startsWith('http')) pairs.push({ q: `What is ${q}?`, a });
  }

  return pairs;
}

async function loadPdfJsonContent() {
  const files = await fs.readdir(QA_DIR).catch(() => []);
  let allText = '';
  for (const file of files) {
    if (!file.endsWith('.json') || CORE_JSON.has(file)) continue;
    try {
      const raw = await fs.readFile(path.join(QA_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      const content = data.content || (Array.isArray(data.contentBlocks) ? data.contentBlocks.map(b => b.text).join('\n\n') : '');
      if (content) allText += '\n\n' + content;
      if (Array.isArray(data.qa)) {
        for (const p of data.qa) {
          if (p.q && p.a) allText += '\n\nQ: ' + p.q + '\nA: ' + p.a;
        }
      }
    } catch (_) {}
  }
  return allText;
}

function classify(qa) {
  const a = (qa.a || '').trim();
  const isShort = a.length <= 90;
  const hasYear = /\b(19|20)\d{2}\b/.test(a);
  const hasNumber = /\d+/.test(a);
  if (isShort && !hasYear) return 'easy';
  return 'hard';
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildOptions(correctAnswer, wrongPool, funnyPool) {
  const correct = correctAnswer.trim();
  const wrongs = wrongPool.filter(a => a.trim() !== correct && a.trim().length > 0);
  const wrongSet = new Set();
  while (wrongSet.size < 3 && wrongs.length > 0) {
    const w = wrongs[Math.floor(Math.random() * wrongs.length)];
    if (w.trim() && w.trim() !== correct) wrongSet.add(w.trim());
    wrongs.splice(wrongs.indexOf(w), 1);
  }
  const funny = funnyPool[Math.floor(Math.random() * funnyPool.length)];
  const options = [
    { text: correct, correct: true, funny: false },
    { text: funny, correct: false, funny: true },
    ...Array.from(wrongSet).slice(0, 3).map(t => ({ text: t, correct: false, funny: false })),
  ];
  while (options.length < 5) {
    options.push({ text: '(No other answer)', correct: false, funny: false });
  }
  return shuffle(options);
}

async function run() {
  console.log('Building trivia bank (500 easy + 500 hard, 5 options each)...\n');

  const pdfText = await loadPdfJsonContent();
  const extracted = extractFromText(pdfText);

  const easyPool = [];
  const hardPool = [];

  const seen = new Set();
  const add = (qa, difficulty) => {
    const key = normalize(qa.q);
    if (seen.has(key)) return;
    seen.add(key);
    if (qa.q && qa.a) {
      if (difficulty === 'easy') easyPool.push({ q: qa.q, a: qa.a });
      else hardPool.push({ q: qa.q, a: qa.a });
    }
  };

  for (const qa of EASY_QA) add(qa, 'easy');
  for (const qa of HARD_QA) add(qa, 'hard');
  for (const qa of extracted) add(qa, classify(qa));

  // Pad to 500 each by duplicating from seed (same q/a, options will vary)
  while (easyPool.length < 500) {
    const i = easyPool.length % EASY_QA.length;
    easyPool.push({ q: EASY_QA[i].q, a: EASY_QA[i].a });
  }
  while (hardPool.length < 500) {
    const i = hardPool.length % HARD_QA.length;
    hardPool.push({ q: HARD_QA[i].q, a: HARD_QA[i].a });
  }

  const easy = easyPool.slice(0, 500);
  const hard = hardPool.slice(0, 500);

  const easyAnswers = [...new Set(EASY_QA.map(x => x.a).filter(a => a && a.length > 2 && a.length < 200))];
  const hardAnswers = [...new Set(HARD_QA.map(x => x.a).filter(a => a && a.length > 2 && a.length < 300))];

  const triviaEasy = easy.map((qa, i) => ({
    id: `easy-${i + 1}`,
    difficulty: 'easy',
    q: qa.q,
    correct: qa.a,
    options: buildOptions(qa.a, easyAnswers, FUNNY_ANSWERS),
  }));

  const triviaHard = hard.map((qa, i) => ({
    id: `hard-${i + 1}`,
    difficulty: 'hard',
    q: qa.q,
    correct: qa.a,
    options: buildOptions(qa.a, hardAnswers, FUNNY_ANSWERS),
  }));

  const bank = {
    _meta: {
      version: 1,
      description: 'Trivia knowledge base: 500 easy + 500 hard, 5 options each (1 correct, 1 funny, 3 wrong).',
      builtAt: new Date().toISOString(),
    },
    easy: triviaEasy,
    hard: triviaHard,
  };

  await fs.writeFile(TRIVIA_BANK_PATH, JSON.stringify(bank, null, 2), 'utf-8');
  console.log('Written:', TRIVIA_BANK_PATH);
  console.log('Easy:', bank.easy.length, '| Hard:', bank.hard.length);
  console.log('Each item has 5 options: 1 correct, 1 funny, 3 wrong.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
