import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'Q&A');
const KNOWLEDGE_FILE = path.join(QA_DIR, 'knowledge.json');
const TRIVIA_BANK_FILE = path.join(QA_DIR, 'trivia-bank.json');
const QA_JSON_FILE = path.join(QA_DIR, 'Q&A.json');
const QA_RATED_FILE = path.join(QA_DIR, 'Q&A_with_ratings.json');
const AUS_QA_FILE = path.join(QA_DIR, 'AUS_Q&A.json');
const CORE_JSON_FILES = new Set([
  'knowledge.json',
  'README.md',
  'trivia-bank.json',
  'Q&A.json',
  'Q&A_with_ratings.json',
  'AUS_Q&A.json',
]);

let cachedDocs = [];
let cachedQa = [];
let lastLoad = 0;
const CACHE_MS = 60 * 1000;

/** Load PDF-derived JSON (origin + content/contentBlocks): one doc + qa merged. */
async function loadPdfJsonFiles() {
  const files = await fs.readdir(QA_DIR).catch(() => []);
  const docs = [];
  const qa = [];
  for (const file of files) {
    if (!file.endsWith('.json') || CORE_JSON_FILES.has(file)) continue;
    const filePath = path.join(QA_DIR, file);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) continue;
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.origin || (!data.content && !(Array.isArray(data.contentBlocks) && data.contentBlocks.length))) continue;
      const content = data.content || (Array.isArray(data.contentBlocks) ? data.contentBlocks.map((b) => b.text).join('\n\n') : '');
      const id = `doc:${path.basename(file, '.json')}`;
      docs.push({
        id,
        origin: data.origin,
        title: data.title || path.basename(file, '.json').replace(/[-_]/g, ' '),
        content,
        contentBlocks: Array.isArray(data.contentBlocks) ? data.contentBlocks : undefined,
      });
      if (Array.isArray(data.qa)) {
        for (const p of data.qa) {
          if (p.q && p.a) qa.push({ id: p.id || undefined, origin: data.origin, q: p.q, a: p.a });
        }
      }
    } catch (e) {
      // skip invalid or non-PDF JSON
    }
  }
  return { docs, qa };
}

async function loadKnowledge() {
  const now = Date.now();
  if (cachedQa.length > 0 && now - lastLoad < CACHE_MS) {
    return { documents: cachedDocs, qa: cachedQa };
  }
  cachedDocs = [];
  cachedQa = [];

  try {
    const raw = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (Array.isArray(data.documents)) cachedDocs = data.documents;
    if (Array.isArray(data.qa)) cachedQa = data.qa;
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('QA load error:', e.message);
  }

  const { docs: pdfDocs, qa: pdfQa } = await loadPdfJsonFiles();
  cachedDocs = cachedDocs.concat(pdfDocs);
  cachedQa = cachedQa.concat(pdfQa);

  lastLoad = now;
  return { documents: cachedDocs, qa: cachedQa };
}

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

export async function search(query) {
  const { documents, qa } = await loadKnowledge();
  const q = normalize(query);
  if (!q) return { results: [] };

  const results = [];

  for (const doc of documents) {
    const text = normalize((doc.title || '') + ' ' + (doc.content || ''));
    if (text.includes(q)) {
      const result = {
        title: doc.title || 'Document',
        content: doc.content || '',
        id: doc.id,
        origin: doc.origin,
      };
      if (Array.isArray(doc.contentBlocks) && doc.contentBlocks.length > 0) {
        result.contentBlocks = doc.contentBlocks;
      }
      results.push(result);
    }
  }

  for (const pair of qa) {
    const qText = normalize(pair.q || '');
    const aText = normalize(pair.a || '');
    if (qText.includes(q) || aText.includes(q)) {
      results.push({
        title: pair.q || 'Q',
        content: pair.a || '',
        id: pair.id,
        origin: pair.origin,
      });
    }
  }

  return { results };
}

let cachedGlobalTrivia = null;
let globalTriviaLoad = 0;
let cachedAusTrivia = null;
let ausTriviaLoad = 0;

