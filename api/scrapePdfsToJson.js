/**
 * Scrape each PDF in the Q&A folder and write one JSON file per PDF.
 * Output: <basename>.json with origin, title, content (full text in original format),
 * contentBlocks (paragraphs/sections preserving written structure), qa, and metadata.
 * Designed for the knowledge base: original written format kept, not just Q&A.
 *
 * Usage: node scrapePdfsToJson.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = path.resolve(__dirname, '..', 'Q&A');

/** Preserve original written format: split into blocks (paragraphs, headings). */
function toContentBlocks(text) {
  if (!text || !String(text).trim()) return [];
  const blocks = [];
  const paragraphs = String(text).split(/\n\n+/);
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const lines = trimmed.split(/\n/);
    const firstLine = lines[0] || '';
    const looksLikeHeading =
      lines.length <= 2 &&
      firstLine.length < 100 &&
      (/^[#\d.]+\s/.test(firstLine) || /^[A-Z][A-Z\s]+$/.test(firstLine) || firstLine.endsWith(':'));
    blocks.push({
      type: looksLikeHeading ? 'heading' : 'paragraph',
      text: trimmed,
    });
  }
  return blocks;
}

function extractQAPairs(text) {
  const pairs = [];
  const lines = (text || '').split(/\r?\n/);
  let currentQ = null;
  let currentA = null;

  const flush = () => {
    if (currentQ != null && currentA != null) {
      const q = currentQ.trim();
      const a = currentA.trim();
      if (q && a) pairs.push({ q, a });
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
      if (currentQ != null) currentA = a[1] || '';
    } else {
      if (currentQ != null && currentA == null && line.trim()) currentQ += '\n' + line;
      else if (currentA != null && line.trim()) currentA += '\n' + line;
    }
  }
  flush();
  return pairs;
}

async function run() {
  const files = await fs.readdir(QA_DIR).catch(() => []);
  const pdfs = files.filter((f) => path.extname(f).toLowerCase() === '.pdf');

  if (pdfs.length === 0) {
    console.log('No PDF files found in Q&A folder.');
    return;
  }

  console.log(`Found ${pdfs.length} PDF(s). Scraping and writing one JSON per file...\n`);

  for (const file of pdfs) {
    const filePath = path.join(QA_DIR, file);
    const basename = path.basename(file, '.pdf');
    const outPath = path.join(QA_DIR, `${basename}.json`);

    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      const rawText = data.text || '';
      const content = rawText.trim();
      const contentBlocks = toContentBlocks(content);
      const qa = extractQAPairs(content);
      const title = basename.replace(/[-_]/g, ' ');

      const payload = {
        origin: file,
        title,
        content,
        contentBlocks,
        qa,
        numpages: data.numpages ?? null,
        info: data.info ?? null,
        metadata: data.metadata ?? null,
        scrapedAt: new Date().toISOString(),
      };

      await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`  ${file} -> ${basename}.json (${data.numpages ?? '?'} pages, ${qa.length} Q/A pairs)`);
    } catch (err) {
      console.error(`  ${file}: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
