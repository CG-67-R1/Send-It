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

/** Filename / title / corpus markers for Manual of Motorcycle Sport (MoMS) rule books. */
const MOMS_NAME_RE =
  /moms|mo[\s_-]?ms|manual[\s_-]?of[\s_-]?motorcycle[\s_-]?sport|motorcycle[\s_-]?sport[\s_-]?manual|gc[\s_-]?rs|rule[\s_-]?book|rulebook/i;

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
      const title = data.title || path.basename(file, '.json').replace(/[-_]/g, ' ');
      const corpus =
        typeof data.corpus === 'string'
          ? data.corpus
          : MOMS_NAME_RE.test(`${file} ${data.origin || ''} ${title}`)
            ? 'moms'
            : undefined;
      docs.push({
        id,
        origin: data.origin,
        title,
        content,
        contentBlocks: Array.isArray(data.contentBlocks) ? data.contentBlocks : undefined,
        corpus,
        edition: data.edition,
        effectiveDate: data.effectiveDate,
        referenceList: Array.isArray(data.referenceList) ? data.referenceList : undefined,
        updatePolicy: data.updatePolicy,
      });
      if (Array.isArray(data.qa)) {
        for (const p of data.qa) {
          if (p.q && p.a) {
            qa.push({
              id: p.id || undefined,
              origin: data.origin,
              q: p.q,
              a: p.a,
              corpus,
            });
          }
        }
      }
      // MoMS reference-only chapters → searchable pointers
      if (corpus === 'moms' && Array.isArray(data.referenceList)) {
        for (const ref of data.referenceList) {
          if (!ref || !ref.title) continue;
          qa.push({
            id: ref.chapter != null ? `moms-ref-ch${ref.chapter}` : undefined,
            origin: data.origin,
            corpus: 'moms',
            q: `Where are the ${ref.title} rules?`,
            a: `${ref.summary || ''} ${ref.where || ''}`.trim(),
          });
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

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'and', 'but', 'if', 'or', 'because', 'until', 'while', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'i', 'me', 'my',
  'myself', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his',
  'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their', 'theirs',
  'about', 'tell', 'explain', 'know',
]);

/**
 * MoMS-oriented spelling / synonym expansions for natural-language rule questions.
 * Keys and values are lowercased tokens (or multi-word phrases that tokenize further).
 */
const RULES_SYNONYMS = {
  license: ['licence', 'licences'],
  licenses: ['licence', 'licences'],
  licence: ['license', 'licences'],
  licences: ['licence', 'license'],
  helmet: ['helmets', 'protective'],
  helmets: ['helmet', 'protective'],
  gear: ['apparel', 'protective', 'clothing'],
  clothing: ['apparel', 'protective'],
  apparel: ['protective', 'clothing'],
  suit: ['leathers', 'protective'],
  leathers: ['suit', 'protective'],
  boots: ['footwear', 'protective'],
  gloves: ['protective'],
  plate: ['number', 'numberplate', 'identification'],
  plates: ['number', 'numberplate', 'identification'],
  numberplate: ['number', 'plate', 'identification'],
  inspection: ['examination', 'scrutineering'],
  scrutineering: ['examination', 'inspection'],
  exam: ['examination'],
  eligibility: ['eligible', 'entry'],
  eligible: ['eligibility'],
  historic: ['period', 'classic'],
  period: ['historic'],
  trackday: ['practice', 'road'],
  practice: ['track', 'session'],
  junior: ['minors', 'age'],
  age: ['junior', 'minors'],
  medical: ['fitness', 'certificate'],
  fitness: ['medical'],
};