/** Load Q&A_with_ratings.json: { "Q&A": { "easy": [...], "hard": [...] } } — used as primary global trivia source. */
async function loadGlobalRatedTrivia() {
  if (cachedGlobalTrivia && Date.now() - globalTriviaLoad < CACHE_MS) return cachedGlobalTrivia;
  try {
    const raw = await fs.readFile(QA_RATED_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const qa = data['Q&A'] || data;
    const easy = Array.isArray(qa.easy) ? qa.easy : [];
    const hard = Array.isArray(qa.hard) ? qa.hard : [];
    cachedGlobalTrivia = easy.concat(hard);
    globalTriviaLoad = Date.now();
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Q&A_with_ratings.json load error:', e.message);
    cachedGlobalTrivia = [];
  }
  return cachedGlobalTrivia;
}

/** Load AUS_Q&A.json: { "Q&A": { "easy": [...], "hard": [...] } } — Australian trivia source. */
async function loadAusRatedTrivia() {
  if (cachedAusTrivia && Date.now() - ausTriviaLoad < CACHE_MS) return cachedAusTrivia;
  try {
    const raw = await fs.readFile(AUS_QA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const qa = data['Q&A'] || data;
    const easy = Array.isArray(qa.easy) ? qa.easy : [];
    const hard = Array.isArray(qa.hard) ? qa.hard : [];
    cachedAusTrivia = easy.concat(hard);
    ausTriviaLoad = Date.now();
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('AUS_Q&A.json load error:', e.message);
    cachedAusTrivia = [];
  }
  return cachedAusTrivia;
}

export async function getTriviaQuestion(usedIndices = [], options = {}) {
  const region = options.region === 'au' ? 'au' : 'global';
  const difficulty =
    typeof options.difficulty === 'number' && !Number.isNaN(options.difficulty)
      ? options.difficulty
      : undefined;

  const bank = region === 'au' ? await loadAusRatedTrivia() : await loadGlobalRatedTrivia();
  if (bank.length > 0) {
    const available = bank.map((_, i) => i).filter((i) => !usedIndices.includes(i));
    if (available.length === 0) return { error: 'No more questions.' };

    let triviaIndex;
    if (typeof difficulty === 'number') {
      let bestDiff = Infinity;
      const bestIndices = [];
      for (const i of available) {
        const rawRating = bank[i].difficulty_rating;
        const rating =
          typeof rawRating === 'number'
            ? rawRating
            : rawRating != null
            ? parseFloat(String(rawRating))
            : NaN;
        const ratingValue = Number.isFinite(rating) ? rating : 2;
        const diff = Math.abs(ratingValue - difficulty);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndices.length = 0;
          bestIndices.push(i);
        } else if (diff === bestDiff) {
          bestIndices.push(i);
        }
      }
      const pool = bestIndices.length > 0 ? bestIndices : available;
      triviaIndex = pool[Math.floor(Math.random() * pool.length)];
    } else {
      triviaIndex = available[Math.floor(Math.random() * available.length)];
    }

    const item = bank[triviaIndex];
    const optionsArr = Array.isArray(item.options) ? item.options : [];
    const correctIndex =
      typeof item.correct_index === 'number' &&
      item.correct_index >= 0 &&
      item.correct_index < optionsArr.length
        ? item.correct_index
        : 0;

    return {
      question: item.question || item.q || '',
      options: optionsArr,
      correctIndex,
      triviaIndex,
    };
  }

  const { qa } = await loadKnowledge();
  if (qa.length < 4) {
    return { error: 'Not enough Q&A pairs for trivia (need at least 4). Run: node api/buildTriviaBank.js' };
  }

  const available = qa.map((_, i) => i).filter((i) => !usedIndices.includes(i));
  if (available.length === 0) return { error: 'No more questions.' };

  const correctIndex = available[Math.floor(Math.random() * available.length)];
  const correct = qa[correctIndex];

  const correctAnswer = (correct.a || '').trim();
  const wrongPool = [...new Set(
    qa
      .map((p, i) => (i === correctIndex ? null : (p.a || '').trim()))
      .filter((a) => a && a !== correctAnswer)
  )];
  const wrongs = [];
  while (wrongs.length < 3 && wrongPool.length > 0) {
    const i = Math.floor(Math.random() * wrongPool.length);
    const w = wrongPool[i];
    if (w && !wrongs.includes(w)) wrongs.push(w);
    wrongPool.splice(i, 1);
  }
  while (wrongs.length < 3) wrongs.push('(No other answer)');

  const options = [correct.a, ...wrongs];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctOptionIndex = options.indexOf(correct.a);

  return {
    question: correct.q,
    options,
    correctIndex: correctOptionIndex,
    triviaIndex: correctIndex,
  };
}

export async function getAllTriviaPairs() {
  const { qa } = await loadKnowledge();
  return qa;
}
