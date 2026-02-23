/**
 * Ingest script: scrape all documents from the Q&A folder into knowledge.json,
 * then delete the original files. Data in knowledge references its origin (filename).
 *
 * Usage: node ingestQA.js
 * - Reads Q&A/knowledge.json (if present) to preserve existing data.
 * - Scans Q&A for .md, .txt, and .pdf files (excluding knowledge.json, README.md).
 * - Parses each file: extracts Q/A pairs (Q: ... A: ...) and adds full text as a document.
 * - Appends to knowledge with new ids and origin = filename.
 * - Writes Q&A/knowledge.json, then deletes the ingested files.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'Q&A');
const KNOWLEDGE_FILE = path.join(QA_DIR, 'knowledge.json');

const DOC_EXTENSIONS = ['.md', '.txt', '.pdf'];
const IGNORE_FILES = new Set(['knowledge.json', 'README.md']);

function nextId(prefix, existing) {
  const nums = existing
    .map((item) => (item.id && item.id.startsWith(prefix + '-') ? parseInt(item.id.slice(prefix.length + 1), 10) : 0))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${max + 1}`;
}

/**
 * Extract Q/A pairs from text. Supports:
 * - "Q:" or "Question:" / "A:" or "Answer:"
 * - "Q." / "A."
 * - ## Q: ... / ## A: ...
 */
function extractQAPairs(text, origin) {
  const pairs = [];
  const lines = text.split(/\r?\n/);
  let currentQ = null;
  let currentA = null;

  const flush = () => {
    if (currentQ != null && currentA != null) {
      pairs.push({ q: currentQ.trim(), a: currentA.trim() });
    }
    currentQ = null;
    currentA = null;
  };

  const qMatch = /^\s*(?:##\s*)?(?:Q|Question)[:\.]\s*(.*)/i;
  const aMatch = /^\s*(?:##\s*)?(?:A|Answer)[:\.]\s*(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const q = line.match(qMatch);
    const a = line.match(aMatch);
    if (q) {
      flush();
      currentQ = q[1] || '';
      currentA = null;
    } else if (a) {
      if (currentQ != null) {
        currentA = a[1] || '';
      }
    } else {
      if (currentQ != null && currentA == null && line.trim()) {
        currentQ += '\n' + line;
      } else if (currentA != null && line.trim()) {
        currentA += '\n' + line;
      }
    }
  }
  flush();

  return pairs;
}

/**
 * One document per file (title from filename, content = full text). Search can hit any of it.
 */
function fileAsDocument(text, filename) {
  if (!text || !String(text).trim()) return null;
  const title = filename.replace(/\.(md|txt|pdf)$/i, '').replace(/[-_]/g, ' ');
  return { title, content: String(text).trim() };
}

/** Read file to text; for PDFs use pdf-parse to extract text. */
async function readFileAsText(filePath, ext) {
  if (ext === '.pdf') {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
  }
  return fs.readFile(filePath, 'utf-8');
}

async function loadExistingKnowledge() {
  try {
    const raw = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      documents: Array.isArray(data.documents) ? data.documents : [],
      qa: Array.isArray(data.qa) ? data.qa : [],
      _meta: data._meta || {},
    };
  } catch (e) {
    if (e.code === 'ENOENT') {
      return { documents: [], qa: [], _meta: {} };
    }
    throw e;
  }
}

async function run() {
  console.log('Ingesting Q&A folder into knowledge.json...\n');
  const knowledge = await loadExistingKnowledge();
  const toDelete = [];

  const files = await fs.readdir(QA_DIR).catch(() => []);
  for (const file of files) {
    if (IGNORE_FILES.has(file)) continue;
    const ext = path.extname(file).toLowerCase();
    if (!DOC_EXTENSIONS.includes(ext)) continue;

    const filePath = path.join(QA_DIR, file);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) continue;

    let text;
    try {
      text = await readFileAsText(filePath, ext);
    } catch (err) {
      console.error(`  Skip ${file}: ${err.message}`);
      continue;
    }
    const origin = file;

    const pairs = extractQAPairs(text, origin);
    for (const p of pairs) {
      if (p.q && p.a) {
        knowledge.qa.push({
          id: nextId('qa', knowledge.qa),
          origin,
          q: p.q,
          a: p.a,
        });
      }
    }

    const doc = fileAsDocument(text, file);
    if (doc) {
      knowledge.documents.push({
        id: nextId('doc', knowledge.documents),
        origin,
        title: doc.title,
        content: doc.content,
      });
    }

    toDelete.push(filePath);
    console.log(`  Ingested: ${file} -> ${doc ? 1 : 0} doc(s), ${pairs.length} Q/A pair(s)`);
  }

  knowledge._meta = {
    ...knowledge._meta,
    version: 2,
    description: 'Single source of truth for Q&A search and trivia. All entries have id and origin. Run \'node api/ingestQA.js\' to scrape Q&A folder and remove originals.',
    lastIngested: new Date().toISOString(),
  };

  await fs.writeFile(
    KNOWLEDGE_FILE,
    JSON.stringify(
      {
        _meta: knowledge._meta,
        documents: knowledge.documents,
        qa: knowledge.qa,
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log('\n  Written: Q&A/knowledge.json');

  for (const filePath of toDelete) {
    await fs.unlink(filePath);
    console.log(`  Removed: ${path.relative(QA_DIR, filePath)}`);
  }

  if (toDelete.length === 0) {
    console.log('  No .md, .txt, or .pdf files to ingest (only knowledge.json present).');
  }

  console.log('\nDone. Documents:', knowledge.documents.length, '| Q/A pairs:', knowledge.qa.length);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