function tokenize(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Expand query tokens with MoMS synonyms / alternate spellings (deduped, order preserved).
 * @param {string[]} tokens
 * @returns {string[]}
 */
export function expandQueryTokens(tokens) {
  const out = [];
  const seen = new Set();
  for (const t of tokens) {
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    const extras = RULES_SYNONYMS[t];
    if (!extras) continue;
    for (const phrase of extras) {
      for (const et of tokenize(phrase)) {
        if (!seen.has(et)) {
          seen.add(et);
          out.push(et);
        }
      }
    }
  }
  return out;
}

/**
 * Exact match = 1; prefix / shared-stem soft match (len ≥ 4) = 0.5; else 0.
 * @param {string} a
 * @param {string} b
 */
function tokenMatchWeight(a, b) {
  if (a === b) return 1;
  if (a.length < 4 || b.length < 4) return 0;
  if (a.startsWith(b) || b.startsWith(a)) return 0.5;
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i += 1;
  return i >= 4 ? 0.5 : 0;
}

/**
 * Best soft/exact weight of query token against any field token.
 * @param {string} queryToken
 * @param {string[]} fieldTokens
 */
function bestTokenWeight(queryToken, fieldTokens) {
  let best = 0;
  for (const ft of fieldTokens) {
    const w = tokenMatchWeight(queryToken, ft);
    if (w > best) best = w;
    if (best >= 1) break;
  }
  return best;
}

function excerpt(text, maxLen = 500) {
  const trimmed = (text || '').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Token-overlap score with exact (1) and soft stem/prefix (0.5) hits.
 * @param {string[]} tokens
 * @param {...string} fields
 */
function scoreText(tokens, ...fields) {
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const field of fields) {
    const fieldTokens = tokenize(field);
    if (fieldTokens.length === 0) continue;
    for (const t of tokens) {
      score += bestTokenWeight(t, fieldTokens);
    }
  }
  return score;
}

/**
 * Content tokens after stop-word strip + synonym expand (for thin-query detection).
 * @param {string} query
 * @returns {string[]}
 */
export function prepareRulesQueryTokens(query) {
  return expandQueryTokens(tokenize(query));
}

/**
 * True when the question has at most one content token before synonym expand.
 * @param {string} query
 */
export function isThinRulesQuery(query) {
  return tokenize(query).length <= 1;
}

/**
 * Adaptive minimum score for rules retrieval: short queries need only one solid hit.
 * Uses pre-expansion token count so synonyms do not raise the bar.
 * @param {string[]} rawTokens
 */
function rulesMinScore(rawTokens) {
  return rawTokens.length <= 2 ? 1 : 2;
}

/**
 * Retrieve top KB chunks for Ask-mode RAG (token overlap scoring).
 * @param {string} query
 * @param {number} [limit=5]
 * @returns {Promise<{ chunks: Array<{ title: string, content: string, origin?: string, score: number }>, fromKb: boolean }>}
 */
export async function retrieveForAsk(query, limit = 5) {
  const { documents, qa } = await loadKnowledge();
  const tokens = expandQueryTokens(tokenize(query));
  if (tokens.length === 0) return { chunks: [], fromKb: false };

  const scored = [];

  for (const doc of documents) {
    const title = doc.title || 'Document';
    const content = doc.content || '';
    const titleScore = scoreText(tokens, title) * 3;
    const contentScore = scoreText(tokens, content);
    const total = titleScore + contentScore;
    if (total > 0) {
      scored.push({
        title,
        content: excerpt(content),
        origin: doc.origin,
        score: total,
      });
    }
  }

  for (const pair of qa) {
    const title = pair.q || 'Q';
    const content = pair.a || '';
    const qScore = scoreText(tokens, pair.q || '') * 4;
    const aScore = scoreText(tokens, content);
    const total = qScore + aScore;
    if (total > 0) {
      scored.push({
        title,
        content: excerpt(content),
        origin: pair.origin,
        score: total,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const chunks = scored.slice(0, limit);
  const minScore = 2;
  const fromKb = chunks.length > 0 && chunks[0].score >= minScore;
  return { chunks: fromKb ? chunks : [], fromKb };
}

/**
 * @param {{ origin?: string, title?: string, corpus?: string, id?: string }} doc
 */
export function isMomsDocument(doc) {
  if (!doc) return false;
  if (String(doc.corpus || '').toLowerCase() === 'moms') return true;
  const hay = [doc.origin, doc.title, doc.id].filter(Boolean).join(' ');
  return MOMS_NAME_RE.test(hay);
}

/**
 * Load MoMS / official rules corpus only (PDF-derived JSON or knowledge docs tagged moms).
 * @returns {Promise<{ documents: Array, qa: Array, available: boolean }>}
 */
export async function loadMomsCorpus() {
  const { documents, qa } = await loadKnowledge();
  const momsDocs = documents.filter(isMomsDocument);
  const momsOrigins = new Set(momsDocs.map((d) => d.origin).filter(Boolean));
  const momsQa = qa.filter(
    (p) => isMomsDocument(p) || (p.origin && momsOrigins.has(p.origin))
  );
  return {
    documents: momsDocs,
    qa: momsQa,
    available: momsDocs.length > 0 || momsQa.length > 0,
  };
}

/**
 * Guess a rule-book location label from a heading / first line (e.g. "4.2.1 Licences").
 * @param {string} text
 */
function locationFromText(text) {
  const first = String(text || '')
    .split(/\n/)
    .map((l) => l.trim())
    .find(Boolean);
  if (!first) return 'MoMS';
  const clause = first.match(/^(\d+(?:\.\d+){0,4})\b/);
  if (clause) {
    const rest = first.slice(clause[0].length).replace(/^[\s.\-:–—]+/, '').trim();
    return rest ? `${clause[1]} ${rest}`.slice(0, 120) : clause[1];
  }
  return first.length > 100 ? `${first.slice(0, 97)}…` : first;
}

/**
 * Retrieve MoMS rule excerpts with section locations for Official rule check.
 * Scores contentBlocks (preferring section-sized chunks) so answers can cite where in the rules.
 * @param {string} query
 * @param {number} [limit=6]
 * @returns {Promise<{ chunks: Array<{ title: string, content: string, origin?: string, location?: string, score: number }>, fromKb: boolean, available: boolean }>}
 */
export async function retrieveForRules(query, limit = 6) {
  const { documents, qa, available } = await loadMomsCorpus();
  const rawTokens = tokenize(query);
  const tokens = expandQueryTokens(rawTokens);
  if (!available || tokens.length === 0) {
    return { chunks: [], fromKb: false, available };
  }

  const scored = [];

  for (const doc of documents) {
    const origin = doc.origin;
    const blocks = Array.isArray(doc.contentBlocks) && doc.contentBlocks.length
      ? doc.contentBlocks
      : null;

    if (blocks) {
      let currentHeading = doc.title || 'MoMS';
      for (const block of blocks) {
        const text = (block && block.text) || '';
        if (!text.trim()) continue;
        if (block.location) currentHeading = String(block.location);
        if (block.type === 'heading') {
          currentHeading = block.location || locationFromText(text);
          const hScore = scoreText(tokens, text) * 3 + scoreText(tokens, currentHeading);
          if (hScore > 0) {
            scored.push({
              title: currentHeading,
              location: currentHeading,
              content: excerpt(text, 700),
              origin,
              score: hScore,
            });
          }
          continue;
        }
        const loc = currentHeading;
        const total = scoreText(tokens, text) + scoreText(tokens, loc);
        if (total > 0) {
          scored.push({
            title: loc,
            location: loc,
            content: excerpt(text, 700),
            origin,
            score: total,
          });
        }
      }
    } else {
      const title = doc.title || 'MoMS';
      const content = doc.content || '';
      const total = scoreText(tokens, title) * 3 + scoreText(tokens, content);
      if (total > 0) {
        scored.push({
          title,
          location: title,
          content: excerpt(content, 700),
          origin,
          score: total,
        });
      }
    }
  }

  for (const pair of qa) {
    const location = locationFromText(pair.q || '') || 'MoMS Q&A';
    const total = scoreText(tokens, pair.q || '') * 4 + scoreText(tokens, pair.a || '');
    if (total > 0) {
      scored.push({
        title: pair.q || location,
        location,
        content: excerpt(pair.a || '', 700),
        origin: pair.origin,
        score: total,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  // Dedupe near-identical locations keeping the best score
  const seen = new Set();
  const unique = [];
  for (const c of scored) {
    const key = `${c.location || c.title}|${(c.content || '').slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
    if (unique.length >= limit) break;
  }

  const minScore = rulesMinScore(rawTokens);
  const fromKb = unique.length > 0 && unique[0].score >= minScore;
  return { chunks: fromKb ? unique : [], fromKb, available: true };
}

/** Exclude indices already used and variants that repeat the same question text (shuffled-option duplicates). */
function filterAvailableIndices(bank, usedIndices, getQuestionText) {
  const usedSet = new Set(usedIndices);
  const usedQuestionTexts = new Set(
    usedIndices
      .filter((i) => i >= 0 && i < bank.length)
      .map((i) => normalize(getQuestionText(bank[i])))
      .filter(Boolean)
  );

  return bank
    .map((_, i) => i)
    .filter((i) => {
      if (usedSet.has(i)) return false;
      const qText = normalize(getQuestionText(bank[i]));
      return !qText || !usedQuestionTexts.has(qText);
    });
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
    const available = filterAvailableIndices(bank, usedIndices, (item) => item.question || item.q || '');
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

  const available = filterAvailableIndices(qa, usedIndices, (item) => item.q || '');
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

  const choices = [correct.a, ...wrongs];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  const correctOptionIndex = choices.indexOf(correct.a);

  return {
    question: correct.q,
    options: choices,
    correctIndex: correctOptionIndex,
    triviaIndex: correctIndex,
  };
}

export async function getAllTriviaPairs() {
  const { qa } = await loadKnowledge();
  return qa;
}
