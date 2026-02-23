import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'Q&A');
const KNOWLEDGE_FILE = path.join(QA_DIR, 'knowledge.json');
const TRIVIA_BANK_FILE = path.join(QA_DIR, 'trivia-bank.json');
const CORE_JSON_FILES = new Set(['knowledge.json', 'README.md', 'trivia-bank.json']);

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

let cachedTriviaBank = null;
let triviaBankLoad = 0;

async function loadTriviaBank() {
  if (cachedTriviaBank && Date.now() - triviaBankLoad < CACHE_MS) return cachedTriviaBank;
  try {
    const raw = await fs.readFile(TRIVIA_BANK_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const easy = Array.isArray(data.easy) ? data.easy : [];
    const hard = Array.isArray(data.hard) ? data.hard : [];
    cachedTriviaBank = easy.concat(hard);
    triviaBankLoad = Date.now();
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Trivia bank load error:', e.message);
    cachedTriviaBank = [];
  }
  return cachedTriviaBank;
}

export async function getTriviaQuestion(usedIndices = []) {
  const bank = await loadTriviaBank();
  if (bank.length > 0) {
    const available = bank.map((_, i) => i).filter((i) => !usedIndices.includes(i));
    if (available.length === 0) return { error: 'No more questions.' };
    const triviaIndex = available[Math.floor(Math.random() * available.length)];
    const item = bank[triviaIndex];
    const options = item.options.map((o) => o.text);
    const correctOptionIndex = item.options.findIndex((o) => o.correct);
    return {
      question: item.q,
      options,
      correctIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
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
